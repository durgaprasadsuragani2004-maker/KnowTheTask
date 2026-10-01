const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { logActivity } = require('../services/activityService');

async function getAllUsers(req, res, next) {
  try {
    const { role, search, status, sort, page, limit, assignable } = req.query;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    let baseSql = `
      SELECT 
        u.id, u.name, u.email, u.role, u.profile_image, u.is_active, u.created_at, u.updated_at,
        COALESCE(p_cnt.cnt, 0)::int AS projects_count,
        COALESCE(t_cnt.cnt, 0)::int AS tasks_count,
        COALESCE(t_cnt.active_cnt, 0)::int AS active_tasks_count,
        COALESCE(t_cnt.comp_cnt, 0)::int AS completed_tasks_count,
        COALESCE(t_cnt.overdue_cnt, 0)::int AS overdue_tasks_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(DISTINCT project_id) AS cnt FROM (
          SELECT manager_id AS user_id, id AS project_id FROM projects WHERE manager_id IS NOT NULL
          UNION
          SELECT user_id, project_id FROM project_members
        ) user_projs
        GROUP BY user_id
      ) p_cnt ON u.id = p_cnt.user_id
      LEFT JOIN (
        SELECT 
          assigned_to AS user_id, 
          COUNT(*) AS cnt,
          COUNT(*) FILTER (WHERE status != 'COMPLETED') AS active_cnt,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS comp_cnt,
          COUNT(*) FILTER (WHERE status != 'COMPLETED' AND deadline < CURRENT_DATE) AS overdue_cnt
        FROM tasks
        WHERE assigned_to IS NOT NULL
        GROUP BY assigned_to
      ) t_cnt ON u.id = t_cnt.user_id
      WHERE 1=1
    `;
    const params = [];

    // STRICT BACKEND ROLE-BASED VISIBILITY RULES
    // Rule 1: ADMIN has global visibility (can see Admin, PM, Team Member)
    if (currentUserRole === 'ADMIN') {
      // No role restrictions applied
    } 
    // Rule 2: PROJECT_MANAGER MUST NOT see Admin users
    else if (currentUserRole === 'PROJECT_MANAGER') {
      baseSql += ` AND u.role != 'ADMIN'`;
    } 
    // Rule 3: TEAM_MEMBER MUST NOT see Admin or Project Manager users (can only see Team Members in their projects)
    else if (currentUserRole === 'TEAM_MEMBER') {
      params.push(currentUserId);
      baseSql += ` AND u.role = 'TEAM_MEMBER' AND (
        u.id = $${params.length}
        OR u.id IN (
          SELECT pm2.user_id 
          FROM project_members pm1
          JOIN project_members pm2 ON pm1.project_id = pm2.project_id
          WHERE pm1.user_id = $${params.length}
        )
      )`;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid role.',
      });
    }

    // Role filter
    if (role) {
      if (role === 'ADMIN' && currentUserRole !== 'ADMIN') {
        return res.status(200).json({
          success: true,
          count: 0,
          users: [],
        });
      }
      if (role === 'PROJECT_MANAGER' && currentUserRole === 'TEAM_MEMBER') {
        return res.status(200).json({
          success: true,
          count: 0,
          users: [],
        });
      }
      params.push(role);
      baseSql += ` AND u.role = $${params.length}`;
    }

    // Status filter (Active / Inactive / All)
    if (status) {
      if (status.toUpperCase() === 'ACTIVE') {
        baseSql += ` AND u.is_active = true`;
      } else if (status.toUpperCase() === 'INACTIVE') {
        baseSql += ` AND u.is_active = false`;
      }
    }

    // Assignable filter (Part 13: filter active users strictly on backend)
    if (assignable === 'true' || assignable === true) {
      baseSql += ` AND u.is_active = true AND u.role != 'ADMIN'`;
    }

    // Search filter
    if (search) {
      params.push(`%${search}%`);
      baseSql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    // Sorting (Part 24: support sorting by tasks, projects, name, date)
    let orderClause = 'ORDER BY u.created_at DESC';
    if (sort === 'name') {
      orderClause = 'ORDER BY u.name ASC';
    } else if (sort === 'oldest') {
      orderClause = 'ORDER BY u.created_at ASC';
    } else if (sort === 'newest' || sort === 'recently_added') {
      orderClause = 'ORDER BY u.created_at DESC';
    } else if (sort === 'tasks_desc' || sort === 'tasks') {
      orderClause = 'ORDER BY tasks_count DESC, u.name ASC';
    } else if (sort === 'tasks_asc') {
      orderClause = 'ORDER BY tasks_count ASC, u.name ASC';
    } else if (sort === 'projects_desc' || sort === 'projects') {
      orderClause = 'ORDER BY projects_count DESC, u.name ASC';
    } else if (sort === 'projects_asc') {
      orderClause = 'ORDER BY projects_count ASC, u.name ASC';
    }

    // Pagination support
    if (page !== undefined) {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const limitNum = Math.max(1, parseInt(limit || '10', 10));
      const offset = (pageNum - 1) * limitNum;

      // Extract where condition for count
      const whereIdx = baseSql.indexOf('WHERE 1=1');
      const wherePart = baseSql.substring(whereIdx);
      const countSql = `SELECT COUNT(*) AS total_count FROM users u ${wherePart}`;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total_count || '0', 10);
      const totalPages = Math.ceil(total / limitNum) || 1;

      const pagedSql = `${baseSql} ${orderClause} LIMIT ${limitNum} OFFSET ${offset}`;
      const result = await query(pagedSql, params);

      return res.status(200).json({
        success: true,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        count: result.rowCount,
        users: result.rows,
      });
    }

    const result = await query(`${baseSql} ${orderClause}`, params);
    return res.status(200).json({
      success: true,
      total: result.rowCount,
      page: 1,
      limit: result.rowCount,
      totalPages: 1,
      count: result.rowCount,
      users: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/assignable
 * Strictly returns active, non-admin users for project/task assignment dropdowns (Part 13)
 */
async function getAssignableUsers(req, res, next) {
  try {
    const { role } = req.query;
    const currentUserRole = req.user.role;

    let sql = `
      SELECT id, name, email, role, profile_image, is_active 
      FROM users 
      WHERE is_active = true AND role != 'ADMIN'
    `;
    const params = [];

    // If Team Member queries, they can only see active team members on shared projects
    if (currentUserRole === 'TEAM_MEMBER') {
      params.push(req.user.id);
      sql += ` AND role = 'TEAM_MEMBER' AND (
        id = $1 OR id IN (
          SELECT pm2.user_id 
          FROM project_members pm1
          JOIN project_members pm2 ON pm1.project_id = pm2.project_id
          WHERE pm1.user_id = $1
        )
      )`;
    }

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    sql += ' ORDER BY name ASC';
    const result = await query(sql, params);

    return res.status(200).json({
      success: true,
      count: result.rowCount,
      users: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:id/workload
 * Detailed workload summary and assigned project/task lists for a specific user (Part 17)
 */
async function getUserWorkload(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    // Check user exists
    const userRes = await query('SELECT id, name, email, role, is_active, profile_image FROM users WHERE id = $1', [id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const targetUser = userRes.rows[0];

    // Security: PM cannot inspect Admin
    if (currentUserRole === 'PROJECT_MANAGER' && targetUser.role === 'ADMIN') {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    // Security: Team Member can only view their own workload
    if (currentUserRole === 'TEAM_MEMBER' && targetUser.id !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own workload.' });
    }

    // Projects list
    let projectsSql = '';
    let projectsParams = [id];
    if (targetUser.role === 'PROJECT_MANAGER') {
      projectsSql = `
        SELECT p.id, p.name, p.status, p.start_date, p.deadline,
          COUNT(DISTINCT t.id)::int AS total_tasks,
          COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END)::int AS completed_tasks
        FROM projects p
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.manager_id = $1
        GROUP BY p.id
        ORDER BY p.name ASC
      `;
    } else {
      projectsSql = `
        SELECT p.id, p.name, p.status, p.start_date, p.deadline,
          COUNT(DISTINCT t.id)::int AS total_tasks,
          COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END)::int AS completed_tasks
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE pm.user_id = $1
        GROUP BY p.id
        ORDER BY p.name ASC
      `;
    }
    const projectsResult = await query(projectsSql, projectsParams);

    // Tasks list
    let tasksSql = '';
    let tasksParams = [id];
    if (targetUser.role === 'PROJECT_MANAGER') {
      tasksSql = `
        SELECT t.id, t.title, t.priority, t.status, t.deadline, p.name AS project_name, u_as.name AS assignee_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u_as ON t.assigned_to = u_as.id
        WHERE p.manager_id = $1
        ORDER BY t.deadline ASC NULLS LAST
      `;
    } else {
      tasksSql = `
        SELECT t.id, t.title, t.priority, t.status, t.deadline, p.name AS project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_to = $1
        ORDER BY t.deadline ASC NULLS LAST
      `;
    }
    const tasksResult = await query(tasksSql, tasksParams);

    const activeTasks = tasksResult.rows.filter(t => t.status !== 'COMPLETED').length;
    const completedTasks = tasksResult.rows.filter(t => t.status === 'COMPLETED').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = tasksResult.rows.filter(t => {
      if (t.status === 'COMPLETED' || !t.deadline) return false;
      const dStr = t.deadline instanceof Date ? t.deadline.toISOString().split('T')[0] : String(t.deadline).split('T')[0];
      return dStr < todayStr;
    }).length;

    return res.status(200).json({
      success: true,
      user: targetUser,
      workload: {
        projects_count: projectsResult.rowCount,
        tasks_count: tasksResult.rowCount,
        active_tasks_count: activeTasks,
        completed_tasks_count: completedTasks,
        overdue_tasks_count: overdueTasks,
      },
      projects: projectsResult.rows,
      tasks: tasksResult.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    const userResult = await query(
      `SELECT id, name, email, role, profile_image, is_active, created_at, updated_at FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const targetUser = userResult.rows[0];

    // BACKEND SECURITY: Non-admins MUST NOT be able to view or discover Admin accounts
    if (targetUser.role === 'ADMIN' && currentUserRole !== 'ADMIN') {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // TEAM_MEMBER can NEVER view Project Manager accounts or unrelated users
    if (currentUserRole === 'TEAM_MEMBER') {
      if (targetUser.role !== 'TEAM_MEMBER') {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }
      if (targetUser.id !== currentUserId) {
        const shareProject = await query(
          `SELECT 1 FROM project_members pm1
           JOIN project_members pm2 ON pm1.project_id = pm2.project_id
           WHERE pm1.user_id = $1 AND pm2.user_id = $2`,
          [currentUserId, targetUser.id]
        );
        if (shareProject.rowCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found.',
          });
        }
      }
    }

    // Assigned projects
    const projectsResult = await query(
      `SELECT p.id, p.name, p.status, pm.assigned_at
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1`,
      [id]
    );

    // Assigned tasks
    const tasksResult = await query(
      `SELECT id, title, priority, status, deadline, project_id
       FROM tasks
       WHERE assigned_to = $1
       ORDER BY deadline ASC NULLS LAST`,
      [id]
    );

    return res.status(200).json({
      success: true,
      user: targetUser,
      projects: projectsResult.rows,
      tasks: tasksResult.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, password_hash, role || 'TEAM_MEMBER']
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/:id
 * Admin User Profile Management with strict role, email, and password controls (Parts 2-5)
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role, is_active, password } = req.body;

    // Check permissions: only ADMIN can modify other users or modify roles/is_active
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update your own profile.',
      });
    }

    const userCheck = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const current = userCheck.rows[0];

    // If target is ADMIN and requester is not ADMIN, hide existence
    if (current.role === 'ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const newName = name !== undefined && name.trim() !== '' ? name.trim() : current.name;
    const newEmail = email !== undefined && email.trim() !== '' ? email.trim().toLowerCase() : current.email;
    const newRole = req.user.role === 'ADMIN' && role !== undefined ? role : current.role;
    const newActive = req.user.role === 'ADMIN' && is_active !== undefined ? Boolean(is_active) : current.is_active;

    // Email validation & duplicate check (Part 5)
    if (newEmail !== current.email) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
        [newEmail, id]
      );
      if (emailCheck.rowCount > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email is already in use by another user.',
        });
      }
    }

    // Role change security (Part 3)
    if (newRole !== current.role) {
      // If demoting an Admin account to PM or Team Member
      if (current.role === 'ADMIN' && newRole !== 'ADMIN') {
        const adminCountRes = await query(
          `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true AND id != $1`,
          [id]
        );
        const remainingAdmins = parseInt(adminCountRes.rows[0]?.count || '0', 10);
        if (remainingAdmins < 1) {
          return res.status(400).json({
            success: false,
            message: 'At least one Admin account must remain. Cannot remove administrative role.',
          });
        }
        if (id === req.user.id) {
          return res.status(400).json({
            success: false,
            message: 'You cannot remove your own administrative access.',
          });
        }
      }
    }

    // Active status security: cannot deactivate the last active Admin
    if (newActive === false && current.role === 'ADMIN') {
      const adminCountRes = await query(
        `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true AND id != $1`,
        [id]
      );
      const remainingAdmins = parseInt(adminCountRes.rows[0]?.count || '0', 10);
      if (remainingAdmins < 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one Admin account must remain. Cannot deactivate the last active administrator.',
        });
      }
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot deactivate your own account.',
        });
      }
    }

    // Password management (Part 4)
    let passwordHash = current.password_hash;
    if (password && String(password).trim() !== '') {
      if (String(password).trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters.',
        });
      }
      passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    const result = await query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, is_active = $4, password_hash = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, name, email, role, is_active, updated_at`,
      [newName, newEmail, newRole, newActive, passwordHash, id]
    );

    // Audit logs (Part 27)
    if (current.role !== newRole) {
      await logActivity({
        userId: req.user.id,
        action: 'USER_ROLE_CHANGED',
        description: `${req.user.name} changed role of "${current.name}" from ${current.role} to ${newRole}.`,
      });
    }
    if (current.is_active !== newActive) {
      await logActivity({
        userId: req.user.id,
        action: newActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        description: `${req.user.name} ${newActive ? 'activated' : 'deactivated'} member "${current.name}".`,
      });
    }
    if (current.name !== newName || current.email !== newEmail || (password && String(password).trim() !== '')) {
      await logActivity({
        userId: req.user.id,
        action: 'USER_UPDATED',
        description: `${req.user.name} updated profile for user "${current.name}".`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Field "is_active" must be a boolean (true or false).',
      });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can activate or deactivate users.',
      });
    }

    const userRes = await query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const targetUser = userRes.rows[0];

    // Admin cannot deactivate themselves
    if (req.user.id === id && is_active === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    // Prevent deactivation of the last active admin
    if (targetUser.role === 'ADMIN' && is_active === false) {
      const adminCountRes = await query(
        `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true AND id != $1`,
        [id]
      );
      const remainingAdmins = parseInt(adminCountRes.rows[0]?.count || '0', 10);
      if (remainingAdmins < 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one Admin account must remain. Cannot deactivate the last active administrator.',
        });
      }
    }

    const result = await query(
      `UPDATE users
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, role, is_active, updated_at`,
      [is_active, id]
    );

    const action = is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
    const description = `${req.user.name} ${is_active ? 'activated' : 'deactivated'} member "${targetUser.name}"`;

    await logActivity({
      userId: req.user.id,
      action,
      description,
    });

    return res.status(200).json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully.`,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id
 * Safe User Deletion respecting database relationships & historical integrity (Parts 6 & 7)
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can delete users.',
      });
    }

    const userCheck = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const targetUser = userCheck.rows[0];

    // Cannot delete the last active administrator
    if (targetUser.role === 'ADMIN') {
      const adminCountRes = await query(
        `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true AND id != $1`,
        [id]
      );
      if (parseInt(adminCountRes.rows[0]?.count || '0', 10) < 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one Admin account must remain. Cannot delete the last active administrator.',
        });
      }
    }

    // SAFE USER DELETION CHECK (Part 7)
    // Check whether user has historical projects, tasks, or comments
    const projCheck = await query(
      'SELECT COUNT(*) FROM projects WHERE manager_id = $1 OR created_by = $1',
      [id]
    );
    const taskCheck = await query(
      'SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 OR created_by = $1',
      [id]
    );
    const commentCheck = await query(
      'SELECT COUNT(*) FROM comments WHERE user_id = $1',
      [id]
    );

    const hasProjHistory = parseInt(projCheck.rows[0]?.count || '0', 10) > 0;
    const hasTaskHistory = parseInt(taskCheck.rows[0]?.count || '0', 10) > 0;
    const hasCommentHistory = parseInt(commentCheck.rows[0]?.count || '0', 10) > 0;

    if (hasProjHistory || hasTaskHistory || hasCommentHistory) {
      return res.status(400).json({
        success: false,
        has_history: true,
        message: 'This user cannot be permanently deleted because they have historical project/task records. Deactivate the account instead.',
      });
    }

    // Clean up notifications and project memberships before deletion
    await query('DELETE FROM notifications WHERE user_id = $1', [id]);
    await query('DELETE FROM project_members WHERE user_id = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'USER_DELETED',
      description: `${req.user.name} permanently deleted user "${targetUser.name}".`,
    });

    return res.status(200).json({
      success: true,
      message: 'User permanently deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllUsers,
  getAssignableUsers,
  getUserWorkload,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
};
