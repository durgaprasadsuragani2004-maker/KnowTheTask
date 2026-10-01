const { query } = require('../config/db');

/**
 * Log an activity event to activity_logs table
 * @param {Object} params
 * @param {string} params.userId - User who performed the action
 * @param {string} [params.projectId] - Related project ID
 * @param {string} [params.taskId] - Related task ID
 * @param {string} params.action - Action identifier (e.g. 'TASK_CREATED', 'TASK_STATUS_CHANGED')
 * @param {string} params.description - Human-readable description
 */
async function logActivity({ userId, projectId, taskId, action, description }) {
  try {
    const res = await query(
      `INSERT INTO activity_logs (user_id, project_id, task_id, action, description, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId || null, projectId || null, taskId || null, action, description]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Failed to log activity event:', err.message);
    // Don't break the main business transaction if logging fails
    return null;
  }
}

/**
 * Fetch activity logs for a task
 */
async function getTaskActivities(taskId) {
  const res = await query(
    `SELECT 
       a.id,
       a.user_id,
       u.name AS user_name,
       u.role AS user_role,
       a.project_id,
       p.name AS project_name,
       a.task_id,
       a.action,
       a.description,
       a.created_at
     FROM activity_logs a
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN projects p ON a.project_id = p.id
     WHERE a.task_id = $1
     ORDER BY a.created_at DESC`,
    [taskId]
  );
  return res.rows;
}

/**
 * Fetch activity logs for a project
 */
async function getProjectActivities(projectId) {
  const res = await query(
    `SELECT 
       a.id,
       a.user_id,
       u.name AS user_name,
       u.role AS user_role,
       a.project_id,
       a.task_id,
       t.title AS task_title,
       a.action,
       a.description,
       a.created_at
     FROM activity_logs a
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN tasks t ON a.task_id = t.id
     WHERE a.project_id = $1
     ORDER BY a.created_at DESC
     LIMIT 100`,
    [projectId]
  );
  return res.rows;
}

module.exports = {
  logActivity,
  getTaskActivities,
  getProjectActivities,
};
