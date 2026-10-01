const { query } = require('../config/db');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityService');

async function getAllTasks(req, res, next) {
  try {
    const { project_id, status, priority, assigned_to, search, sort, page, limit } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let baseFilter = `WHERE 1=1`;
    const params = [];

    // Role filtering - BUG 10: TEAM MEMBER can ONLY see tasks assigned to them
    if (userRole === 'TEAM_MEMBER') {
      params.push(userId);
      baseFilter += ` AND t.assigned_to = $${params.length}`;
    } else if (userRole === 'PROJECT_MANAGER') {
      params.push(userId);
      baseFilter += ` AND (p.manager_id = $${params.length} OR p.created_by = $${params.length} OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $${params.length}))`;
    }

    if (project_id) {
      params.push(project_id);
      baseFilter += ` AND t.project_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      baseFilter += ` AND t.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      baseFilter += ` AND t.priority = $${params.length}`;
    }

    if (assigned_to) {
      params.push(assigned_to);
      baseFilter += ` AND t.assigned_to = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      baseFilter += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length} OR u_assignee.name ILIKE $${params.length})`;
    }

    // Sorting
    let orderClause = 'ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.created_at DESC';
    if (sort === 'deadline' || sort === 'deadline_asc') {
      orderClause = 'ORDER BY t.deadline ASC NULLS LAST';
    } else if (sort === 'deadline_desc') {
      orderClause = 'ORDER BY t.deadline DESC NULLS LAST';
    } else if (sort === 'oldest') {
      orderClause = 'ORDER BY t.created_at ASC';
    } else if (sort === 'newest') {
      orderClause = 'ORDER BY t.created_at DESC';
    } else if (sort === 'priority') {
      orderClause = `ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END ASC`;
    }

    const selectFields = `
      SELECT 
        t.id, 
        t.project_id, 
        p.name AS project_name,
        t.title, 
        t.description, 
        t.assigned_to,
        u_assignee.name AS assignee_name,
        u_assignee.email AS assignee_email,
        COALESCE(u_assignee.is_active, true) AS assignee_is_active,
        t.created_by,
        CASE 
          WHEN u_creator.role = 'ADMIN' AND '${userRole}' != 'ADMIN' THEN 'Project Lead'
          ELSE u_creator.name 
        END AS creator_name,
        t.priority, 
        t.status, 
        t.deadline, 
        t.created_at, 
        t.updated_at
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      ${baseFilter}
      ${orderClause}
    `;

    // Pagination support
    if (page !== undefined) {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const limitNum = Math.max(1, parseInt(limit || '10', 10));
      const offset = (pageNum - 1) * limitNum;

      const countSql = `
        SELECT COUNT(DISTINCT t.id) AS total_count
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
        ${baseFilter}
      `;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total_count || '0', 10);
      const totalPages = Math.ceil(total / limitNum) || 1;

      const pagedSql = `${selectFields} LIMIT ${limitNum} OFFSET ${offset}`;
      const result = await query(pagedSql, params);

      return res.status(200).json({
        success: true,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        count: result.rowCount,
        tasks: result.rows,
      });
    }

    const result = await query(selectFields, params);
    return res.status(200).json({
      success: true,
      total: result.rowCount,
      page: 1,
      limit: result.rowCount,
      totalPages: 1,
      count: result.rowCount,
      tasks: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function getTaskById(req, res, next) {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    const taskResult = await query(
      `SELECT 
        t.id, 
        t.project_id, 
        p.name AS project_name,
        p.manager_id AS project_manager_id,
        t.title, 
        t.description, 
        t.assigned_to,
        u_assignee.name AS assignee_name,
        u_assignee.email AS assignee_email,
        COALESCE(u_assignee.is_active, true) AS assignee_is_active,
        t.created_by,
        CASE 
          WHEN u_creator.role = 'ADMIN' AND $2 != 'ADMIN' THEN 'Project Lead'
          ELSE u_creator.name 
        END AS creator_name,
        t.priority, 
        t.status, 
        t.deadline, 
        t.created_at, 
        t.updated_at
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      WHERE t.id = $1`,
      [id, userRole]
    );

    if (taskResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    const task = taskResult.rows[0];

    // Authorization check - BUG 10: Team Member can ONLY view their assigned task!
    if (userRole === 'TEAM_MEMBER') {
      if (task.assigned_to !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this task.',
        });
      }
    }

    // Comments for task (Phase 3 readiness)
    const commentsResult = await query(
      `SELECT c.id, c.comment, c.created_at, 
        CASE WHEN u.role = 'ADMIN' AND $2 != 'ADMIN' THEN NULL ELSE u.id END AS user_id,
        CASE WHEN u.role = 'ADMIN' AND $2 != 'ADMIN' THEN 'Project Lead' ELSE u.name END AS user_name,
        CASE WHEN u.role = 'ADMIN' AND $2 != 'ADMIN' THEN 'PROJECT_MANAGER' ELSE u.role END AS user_role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [id, userRole]
    );

    return res.status(200).json({
      success: true,
      task: {
        ...task,
        comments: commentsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const { project_id, title, description, assigned_to, priority, status, deadline } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Team members cannot create tasks
    if (userRole === 'TEAM_MEMBER') {
      return res.status(403).json({
        success: false,
        message: 'Team Members do not have permission to create tasks.',
      });
    }

    // Verify project existence and permissions
    const projectCheck = await query(
      'SELECT id, name, manager_id, created_by FROM projects WHERE id = $1',
      [project_id]
    );
    if (projectCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Associated project does not exist.',
      });
    }

    const project = projectCheck.rows[0];

    // If PM: verify PM is the manager, creator, or member
    if (userRole === 'PROJECT_MANAGER') {
      const isOwner = project.manager_id === userId || project.created_by === userId;
      if (!isOwner) {
        const isMem = await query(
          'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
          [project_id, userId]
        );
        if (isMem.rowCount === 0) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to create tasks in this project.',
          });
        }
      }
    }

    // CRITICAL (Bug 7 & Phase 3): Validate assignee - must be an active TEAM_MEMBER of the selected project
    if (assigned_to) {
      const assigneeCheck = await query('SELECT id, name, role, is_active FROM users WHERE id = $1', [assigned_to]);
      if (assigneeCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected assignee user does not exist.',
        });
      }
      if (assigneeCheck.rows[0].is_active === false) {
        return res.status(400).json({
          success: false,
          message: 'Inactive users cannot be assigned to new tasks. Cannot assign task to a deactivated user.',
        });
      }
      if (assigneeCheck.rows[0].role !== 'TEAM_MEMBER') {
        return res.status(400).json({
          success: false,
          message: 'Only Team Members can be assigned to tasks. Admin and Project Manager users cannot be assigned.',
        });
      }

      // Assignee must belong to the selected project
      const memberCheck = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [project_id, assigned_to]
      );
      if (memberCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Assignee must be a member of the selected project.',
        });
      }
    }

    // BUG 8: Validate deadline >= today / creation date
    if (deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dl = new Date(deadline);
      dl.setHours(23, 59, 59, 999);
      if (dl < today) {
        return res.status(400).json({
          success: false,
          message: 'Task deadline cannot be earlier than the task creation date.',
        });
      }
    }

    const result = await query(
      `INSERT INTO tasks (project_id, title, description, assigned_to, created_by, priority, status, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        project_id,
        title,
        description || null,
        assigned_to || null,
        userId,
        priority || 'MEDIUM',
        status || 'TODO',
        deadline || null,
      ]
    );

    const task = result.rows[0];

    // Activity log: Task created
    await query(
      `INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
       VALUES ($1, $2, $3, 'TASK_CREATED', $4)`,
      [userId, project_id, task.id, `Created task: "${title}".`]
    );

    // Activity log: Task assigned if applicable
    if (assigned_to) {
      await query(
        `INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
         VALUES ($1, $2, $3, 'TASK_ASSIGNED', $4)`,
        [userId, project_id, task.id, `Assigned task "${title}".`]
      );

      // Notification
      await query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'TASK')`,
        [
          assigned_to,
          'New Task Assigned',
          `You have been assigned to task "${title}" in project "${project.name}".`,
        ]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task,
    });
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, priority, status, deadline } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    const taskCheck = await query(
      `SELECT t.*, p.manager_id, p.created_by AS project_creator 
       FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1`,
      [id]
    );
    if (taskCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    const currentTask = taskCheck.rows[0];

    // Role authorization
    if (userRole === 'TEAM_MEMBER') {
      // Team members cannot reassign tasks to others
      if (assigned_to !== undefined && assigned_to !== currentTask.assigned_to) {
        return res.status(403).json({
          success: false,
          message: 'Team Members do not have permission to assign or reassign tasks.',
        });
      }
      // Must be assigned to this task or on project
      if (currentTask.assigned_to !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to edit this task.',
        });
      }
    } else if (userRole === 'PROJECT_MANAGER') {
      const isOwner = currentTask.manager_id === userId || currentTask.project_creator === userId || currentTask.created_by === userId;
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify tasks outside your projects.',
        });
      }
    }

    // Validate new assignee if passed (BUG 7 & Phase 3: must be an active TEAM_MEMBER of the project)
    if (assigned_to !== undefined && assigned_to !== null && assigned_to !== currentTask.assigned_to) {
      const assigneeCheck = await query('SELECT id, name, role, is_active FROM users WHERE id = $1', [assigned_to]);
      if (assigneeCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected assignee user does not exist.',
        });
      }
      if (assigneeCheck.rows[0].is_active === false) {
        return res.status(400).json({
          success: false,
          message: 'Inactive users cannot be assigned to new tasks. Cannot assign task to a deactivated user.',
        });
      }
      if (assigneeCheck.rows[0].role !== 'TEAM_MEMBER') {
        return res.status(400).json({
          success: false,
          message: 'Only Team Members can be assigned to tasks. Admin and Project Manager users cannot be assigned.',
        });
      }

      // Must be a member of the project
      const memberCheck = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [currentTask.project_id, assigned_to]
      );
      if (memberCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Assignee must be a member of the selected project.',
        });
      }
    }

    // BUG 8: Validate deadline on update (cannot be before creation date or today)
    if (deadline) {
      const baseDate = currentTask.created_at ? new Date(currentTask.created_at) : new Date();
      baseDate.setHours(0, 0, 0, 0);
      const dl = new Date(deadline);
      dl.setHours(23, 59, 59, 999);
      if (dl < baseDate) {
        return res.status(400).json({
          success: false,
          message: 'Task deadline cannot be earlier than the task creation date.',
        });
      }
    }

    const result = await query(
      `UPDATE tasks
       SET 
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         assigned_to = CASE WHEN $3::text IS NOT NULL THEN $3::uuid ELSE assigned_to END,
         priority = COALESCE($4, priority),
         status = COALESCE($5, status),
         deadline = CASE WHEN $6::text IS NOT NULL THEN $6::date ELSE deadline END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, description, assigned_to, priority, status, deadline, id]
    );

    // Activity log: Task updated
    await query(
      `INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
       VALUES ($1, $2, $3, 'TASK_UPDATED', $4)`,
      [userId, currentTask.project_id, id, `Task "${result.rows[0].title}" was updated.`]
    );

    // If status changed
    if (status && status !== currentTask.status) {
      await query(
        `INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
         VALUES ($1, $2, $3, 'TASK_STATUS_CHANGED', $4)`,
        [userId, currentTask.project_id, id, `Status of "${result.rows[0].title}" changed from ${currentTask.status} to ${status}.`]
      );
    }

    // If priority changed
    if (priority && priority !== currentTask.priority) {
      await query(
        `INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
         VALUES ($1, $2, $3, 'TASK_PRIORITY_CHANGED', $4)`,
        [userId, currentTask.project_id, id, `Priority of "${result.rows[0].title}" changed from ${currentTask.priority} to ${priority}.`]
      );
    }

    // If deadline changed
    if (deadline && String(deadline) !== String(currentTask.deadline)) {
      await query(
        `INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
         VALUES ($1, $2, $3, 'TASK_DEADLINE_CHANGED', $4)`,
        [userId, currentTask.project_id, id, `Deadline of "${result.rows[0].title}" was updated.`]
      );
    }

    // If assignee changed, log assignment and send notification
    if (assigned_to && assigned_to !== currentTask.assigned_to) {
      await query(
        `INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
         VALUES ($1, $2, $3, 'TASK_ASSIGNED', $4)`,
        [userId, currentTask.project_id, id, `Task "${result.rows[0].title}" was reassigned.`]
      );

      await createNotification({
        userId: assigned_to,
        title: 'Task Assigned',
        message: `You were assigned to deliverable "${result.rows[0].title}".`,
        type: 'TASK',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      task: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    const taskCheck = await query(
      `SELECT t.*, p.manager_id, p.created_by AS project_creator 
       FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1`,
      [id]
    );

    if (taskCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    const task = taskCheck.rows[0];

    // Authorization: Team member can update if assigned to task OR belongs to project
    if (userRole === 'TEAM_MEMBER') {
      if (task.assigned_to !== userId) {
        const memCheck = await query(
          'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
          [task.project_id, userId]
        );
        if (memCheck.rowCount === 0) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to update this task status.',
          });
        }
      }
    } else if (userRole === 'PROJECT_MANAGER') {
      const isOwner = task.manager_id === userId || task.project_creator === userId;
      if (!isOwner) {
        const memCheck = await query(
          'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
          [task.project_id, userId]
        );
        if (memCheck.rowCount === 0) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to update tasks outside your projects.',
          });
        }
      }
    }

    const result = await query(
      `UPDATE tasks
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // Activity log: Task status changed
    await query(
      `INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
       VALUES ($1, $2, $3, 'TASK_STATUS_CHANGED', $4)`,
      [
        userId,
        task.project_id,
        task.id,
        `Task "${task.title}" status changed from ${task.status} to ${status}.`,
      ]
    );

    // Notifications for status change
    if (task.assigned_to && task.assigned_to !== userId) {
      await createNotification({
        userId: task.assigned_to,
        title: `Task Status Changed: "${task.title}"`,
        message: `Status was updated to ${status} by ${req.user.name}.`,
        type: 'TASK',
      });
    }
    if (task.assigned_to === userId && task.manager_id && task.manager_id !== userId) {
      await createNotification({
        userId: task.manager_id,
        title: `Task Status Changed: "${task.title}"`,
        message: `${req.user.name} moved deliverable "${task.title}" to ${status}.`,
        type: 'TASK',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task status updated successfully.',
      task: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'TEAM_MEMBER') {
      return res.status(403).json({
        success: false,
        message: 'Team Members do not have permission to delete tasks.',
      });
    }

    const taskCheck = await query(
      `SELECT t.*, p.manager_id, p.created_by AS project_creator 
       FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1`,
      [id]
    );
    if (taskCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    const task = taskCheck.rows[0];

    if (userRole === 'PROJECT_MANAGER' && task.manager_id !== userId && task.project_creator !== userId && task.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete tasks in this project.',
      });
    }

    await query('DELETE FROM tasks WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
