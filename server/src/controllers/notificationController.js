const {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../services/notificationService');

/**
 * GET /api/notifications
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    const data = await getUserNotifications(userId, { page, limit });

    return res.status(200).json({
      success: true,
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
      unreadCount: data.unreadCount,
      notifications: data.notifications,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 */
async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await markNotificationRead(id, userId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/read-all
 */
async function markAllRead(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await markAllNotificationsRead(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      updatedCount: result.updatedCount,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
};
