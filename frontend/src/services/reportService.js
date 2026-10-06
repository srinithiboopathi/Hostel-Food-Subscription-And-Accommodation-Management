import axiosClient from '../api/axiosClient';

/**
 * 1. Student Report
 */
export async function getStudentReport(params = {}) {
  return await axiosClient.get('/reports/students', { params });
}

/**
 * 2. Room & Occupancy Report
 */
export async function getRoomReport(params = {}) {
  return await axiosClient.get('/reports/rooms', { params });
}

/**
 * 3. Room Allocation Report
 */
export async function getAllocationReport(params = {}) {
  return await axiosClient.get('/reports/allocations', { params });
}

/**
 * 4. Meal Attendance Report
 */
export async function getMealReport(params = {}) {
  return await axiosClient.get('/reports/meals', { params });
}

/**
 * 5. Food Menu Report
 */
export async function getMenuReport(params = {}) {
  return await axiosClient.get('/reports/menu', { params });
}

/**
 * 6. Fees Report
 */
export async function getFeeReport(params = {}) {
  return await axiosClient.get('/reports/fees', { params });
}

/**
 * 7. Payment Report
 */
export async function getPaymentReport(params = {}) {
  return await axiosClient.get('/reports/payments', { params });
}

/**
 * 8. Complaint Report
 */
export async function getComplaintReport(params = {}) {
  return await axiosClient.get('/reports/complaints', { params });
}

/**
 * 9. Leave Report
 */
export async function getLeaveReport(params = {}) {
  return await axiosClient.get('/reports/leaves', { params });
}

/**
 * 10. Visitor Report
 */
export async function getVisitorReport(params = {}) {
  return await axiosClient.get('/reports/visitors', { params });
}

/**
 * 11. Notification Report
 */
export async function getNotificationReport(params = {}) {
  return await axiosClient.get('/reports/notifications', { params });
}

/**
 * 12. Consolidated Summary Report
 */
export async function getReportSummary() {
  return await axiosClient.get('/reports/summary');
}

/**
 * CSV Export Trigger Helper
 */
export async function downloadReportCsv(endpoint, params = {}, defaultFilename = 'report') {
  try {
    const res = await axiosClient.get(endpoint, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([res]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${defaultFilename}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to download CSV:', error);
    throw error;
  }
}
