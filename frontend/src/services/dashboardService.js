import axiosClient from '../api/axiosClient';

/**
 * Fetch Admin Dashboard statistics
 */
export async function getAdminDashboard() {
  return await axiosClient.get('/dashboard/admin');
}

/**
 * Fetch Warden Dashboard statistics
 */
export async function getWardenDashboard() {
  return await axiosClient.get('/dashboard/warden');
}

/**
 * Fetch Mess Manager Dashboard statistics
 */
export async function getMessDashboard() {
  return await axiosClient.get('/dashboard/mess');
}

/**
 * Fetch Accountant Dashboard statistics
 */
export async function getAccountantDashboard() {
  return await axiosClient.get('/dashboard/accountant');
}

/**
 * Fetch Student Dashboard statistics (for logged-in student)
 */
export async function getStudentDashboard() {
  return await axiosClient.get('/dashboard/student');
}

/**
 * Fetch quick summary statistics based on authenticated role
 */
export async function getDashboardSummary() {
  return await axiosClient.get('/dashboard/summary');
}
