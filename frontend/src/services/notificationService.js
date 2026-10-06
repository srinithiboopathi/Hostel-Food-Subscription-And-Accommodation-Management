import axiosClient from '../api/axiosClient';

/**
 * Fetch paginated notifications with filters (page, limit, isRead, type, category, search, startDate, endDate)
 */
export async function getNotifications(params = {}) {
  return await axiosClient.get('/notifications', { params });
}

/**
 * Fetch latest unread notifications for dropdown
 */
export async function getUnreadNotifications(params = {}) {
  return await axiosClient.get('/notifications/unread', { params });
}

/**
 * Fetch live unread count for badge
 */
export async function getUnreadCount() {
  return await axiosClient.get('/notifications/unread-count');
}

/**
 * Fetch a single notification by ID
 */
export async function getNotificationById(id) {
  return await axiosClient.get(`/notifications/${id}`);
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id) {
  return await axiosClient.patch(`/notifications/${id}/read`);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  return await axiosClient.patch('/notifications/read-all');
}

/**
 * Delete a notification
 */
export async function deleteNotification(id) {
  return await axiosClient.delete(`/notifications/${id}`);
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences() {
  return await axiosClient.get('/notifications/preferences');
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(preferences) {
  return await axiosClient.put('/notifications/preferences', preferences);
}

/**
 * Broadcast an announcement (Admin, Warden)
 */
export async function broadcastAnnouncement(data) {
  return await axiosClient.post('/notifications/broadcast', data);
}
