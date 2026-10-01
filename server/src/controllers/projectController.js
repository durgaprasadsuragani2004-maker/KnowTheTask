const { query, getPool } = require('../config/db');
const { createNotification } = require('../services/notificationService');

async function getAllProjects(req, res, next) {
  try {
    const { status, search, manager_id, sort, page, limit } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let baseFilter = `WHERE 1=1`;
    const params = [];

    // Role-based visibility
    if (userRole === 'TEAM_MEMBER') {
      params.push(userId);
      baseFilter += ` AND p.id IN (SELECT project_id FROM project_members WHERE user_id = $${params.length})`;
    } else if (userRole === 'PROJECT_MANAGER') {
      params.push(userId);
      baseFilter += ` AND (p.manager_id = $${params.length} OR p.created_by = $${params.length} OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $${params.length}))`;
    }

    if (status) {
      params.push(status);
      baseFilter += ` AND p.status = $${params.length}`;
    }

    if (manager_id) {
      params.push(manager_id);
      baseFilter += ` AND p.manager_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      baseFilter += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR u_mgr.name ILIKE $${params.length})`;
    }

    // Sorting
    let orderClause = 'ORDER BY p.created_at DESC';
    if (sort === 'oldest') {
      orderClause = 'ORDER BY p.created_at ASC';
    } else if (sort === 'name') {
      orderClause = 'ORDER BY p.name ASC';
    } else if (sort === 'deadline') {
      orderClause = 'ORDER BY p.deadline ASC NULLS LAST';
    }

    const selectFields = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.start_date, 
        p.deadline, 
        p.status, 
        p.manager_id,
        u_mgr.name AS manager_name,
        COALESCE(u_mgr.is_active, true) AS manager_is_active,
        CASE WHEN '${userRole}' = 'TEAM_MEMBER' THEN NULL ELSE u_mgr.email END AS manager_email,
        p.created_by,
        CASE 
          WHEN u_cr.role = 'ADMIN' AND '${userRole}' != 'ADMIN' THEN 'System Administrator'
          ELSE u_cr.name 
        END AS creator_name,
        p.created_at, 
        p.updated_at,
        COUNT(DISTINCT CASE 
          WHEN '${userRole}' = 'ADMIN' THEN pm.user_id 
          WHEN '${userRole}' = 'PROJECT_MANAGER' THEN CASE WHEN u_pm.role != 'ADMIN' THEN pm.user_id END
          ELSE CASE WHEN u_pm.role = 'TEAM_MEMBER' THEN pm.user_id END
        END) AS member_count,
        COUNT(DISTINCT t.id) AS total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END) AS completed_tasks
      FROM projects p
      LEFT JOIN users u_mgr ON p.manager_id = u_mgr.id
      LEFT JOIN users u_cr ON p.created_by = u_cr.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN users u_pm ON pm.user_id = u_pm.id
      LEFT JOIN tasks t ON p.id = t.project_id
      ${baseFilter}
      GROUP BY p.id, u_mgr.name, u_mgr.email, u_mgr.is_active, u_cr.name, u_cr.role
      ${orderClause}
    `;

    // Pagination support
    if (page !== undefined) {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const limitNum = Math.max(1, parseInt(limit || '10', 10));
      const offset = (pageNum - 1) * limitNum;

      const countSql = `
        SELECT COUNT(DISTINCT p.id) AS total_count
        FROM projects p
        LEFT JOIN users u_mgr ON p.manager_id = u_mgr.id
        ${baseFilter}
      `;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total_count || '0', 10);
      const totalPages = Math.ceil(total / limitNum) || 1;

      const pagedSql = `${selectFields} LIMIT ${limitNum} OFFSET ${offset}`;
      const result = await query(pagedSql, params);

      const projects = result.rows.map((p) => {
        const tot = parseInt(p.total_tasks || '0', 10);
        const comp = parseInt(p.completed_tasks || '0', 10);
        const progress = tot > 0 ? Math.round((comp / tot) * 100) : 0;
        return {
          ...p,
          total_tasks: tot,
          completed_tasks: comp,
          member_count: parseInt(p.member_count || '0', 10),
          progress,
        };
      });

      return res.status(200).json({
        success: true,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        count: projects.length,
        projects,
      });
    }

    const result = await query(selectFields, params);
    const projects = result.rows.map((p) => {
      const tot = parseInt(p.total_tasks || '0', 10);
      const comp = parseInt(p.completed_tasks || '0', 10);
      const progress = tot > 0 ? Math.round((comp / tot) * 100) : 0;
      return {
        ...p,
        total_tasks: tot,
        completed_tasks: comp,
        member_count: parseInt(p.member_count || '0', 10),
        progress,
      };
    });

    return res.status(200).json({
      success: true,
      total: projects.length,
      page: 1,
      limit: projects.length,
      totalPages: 1,
      count: projects.length,
      projects,
    });
  } catch (error) {
    next(error);
  }
}

async function getProjectById(req, res, next) {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Check project exists
    const projectCheck = await query(
      `SELECT p.*, 
        u_mgr.name AS manager_name, 
        COALESCE(u_mgr.is_active, true) AS manager_is_active,
        CASE WHEN $2 = 'TEAM_MEMBER' THEN NULL ELSE u_mgr.email END AS manager_email,
        CASE 
          WHEN u_cr.role = 'ADMIN' AND $2 != 'ADMIN' THEN 'System Administrator'
          ELSE u_cr.name 
        END AS creator_name
       FROM projects p
       LEFT JOIN users u_mgr ON p.manager_id = u_mgr.id
       LEFT JOIN users u_cr ON p.created_by = u_cr.id
       WHERE p.id = $1`,
      [id, userRole]
    );

    if (projectCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const project = projectCheck.rows[0];

    // Authorization check
    if (userRole === 'TEAM_MEMBER') {
      const membership = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [id, userId]
      );
      if (membership.rowCount === 0) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this project.',
        });
      }
    } else if (userRole === 'PROJECT_MANAGER') {
      const isAllowed =
        project.manager_id === userId ||
        project.created_by === userId;
      if (!isAllowed) {
        const membership = await query(
          'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
          [id, userId]
        );
        if (membership.rowCount === 0) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this project.',
          });
        }
      }
    }

    // Fetch members - Filter out ADMIN for non-admins, and filter out PM for Team Members
    let membersSql = `
      SELECT u.id, u.name, u.email, u.role, u.is_active, pm.assigned_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `;
    if (userRole === 'TEAM_MEMBER') {
      membersSql += ` AND u.role = 'TEAM_MEMBER'`;
    } else if (userRole !== 'ADMIN') {
      membersSql += ` AND u.role != 'ADMIN'`;
    }
    membersSql += ` ORDER BY u.name ASC`;

    const membersResult = await query(membersSql, [id]);

    // Fetch tasks - BUG 10: Team Members ONLY see their assigned tasks
    let tasksSql = `
      SELECT 
        t.id, 
        t.title, 
        t.description, 
        t.priority, 
        t.status, 
        t.deadline, 
        t.assigned_to,
        u.name AS assignee_name,
        u.email AS assignee_email,
        COALESCE(u.is_active, true) AS assignee_is_active,
        t.created_at,
        t.updated_at
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.project_id = $1
    `;
    const taskParams = [id];
    if (userRole === 'TEAM_MEMBER') {
      taskParams.push(userId);
      tasksSql += ` AND t.assigned_to = $${taskParams.length}`;
    }
    tasksSql += ` ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.created_at DESC`;

    const tasksResult = await query(tasksSql, taskParams);

    // Compute progress based on project total tasks
    const allTasksCountRes = await query('SELECT COUNT(*) as count, COUNT(CASE WHEN status = \'COMPLETED\' THEN 1 END) as completed FROM tasks WHERE project_id = $1', [id]);
    const total = parseInt(allTasksCountRes.rows[0]?.count || '0', 10);
    const completed = parseInt(allTasksCountRes.rows[0]?.completed || '0', 10);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      project: {
        ...project,
        member_count: membersResult.rowCount,
        total_tasks: total,
        completed_tasks: completed,
        progress,
        members: membersResult.rows,
        tasks: tasksResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createProject(req, res, next) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const { name, description, start_date, deadline, status, manager_id, member_ids } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Team members cannot create projects
    if (userRole === 'TEAM_MEMBER') {
      return res.status(403).json({
        success: false,
        message: 'Team Members do not have permission to create projects.',
      });
    }

    // Determine and validate Project Manager
    let assignedManagerId = manager_id;
    if (userRole === 'PROJECT_MANAGER' && !assignedManagerId) {
      assignedManagerId = userId;
    }

    if (assignedManagerId) {
      const mgrCheck = await client.query('SELECT id, role, name, is_active FROM users WHERE id = $1', [assignedManagerId]);
      if (mgrCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected Project Manager does not exist.',
        });
      }
      if (mgrCheck.rows[0].role === 'ADMIN') {
        return res.status(400).json({
          success: false,
          message: 'Admin users cannot be assigned as Project Manager.',
        });
      }
      if (mgrCheck.rows[0].is_active === false) {
        return res.status(400).json({
          success: false,
          message: 'Inactive users cannot be assigned as Project Manager.',
        });
      }
      if (mgrCheck.rows[0].role !== 'PROJECT_MANAGER') {
        return res.status(400).json({
          success: false,
          message: 'Assigned user must have the PROJECT_MANAGER role.',
        });
      }
    }

    // Validate Team Members: Only active TEAM_MEMBER users can be added (Admins, PMs, and deactivated users excluded)
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      const nonTeamMembers = await client.query(
        'SELECT id, name, role FROM users WHERE id = ANY($1::uuid[]) AND role != \'TEAM_MEMBER\'',
        [member_ids]
      );
      if (nonTeamMembers.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Only Team Members can be assigned as project team members.',
        });
      }

      const inactiveMembers = await client.query(
        'SELECT id, name FROM users WHERE id = ANY($1::uuid[]) AND is_active = false',
        [member_ids]
      );
      if (inactiveMembers.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Inactive users cannot be assigned to projects.',
        });
      }
    }

    await client.query('BEGIN');

    const projectInsert = await client.query(
      `INSERT INTO projects (name, description, start_date, deadline, status, manager_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || null,
        start_date,
        deadline,
        status || 'PLANNING',
        assignedManagerId || null,
        userId,
      ]
    );

    const project = projectInsert.rows[0];

    // If PM assigned, add PM to project_members
    if (assignedManagerId) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [project.id, assignedManagerId]
      );
    }

    // Add additional members
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      for (const mId of member_ids) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [project.id, mId]
        );
      }
    }

    // Activity log
    await client.query(
      `INSERT INTO activity_logs (user_id, project_id, action, description)
       VALUES ($1, $2, 'PROJECT_CREATED', $3)`,
      [userId, project.id, `Project "${project.name}" was created.`]
    );

    await client.query('COMMIT');

    // Notify added members
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      for (const mId of member_ids) {
        await createNotification({
          userId: mId,
          title: 'Project Assignment',
          message: `You were added to project "${project.name}".`,
          type: 'PROJECT',
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      project,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

async function updateProject(req, res, next) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { name, description, start_date, deadline, status, manager_id, member_ids } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'TEAM_MEMBER') {
      return res.status(403).json({
        success: false,
        message: 'Team Members do not have permission to modify projects.',
      });
    }

    const existingCheck = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (existingCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const currentProject = existingCheck.rows[0];

    // PM can only edit projects they manage or created
    if (userRole === 'PROJECT_MANAGER') {
      const isOwner = currentProject.manager_id === userId || currentProject.created_by === userId;
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify this project.',
        });
      }
    }

    // Validate manager_id if updating
    if (manager_id !== undefined && manager_id !== null) {
      const mgrCheck = await client.query('SELECT id, role, is_active FROM users WHERE id = $1', [manager_id]);
      if (mgrCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Assigned Project Manager not found.',
        });
      }
      if (mgrCheck.rows[0].role === 'ADMIN') {
        return res.status(400).json({
          success: false,
          message: 'Admin users cannot be assigned as Project Manager.',
        });
      }
      if (mgrCheck.rows[0].is_active === false) {
        return res.status(400).json({
          success: false,
          message: 'Inactive users cannot be assigned as Project Manager.',
        });
      }
      if (mgrCheck.rows[0].role !== 'PROJECT_MANAGER') {
        return res.status(400).json({
          success: false,
          message: 'Assigned manager must have the PROJECT_MANAGER role.',
        });
      }
    }

    // Validate member_ids: Admins and inactive users cannot be members
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      const adminMembers = await client.query(
        'SELECT id, name FROM users WHERE id = ANY($1::uuid[]) AND role = \'ADMIN\'',
        [member_ids]
      );
      if (adminMembers.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Admin users cannot be assigned as project members.',
        });
      }

      const inactiveMembers = await client.query(
        'SELECT id, name FROM users WHERE id = ANY($1::uuid[]) AND is_active = false',
        [member_ids]
      );
      if (inactiveMembers.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Inactive users cannot be assigned to projects.',
        });
      }
    }

    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE projects
       SET 
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         start_date = COALESCE($3, start_date),
         deadline = COALESCE($4, deadline),
         status = COALESCE($5, status),
         manager_id = CASE WHEN $6::text IS NOT NULL THEN $6::uuid ELSE manager_id END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, description, start_date, deadline, status, manager_id, id]
    );

    // If manager_id changed, ensure manager is a member
    if (manager_id) {
      await client.query(
        'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, manager_id]
      );
    }

    // If member_ids explicitly passed, synchronize
    if (Array.isArray(member_ids)) {
      await client.query('DELETE FROM project_members WHERE project_id = $1', [id]);
      if (manager_id || currentProject.manager_id) {
        const mgr = manager_id || currentProject.manager_id;
        await client.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, mgr]
        );
      }
      for (const mId of member_ids) {
        await client.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, mId]
        );
      }
    }

    // Activity log
    await client.query(
      `INSERT INTO activity_logs (user_id, project_id, action, description)
       VALUES ($1, $2, 'PROJECT_UPDATED', $3)`,
      [userId, id, `Project "${updateResult.rows[0].name}" was updated.`]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      project: updateResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'TEAM_MEMBER') {
      return res.status(403).json({
        success: false,
        message: 'Team Members do not have permission to delete projects.',
      });
    }

    const existingCheck = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (existingCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const currentProject = existingCheck.rows[0];

    // Only Admin or project's manager/creator can delete
    if (userRole !== 'ADMIN' && currentProject.manager_id !== userId && currentProject.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this project.',
      });
    }

    await query('DELETE FROM projects WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

async function addProjectMember(req, res, next) {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const userRole = req.user.role;
    const currentUserId = req.user.id;

    if (userRole === 'TEAM_MEMBER') {
      return res.status(403).json({
        success: false,
        message: 'Team Members do not have permission to add members.',
      });
    }

    const projectCheck = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const project = projectCheck.rows[0];

    if (userRole === 'PROJECT_MANAGER' && project.manager_id !== currentUserId && project.created_by !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage members of this project.',
      });
    }

    // Validate target user
    const userCheck = await query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [user_id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const targetUser = userCheck.rows[0];

    // CRITICAL: Only active TEAM_MEMBER users can be added as project members
    if (targetUser.role !== 'TEAM_MEMBER') {
      return res.status(400).json({
        success: false,
        message: 'Only Team Members can be added to the project. Admin and Project Manager users cannot be added as team members.',
      });
    }

    if (targetUser.is_active === false) {
      return res.status(400).json({
        success: false,
        message: 'Inactive users cannot be assigned to projects. Cannot add a deactivated user to a project.',
      });
    }

    // Check duplicate
    const exists = await query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, user_id]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'User is already a member of this project.',
      });
    }

    const memberInsert = await query(
      `INSERT INTO project_members (project_id, user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [id, user_id]
    );

    // Activity log
    await query(
      `INSERT INTO activity_logs (user_id, project_id, action, description)
       VALUES ($1, $2, 'MEMBER_ADDED', $3)`,
      [currentUserId, id, `Added ${targetUser.name} to the project.`]
    );

    // Notification for added member
    await createNotification({
      userId: user_id,
      title: 'Project Assignment',
      message: `You were added to project "${project.name}".`,
      type: 'PROJECT',
    });

    return res.status(201).json({
      success: true,
      message: 'Member added to project successfully.',
      member: {
        ...targetUser,
        assigned_at: memberInsert.rows[0].assigned_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function removeProjectMember(req, res, next) {
  try {
    const { id, userId } = req.params;
    const userRole = req.user.role;
    const currentUserId = req.user.id;

    if (userRole === 'TEAM_MEMBER') {
      return res.status(403).json({
        success: false,
        message: 'Team Members do not have permission to remove members.',
      });
    }

    const projectCheck = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const project = projectCheck.rows[0];

    if (userRole === 'PROJECT_MANAGER' && project.manager_id !== currentUserId && project.created_by !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage members of this project.',
      });
    }

    const userCheck = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const memberName = userCheck.rowCount > 0 ? userCheck.rows[0].name : 'User';

    const result = await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this project.',
      });
    }

    // Activity log
    await query(
      `INSERT INTO activity_logs (user_id, project_id, action, description)
       VALUES ($1, $2, 'MEMBER_REMOVED', $3)`,
      [currentUserId, id, `Removed ${memberName} from the project.`]
    );

    // Notification for removed member
    await createNotification({
      userId: userId,
      title: 'Project Member Removal',
      message: `You were removed from project "${project.name}".`,
      type: 'PROJECT',
    });

    return res.status(200).json({
      success: true,
      message: 'Member removed from project successfully.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
};
