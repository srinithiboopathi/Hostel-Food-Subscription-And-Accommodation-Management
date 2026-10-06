import axiosClient from '../api/axiosClient';

/**
 * Fetch paginated leave requests with search and filters
 * @param {Object} params - { page, limit, search, studentId, hostelId, status, leaveType, startDate, endDate }
 */
export async function getLeaves(params = {}) {
  return await axiosClient.get('/leaves', { params });
}

/**
 * Fetch authenticated student's own leave requests
 */
export async function getMyLeaves(params = {}) {
  return await axiosClient.get('/leaves/my', { params });
}

/**
 * Fetch leave request details by ID
 */
export async function getLeaveById(id) {
  return await axiosClient.get(`/leaves/${id}`);
}

/**
 * Submit a new leave request
 */
export async function createLeave(data) {
  return await axiosClient.post('/leaves', data);
}

/**
 * Update leave status (APPROVE, REJECT, RETURNED, CANCELLED)
 */
export async function updateLeaveStatus(id, data) {
  return await axiosClient.put(`/leaves/${id}`, data);
}

/**
 * Delete a leave request
 */
export async function deleteLeave(id) {
  return await axiosClient.delete(`/leaves/${id}`);
}

/**
 * Fetch leave analytics & statistics
 */
export async function getLeaveStatistics() {
  return await axiosClient.get('/leaves/statistics');
}
