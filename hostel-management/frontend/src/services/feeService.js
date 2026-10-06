import axiosClient from '../api/axiosClient';

/**
 * Fetch all active fee types
 */
export async function getFeeTypes() {
  return await axiosClient.get('/fees/types');
}

/**
 * Create a new fee type (ADMIN, ACCOUNTANT)
 */
export async function createFeeType(data) {
  return await axiosClient.post('/fees/types', data);
}

/**
 * Update an existing fee type (ADMIN, ACCOUNTANT)
 */
export async function updateFeeType(id, data) {
  return await axiosClient.put(`/fees/types/${id}`, data);
}

/**
 * Fetch paginated student fee bills with search & filters
 * @param {Object} params - { page, limit, search, studentId, feeTypeId, status, academicYear, dueBefore, dueAfter }
 */
export async function getStudentFees(params = {}) {
  return await axiosClient.get('/fees', { params });
}

/**
 * Fetch a single fee bill by ID including payment history
 */
export async function getStudentFeeById(id) {
  return await axiosClient.get(`/fees/${id}`);
}

/**
 * Create a new student fee bill
 * @param {Object} feeData - { studentId, feeTypeId, academicYear, termName, amountDue, discount, dueDate, billNumber }
 */
export async function createStudentFee(feeData) {
  return await axiosClient.post('/fees', feeData);
}

/**
 * Update a student fee bill (dates, discount, term, etc.)
 */
export async function updateStudentFee(id, updateData) {
  return await axiosClient.put(`/fees/${id}`, updateData);
}

/**
 * Fetch financial summary for a student
 */
export async function getStudentFeeSummary(studentId) {
  return await axiosClient.get(`/fees/student/${studentId}/summary`);
}
