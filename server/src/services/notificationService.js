const { query } = require('../config/db');

/**
 * Create a new notification for a specific user
 * @param {Object} params
 * @param {string} params.userId - Recipient user UUID
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Category (e.g. 'TASK', 'PROJECT', 'COMMENT', 'DEADLINE')
 */
async function createNotification({ userId, title, message, type }) {
  if (!userId) return null;
  try {
    const res = await query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())
       RETURNING *`,
      [userId, title, message, type || 'GENERAL']
    );
    return res.rows[0];
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Checks for tasks approaching deadline for a user and creates notifications
 * Prevents duplicate alerts by checking existing alerts within last 24 hours
 */
async function checkDeadlineApproaching(userId) {
  if (!userId) return;
  try {
    // Find uncompleted tasks assigned to user due within 48 hours (and not past due by more than 24h)
    const upcomingTasks = await query(
      `SELECT t.id, t.title, t.deadline, p.name AS project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assigned_to = $1 
         AND t.status != 'COMPLETED'
         AND t.deadline IS NOT NULL
         AND t.deadline >= CURRENT_DATE
         AND t.deadline <= CURRENT_DATE + INTERVAL '2 days'`,
      [userId]
    );

    for (const task of upcomingTasks.rows) {
      // Check if notification already exists for this task deadline alert
      const existing = await query(
        `SELECT id FROM notifications
         WHERE user_id = $1 
           AND type = 'DEADLINE'
           AND title LIKE $2
           AND created_at >= NOW() - INTERVAL '24 hours'`,
        [userId, `%${task.title}%`]
      );

      if (existing.rows.length === 0) {
        await createNotification({
          userId,
          title: `Task Deadline Approaching: "${task.title}"`,
          message: `The deliverable "${task.title}" in project "${task.project_name}" is due on ${new Date(task.deadline).toISOString().split('T')[0]}.`,
          type: 'DEADLINE',
        });
      }
    }
  } catch (err) {
    console.error('Error running checkDeadlineApproaching:', err.message);
  }
}

/**
 * Get notifications for a user with unread count
 */
async function getUserNotifications(userId, options = {}) {
  // First run check for upcoming deadlines
  await checkDeadlineApproaching(userId);

  const totalCountRes = await query(
    `SELECT COUNT(*) AS total_count FROM notifications WHERE user_id = $1`,
    [userId]
  );
  const total = parseInt(totalCountRes.rows[0]?.total_count || '0', 10);

  const countRes = await query(
    `SELECT COUNT(*) AS unread_count
     FROM notifications
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  const unreadCount = parseInt(countRes.rows[0]?.unread_count || '0', 10);

  if (options.page !== undefined) {
    const pageNum = Math.max(1, parseInt(options.page || '1', 10));
    const limitNum = Math.max(1, parseInt(options.limit || '10', 10));
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum) || 1;

    const listRes = await query(
      `SELECT id, user_id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limitNum, offset]
    );

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      notifications: listRes.rows,
      unreadCount,
    };
  }

  const listRes = await query(
    `SELECT id, user_id, title, message, type, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );

  return {
    total,
    page: 1,
    limit: 50,
    totalPages: Math.ceil(total / 50) || 1,
    notifications: listRes.rows,
    unreadCount,
  };
}

/**
 * Mark a single notification as read (strictly scoped to user)
 */
async function markNotificationRead(notificationId, userId) {
  const res = await query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return res.rows[0] || null;
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsRead(userId) {
  const res = await query(
    `UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false
     RETURNING id`,
    [userId]
  );
  return { updatedCount: res.rowCount };
}

module.exports = {
  createNotification,
  checkDeadlineApproaching,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
