const paymentService = require('../services/paymentService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { query } = require('../config/database');

/**
 * Helper to get student_id for a logged in student user
 */
async function resolveStudentId(user) {
  if (!user) return null;
  if (user.studentId) return user.studentId;
  const [rows] = await query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [user.id]);
  return rows[0]?.id || null;
}

/**
 * GET /api/payments
 */
async function getAllPayments(req, res) {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      studentId = '',
      feeId = '',
      paymentMethod = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    let targetStudentId = studentId;

    // Strict Student role isolation
    if (req.user && req.user.role === 'STUDENT') {
      const selfStudentId = await resolveStudentId(req.user);
      if (!selfStudentId) {
        return sendError(res, 'Student profile not found', 404);
      }
      targetStudentId = selfStudentId;
    }

    const result = await paymentService.getAllPayments({
      page,
      limit,
      search,
      studentId: targetStudentId,
      feeId,
      paymentMethod,
      dateFrom,
      dateTo,
    });

    return sendPaginated(
      res,
      result.payments,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      'Payments fetched successfully'
    );
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * GET /api/payments/:id
 */
async function getPaymentById(req, res) {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);

    // If Student role, verify ownership
    if (req.user && req.user.role === 'STUDENT') {
      const selfStudentId = await resolveStudentId(req.user);
      if (payment.student_id !== selfStudentId) {
        return sendError(res, 'Forbidden: You do not have permission to view other students payment receipts', 403);
      }
    }

    return sendSuccess(res, payment, 'Payment receipt retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * POST /api/payments
 */
async function recordPayment(req, res) {
  try {
    const targetFeeId = req.body.studentFeeId ?? req.body.student_fee_id;
    const amount = req.body.amount;
    const paymentMethod = req.body.paymentMethod ?? req.body.payment_method;
    const transactionId = req.body.transactionId ?? req.body.transaction_id;
    const paymentDate = req.body.paymentDate ?? req.body.payment_date;
    const notes = req.body.notes ?? req.body.remarks;

    if (!targetFeeId || amount === undefined) {
      return sendError(res, 'Missing required fields: studentFeeId and amount are required', 400);
    }

    const recorded = await paymentService.recordPayment({
      studentFeeId: targetFeeId,
      amount,
      paymentMethod: paymentMethod || 'UPI',
      transactionId,
      paymentDate,
      collectedBy: req.user.id,
      notes,
    });

    return sendSuccess(res, recorded, 'Payment recorded successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * GET /api/payments/statistics
 */
async function getFinancialStatistics(req, res) {
  try {
    const stats = await paymentService.getFinancialStatistics();
    return sendSuccess(res, stats, 'Financial statistics retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

module.exports = {
  getAllPayments,
  getPaymentById,
  recordPayment,
  getFinancialStatistics,
};
