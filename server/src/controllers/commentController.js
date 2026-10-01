const { query } = require('../config/db');
const { logActivity } = require('../services/activityService');
const { createNotification } = require('../services/notificationService');

/**
 * Helper to check task access authorization
 */
async function verifyTaskAccess(taskId, user) {
  const taskRes = await query(
    `SELECT t.id, t.title, t.project_id, t.assigned_to, t.created_by, p.manager_id, p.name AS project_name
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1`,
    [taskId]
  );

  if (taskRes.rowCount === 0) {
    return { error: { status: 404, message: 'Task not found.' } };
  }

  const task = taskRes.rows[0];

  if (user.role === 'ADMIN') {
    return { task };
  }

  if (user.role === 'PROJECT_MANAGER') {
    if (task.manager_id === user.id || task.created_by === user.id) {
      return { task };
    }
    // Also check if PM is assigned to the project
    const memberCheck = await query(
      `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [task.project_id, user.id]
    );
    if (memberCheck.rowCount > 0) {
      return { task };
    }
    return { error: { status: 403, message: 'Forbidden: You do not manage this task or project.' } };
  }

  if (user.role === 'TEAM_MEMBER') {
    if (task.assigned_to === user.id) {
      return { task };
    }
    return { error: { status: 403, message: 'Forbidden: You can only access comments on tasks assigned to you.' } };
  }

  return { error: { status: 403, message: 'Forbidden.' } };
}

/**
 * GET /api/tasks/:id/comments
 */
async function getTaskComments(req, res, next) {
  try {
    const { id: taskId } = req.params;
    const { task, error } = await verifyTaskAccess(taskId, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const commentsRes = await query(
      `SELECT 
         c.id, 
         c.task_id, 
         c.comment, 
         c.created_at, 
         c.updated_at,
         c.user_id,
         u.name AS user_name,
         u.role AS user_role,
         u.profile_image
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId]
    );

    // Privacy masking: Team Members should see generic role title for Admin
    const sanitizedComments = commentsRes.rows.map((c) => {
      if (c.user_role === 'ADMIN' && req.user.role === 'TEAM_MEMBER') {
        return {
          ...c,
          user_name: 'Project Lead',
          user_role: 'PROJECT_MANAGER',
        };
      }
      return c;
    });

    return res.status(200).json({
      success: true,
      count: sanitizedComments.length,
      comments: sanitizedComments,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tasks/:id/comments
 */
async function createComment(req, res, next) {
  try {
    const { id: taskId } = req.params;
    const { comment } = req.body;

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required.',
      });
    }

    const { task, error } = await verifyTaskAccess(taskId, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const insertRes = await query(
      `INSERT INTO comments (task_id, user_id, comment, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, task_id, user_id, comment, created_at, updated_at`,
      [taskId, req.user.id, comment.trim()]
    );

    const newComment = insertRes.rows[0];

    // Log Activity
    await logActivity({
      userId: req.user.id,
      projectId: task.project_id,
      taskId: task.id,
      action: 'COMMENT_ADDED',
      description: `${req.user.name} added a comment on "${task.title}"`,
    });

    // Notify relevant users
    // If the commenter is NOT the assignee, notify the assignee
    if (task.assigned_to && task.assigned_to !== req.user.id) {
      await createNotification({
        userId: task.assigned_to,
        title: `New Comment on "${task.title}"`,
        message: `${req.user.name} commented: "${comment.trim().slice(0, 80)}${comment.length > 80 ? '...' : ''}"`,
        type: 'COMMENT',
      });
    }

    // If the commenter is NOT the project manager, notify the manager
    if (task.manager_id && task.manager_id !== req.user.id && task.manager_id !== task.assigned_to) {
      await createNotification({
        userId: task.manager_id,
        title: `New Comment on "${task.title}"`,
        message: `${req.user.name} commented: "${comment.trim().slice(0, 80)}${comment.length > 80 ? '...' : ''}"`,
        type: 'COMMENT',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      comment: {
        ...newComment,
        user_name: req.user.name,
        user_role: req.user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/comments/:id
 */
async function updateComment(req, res, next) {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required.',
      });
    }

    const existingRes = await query(`SELECT * FROM comments WHERE id = $1`, [id]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    const existing = existingRes.rows[0];

    // Only comment author or Admin can edit
    if (existing.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit your own comments.',
      });
    }

    const updateRes = await query(
      `UPDATE comments
       SET comment = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, task_id, user_id, comment, created_at, updated_at`,
      [comment.trim(), id]
    );

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully.',
      comment: updateRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/comments/:id
 */
async function deleteComment(req, res, next) {
  try {
    const { id } = req.params;

    const existingRes = await query(`SELECT * FROM comments WHERE id = $1`, [id]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    const existing = existingRes.rows[0];

    // Only comment author or Admin can delete
    if (existing.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete your own comments.',
      });
    }

    await query(`DELETE FROM comments WHERE id = $1`, [id]);

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
};
