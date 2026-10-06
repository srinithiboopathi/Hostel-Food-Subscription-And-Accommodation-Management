import axiosClient from '../api/axiosClient';

/**
 * Fetch paginated meal attendance logs with filters
 * @param {Object} params - { page, limit, date, mealTypeId, status, studentId, search, hostelId }
 */
export async function getMealAttendance(params = {}) {
  return await axiosClient.get('/meals/attendance', { params });
}

/**
 * Record or upsert student meal attendance check-in
 * @param {Object} attendanceData - { studentId, mealTypeId, mealDate, status, foodMenuId, remarks }
 */
export async function recordAttendance(attendanceData) {
  return await axiosClient.post('/meals/attendance', attendanceData);
}

/**
 * Update attendance record
 * @param {number|string} id 
 * @param {Object} updateData - { status, remarks }
 */
export async function updateAttendance(id, updateData) {
  return await axiosClient.put(`/meals/attendance/${id}`, updateData);
}

/**
 * Get today's attendance summary by meal type
 * @param {string} date - Optional YYYY-MM-DD
 */
export async function getTodayMealAttendance(date = '') {
  return await axiosClient.get('/meals/today', { params: date ? { date } : {} });
}

/**
 * Get meal consumption statistics & daily trends from MySQL
 * @param {Object} params - { date, startDate, endDate }
 */
export async function getMealStatistics(params = {}) {
  return await axiosClient.get('/meals/statistics', { params });
}

/**
 * Get student personal meal history
 * @param {Object} params - { page, limit, month, year }
 */
export async function getStudentMealHistory(params = {}) {
  return await axiosClient.get('/meals/my-history', { params });
}
