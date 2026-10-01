const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { generateToken } = require('../utils/jwt');

function formatRoleName(role) {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'PROJECT_MANAGER':
      return 'Project Manager';
    case 'TEAM_MEMBER':
      return 'Team Member';
    default:
      return role;
  }
}

async function login(req, res, next) {
  try {
    const { email, password, role } = req.body;

    // 1. Fetch user from PostgreSQL
    const result = await query(
      `SELECT id, name, email, password_hash, role, profile_image, is_active, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    // 2. Check active status
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // 3. Verify bcrypt password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Role validation: Verify frontend-selected role against actual PostgreSQL database role
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to login as ${formatRoleName(role)}.`,
      });
    }

    // 5. Generate secure JWT token containing verified user details
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const assignedRole = role || 'TEAM_MEMBER';

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, role, profile_image, created_at`,
      [name, email, password_hash, assignedRole]
    );

    const newUser = result.rows[0];
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const userResult = await query(
      `SELECT id, name, email, role, profile_image, is_active, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const user = userResult.rows[0];

    // Fetch brief stats for dashboard header
    const statsResult = await query(
      `SELECT 
         (SELECT COUNT(*) FROM projects) AS total_projects,
         (SELECT COUNT(*) FROM tasks WHERE assigned_to = $1) AS my_tasks,
         (SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status = 'COMPLETED') AS completed_tasks`,
      [user.id]
    );

    return res.status(200).json({
      success: true,
      user,
      stats: statsResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  register,
  getMe,
};
