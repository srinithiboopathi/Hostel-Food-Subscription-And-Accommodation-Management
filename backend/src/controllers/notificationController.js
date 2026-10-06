const notificationService = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * GET /api/notifications - Get paginated notifications for the authenticated user
 */
async function getNotifications(req, res, next) {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);
    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/unread - Get latest unread notifications
 */
async function getUnreadNotifications(req, res, next) {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user.id, req.query);
    res.status(200).json({
      success: true,
      message: 'Unread notifications retrieved successfully',
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/unread-count - Get total unread count for badge
 */
async function getUnreadCount(req, res, next) {
  try {
    const result = await notificationService.getUnreadCount(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT / PATCH /api/notifications/:id/read - Mark a specific notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const updated = await notificationService.markAsRead(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT / PATCH /api/notifications/read-all - Mark all user notifications as read
 */
async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/preferences - Get user notification preferences
 */
async function getPreferences(req, res, next) {
  try {
    const prefs = await notificationService.getNotificationPreferences(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Notification preferences retrieved successfully',
      data: prefs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT / PATCH /api/notifications/preferences - Update user notification preferences
 */
async function updatePreferences(req, res, next) {
  try {
    const prefs = await notificationService.updateNotificationPreferences(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: prefs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notifications/broadcast - Broadcast announcement (ADMIN, WARDEN)
 */
async function broadcastAnnouncement(req, res, next) {
  try {
    const result = await notificationService.broadcastNotification({
      title: req.body.title,
      message: req.body.message,
      type: req.body.type || 'SYSTEM',
      link: req.body.link || null,
      targetRole: req.body.targetRole || 'ALL',
      targetUserIds: req.body.targetUserIds || [],
    });

    res.status(201).json({
      success: true,
      message: 'Broadcast announcement dispatched successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/:id - Get a single notification by ID
 */
async function getNotificationById(req, res, next) {
  try {
    const notification = await notificationService.getNotificationById(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: 'Notification retrieved successfully',
      data: notification,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notifications/:id - Delete a notification
 */
async function deleteNotification(req, res, next) {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  broadcastAnnouncement,
};
