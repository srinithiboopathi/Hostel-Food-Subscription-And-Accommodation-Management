import axiosClient from '../api/axiosClient';

/**
 * Fetch paginated students with search and filter parameters
 */
export async function getStudents(params = {}) {
  return await axiosClient.get('/students', { params });
}

/**
 * Fetch complete student profile by ID
 */
export async function getStudentById(id) {
  return await axiosClient.get(`/students/${id}`);
}

/**
 * Create a new student profile in MySQL
 */
export async function createStudent(studentData) {
  return await axiosClient.post('/students', studentData);
}

/**
 * Update an existing student record
 */
export async function updateStudent(id, studentData) {
  return await axiosClient.put(`/students/${id}`, studentData);
}

/**
 * Deactivate a student
 */
export async function deactivateStudent(id, status = 'VACATED') {
  return await axiosClient.delete(`/students/${id}`, { data: { status } });
}
