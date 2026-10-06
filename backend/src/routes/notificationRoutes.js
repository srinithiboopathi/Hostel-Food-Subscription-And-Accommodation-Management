const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(authenticate);

// Unread count (For real-time badge polling)
router.get('/unread-count', notificationController.getUnreadCount);

// Recent unread list (For notification bell dropdown)
router.get('/unread', notificationController.getUnreadNotifications);

// Notification Preferences
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);
router.patch('/preferences', notificationController.updatePreferences);

// Broadcast Announcement (ADMIN, WARDEN)
router.post(
  '/broadcast',
  authorizeRoles('ADMIN', 'WARDEN'),
  notificationController.broadcastAnnouncement
);

// Mark all as read (Supports both PATCH and PUT)
router.patch('/read-all', notificationController.markAllAsRead);
router.put('/read-all', notificationController.markAllAsRead);

// List user notifications (Paginated, filters)
router.get('/', notificationController.getNotifications);

// Get specific notification by ID
router.get('/:id', notificationController.getNotificationById);

// Mark specific notification as read (Supports both PATCH and PUT)
router.patch('/:id/read', notificationController.markAsRead);
router.put('/:id/read', notificationController.markAsRead);

// Delete specific notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
