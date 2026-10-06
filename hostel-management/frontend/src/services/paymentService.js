import axiosClient from '../api/axiosClient';

/**
 * Fetch paginated payment records with search & filters
 * @param {Object} params - { page, limit, search, studentId, feeId, paymentMethod, dateFrom, dateTo }
 */
export async function getAllPayments(params = {}) {
  return await axiosClient.get('/payments', { params });
}

/**
 * Fetch a single payment receipt by ID
 */
export async function getPaymentById(id) {
  return await axiosClient.get(`/payments/${id}`);
}

/**
 * Record a payment via MySQL transaction
 * @param {Object} paymentData - { studentFeeId, amount, paymentMethod, transactionId, paymentDate, notes }
 */
export async function recordPayment(paymentData) {
  return await axiosClient.post('/payments', paymentData);
}

/**
 * Fetch aggregated financial analytics and charts data
 */
export async function getFinancialStatistics() {
  return await axiosClient.get('/payments/statistics');
}
