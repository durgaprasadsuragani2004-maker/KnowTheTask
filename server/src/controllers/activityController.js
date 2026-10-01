const { query } = require('../config/db');
const { getTaskActivities, getProjectActivities } = require('../services/activityService');

/**
 * GET /api/tasks/:id/activity
 */
async function getTaskActivity(req, res, next) {
  try {
    const { id: taskId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Check task access
    const taskRes = await query(
      `SELECT t.id, t.project_id, t.assigned_to, p.manager_id 
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [taskId]
    );

    if (taskRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const task = taskRes.rows[0];

    if (userRole === 'TEAM_MEMBER' && task.assigned_to !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot access activity for this task.' });
    }

    if (userRole === 'PROJECT_MANAGER' && task.manager_id !== userId) {
      const pmCheck = await query(
        `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [task.project_id, userId]
      );
      if (pmCheck.rowCount === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not manage this task.' });
      }
    }

    const activities = await getTaskActivities(taskId);

    // Sanitize user info for Team Member
    const sanitized = activities.map((a) => {
      if (a.user_role === 'ADMIN' && userRole === 'TEAM_MEMBER') {
        return {
          ...a,
          user_name: 'Project Lead',
          user_role: 'PROJECT_MANAGER',
        };
      }
      return a;
    });

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      activities: sanitized,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/activity
 */
async function getProjectActivity(req, res, next) {
  try {
    const { id: projectId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Check project access
    const projRes = await query(
      `SELECT id, manager_id FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (userRole === 'TEAM_MEMBER') {
      const memberCheck = await query(
        `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId]
      );
      if (memberCheck.rowCount === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not a member of this project.' });
      }
    } else if (userRole === 'PROJECT_MANAGER') {
      if (projRes.rows[0].manager_id !== userId) {
        const memberCheck = await query(
          `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
          [projectId, userId]
        );
        if (memberCheck.rowCount === 0) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not manage this project.' });
        }
      }
    }

    const activities = await getProjectActivities(projectId);

    const sanitized = activities.map((a) => {
      if (a.user_role === 'ADMIN' && userRole === 'TEAM_MEMBER') {
        return {
          ...a,
          user_name: 'Project Lead',
          user_role: 'PROJECT_MANAGER',
        };
      }
      return a;
    });

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      activities: sanitized,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTaskActivity,
  getProjectActivity,
};
