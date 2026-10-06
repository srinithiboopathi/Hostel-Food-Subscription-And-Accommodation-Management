import axiosClient from '../api/axiosClient';

/**
 * Fetch paginated visitors with search and filters
 * @param {Object} params - { page, limit, search, studentId, hostelId, status, date }
 */
export async function getVisitors(params = {}) {
  return await axiosClient.get('/visitors', { params });
}

/**
 * Fetch today's visitors summary and list
 */
export async function getTodayVisitors() {
  return await axiosClient.get('/visitors/today');
}

/**
 * Fetch visitor details by ID
 */
export async function getVisitorById(id) {
  return await axiosClient.get(`/visitors/${id}`);
}

/**
 * Register a new visitor entry
 */
export async function registerVisitor(data) {
  return await axiosClient.post('/visitors', data);
}

/**
 * Checkout a visitor
 */
export async function checkoutVisitor(id, data = {}) {
  return await axiosClient.put(`/visitors/${id}/checkout`, data);
}

/**
 * Update visitor record
 */
export async function updateVisitor(id, data) {
  return await axiosClient.put(`/visitors/${id}`, data);
}

/**
 * Delete a visitor record
 */
export async function deleteVisitor(id) {
  return await axiosClient.delete(`/visitors/${id}`);
}

/**
 * Fetch visitor statistics & analytics
 */
export async function getVisitorStatistics() {
  return await axiosClient.get('/visitors/statistics');
}
