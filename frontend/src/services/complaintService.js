import axiosClient from '../api/axiosClient';

/**
 * Fetch paginated complaints with search and filters
 * @param {Object} params - { page, limit, search, studentId, hostelId, roomId, category, status, priority, assignedTo }
 */
export async function getComplaints(params = {}) {
  return await axiosClient.get('/complaints', { params });
}

/**
 * Fetch authenticated student's own complaints
 */
export async function getMyComplaints(params = {}) {
  return await axiosClient.get('/complaints/my', { params });
}

/**
 * Fetch complaint details by ID including full timeline history
 */
export async function getComplaintById(id) {
  return await axiosClient.get(`/complaints/${id}`);
}

/**
 * Register a new grievance / maintenance ticket
 * @param {Object} complaintData - { category, title, description, priority, roomId, studentId }
 */
export async function createComplaint(complaintData) {
  return await axiosClient.post('/complaints', complaintData);
}

/**
 * Update complaint (Status transition, Staff assignment, Remarks)
 * @param {number|string} id 
 * @param {Object} updateData - { status, priority, assignedTo, remarks }
 */
export async function updateComplaint(id, updateData) {
  return await axiosClient.put(`/complaints/${id}`, updateData);
}

/**
 * Delete complaint (ADMIN only)
 */
export async function deleteComplaint(id) {
  return await axiosClient.delete(`/complaints/${id}`);
}

/**
 * Fetch maintenance analytics and statistics
 */
export async function getComplaintStatistics() {
  return await axiosClient.get('/complaints/statistics');
}
