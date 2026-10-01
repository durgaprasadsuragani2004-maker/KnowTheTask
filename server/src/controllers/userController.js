const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { logActivity } = require('../services/activityService');

async function getAllUsers(req, res, next) {
  try {
    const { role, search, status, sort, page, limit } = req.query;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    let sql = `SELECT id, name, email, role, profile_image, is_active, created_at, updated_at FROM users WHERE 1=1`;
    const params = [];

    // STRICT BACKEND ROLE-BASED VISIBILITY RULES
    // Rule 1: ADMIN has global visibility (can see Admin, PM, Team Member)
    if (currentUserRole === 'ADMIN') {
      // No role restrictions applied
    } 
    // Rule 2: PROJECT_MANAGER MUST NOT see Admin users
    else if (currentUserRole === 'PROJECT_MANAGER') {
      sql += ` AND role != 'ADMIN'`;
    } 
    // Rule 3: TEAM_MEMBER MUST NOT see Admin or Project Manager users (can only see Team Members in their projects)
    else if (currentUserRole === 'TEAM_MEMBER') {
      params.push(currentUserId);
      sql += ` AND role = 'TEAM_MEMBER' AND (
        id = $${params.length}
        OR id IN (
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
      // Non-admins can NEVER query for ADMIN users
      if (role === 'ADMIN' && currentUserRole !== 'ADMIN') {
        return res.status(200).json({
          success: true,
          count: 0,
          users: [],
        });
      }
      // Team Members can NEVER query for PROJECT_MANAGER users
      if (role === 'PROJECT_MANAGER' && currentUserRole === 'TEAM_MEMBER') {
        return res.status(200).json({
          success: true,
          count: 0,
          users: [],
        });
      }
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    // Status filter (Active / Inactive / All)
    if (status) {
      if (status.toUpperCase() === 'ACTIVE') {
        sql += ` AND is_active = true`;
      } else if (status.toUpperCase() === 'INACTIVE') {
        sql += ` AND is_active = false`;
      }
    }

    // Search filter
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    // Sorting
    let orderClause = 'ORDER BY created_at DESC';
    if (sort === 'name') {
      orderClause = 'ORDER BY name ASC';
    } else if (sort === 'oldest') {
      orderClause = 'ORDER BY created_at ASC';
    } else if (sort === 'newest' || sort === 'recently_added') {
      orderClause = 'ORDER BY created_at DESC';
    }

    // Pagination support
    if (page !== undefined) {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const limitNum = Math.max(1, parseInt(limit || '10', 10));
      const offset = (pageNum - 1) * limitNum;

      const countSql = sql.replace(
        'SELECT id, name, email, role, profile_image, is_active, created_at, updated_at FROM users',
        'SELECT COUNT(*) AS total_count FROM users'
      );
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total_count || '0', 10);
      const totalPages = Math.ceil(total / limitNum) || 1;

      const pagedSql = `${sql} ${orderClause} LIMIT ${limitNum} OFFSET ${offset}`;
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

    const result = await query(`${sql} ${orderClause}`, params);
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

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;

    // Check permissions: only ADMIN can modify other users or modify roles/is_active
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile.',
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

    const newName = name !== undefined ? name : current.name;
    const newEmail = email !== undefined ? email : current.email;
    const newRole = req.user.role === 'ADMIN' && role !== undefined ? role : current.role;
    const newActive = req.user.role === 'ADMIN' && is_active !== undefined ? is_active : current.is_active;

    const result = await query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, email, role, is_active, updated_at`,
      [newName, newEmail, newRole, newActive, id]
    );

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
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

    // Check if target user exists
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
        `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true`
      );
      const activeAdminCount = parseInt(adminCountRes.rows[0]?.count || '0', 10);
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the last active administrator.',
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
        message: 'Forbidden: Only administrators can delete or deactivate users.',
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
    if (targetUser.role === 'ADMIN') {
      const adminCountRes = await query(
        `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true`
      );
      if (parseInt(adminCountRes.rows[0]?.count || '0', 10) <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the last active administrator.',
        });
      }
    }

    // Safe deactivation to preserve historical records as required by Phase 3 Part 1
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, email, role, is_active',
      [id]
    );

    await logActivity({
      userId: req.user.id,
      action: 'USER_DEACTIVATED',
      description: `${req.user.name} deactivated member "${targetUser.name}"`,
    });

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully to preserve historical records.',
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
};
