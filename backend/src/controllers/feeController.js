const feeService = require('../services/feeService');
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
 * GET /api/fees/types
 */
async function getFeeTypes(req, res) {
  try {
    const feeTypes = await feeService.getFeeTypes();
    return sendSuccess(res, feeTypes, 'Fee types retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * POST /api/fees/types
 */
async function createFeeType(req, res) {
  try {
    const { name, frequency, description, isActive } = req.body;
    if (!name || name.trim() === '') {
      return sendError(res, 'Fee type name is required', 400);
    }
    const created = await feeService.createFeeType({ name, frequency, description, isActive });
    return sendSuccess(res, created, 'Fee type created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * PUT /api/fees/types/:id
 */
async function updateFeeType(req, res) {
  try {
    const { id } = req.params;
    const updated = await feeService.updateFeeType(id, req.body);
    return sendSuccess(res, updated, 'Fee type updated successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * GET /api/fees
 */
async function getAllFees(req, res) {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      studentId = '',
      feeTypeId = '',
      status = '',
      academicYear = '',
      dueBefore = '',
      dueAfter = '',
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

    const result = await feeService.getAllStudentFees({
      page,
      limit,
      search,
      studentId: targetStudentId,
      feeTypeId,
      status,
      academicYear,
      dueBefore,
      dueAfter,
    });

    return sendPaginated(
      res,
      result.fees,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      'Student fees fetched successfully'
    );
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * GET /api/fees/:id
 */
async function getFeeById(req, res) {
  try {
    const { id } = req.params;
    const fee = await feeService.getStudentFeeById(id);

    // If Student role, ensure they are requesting their own fee
    if (req.user && req.user.role === 'STUDENT') {
      const selfStudentId = await resolveStudentId(req.user);
      if (fee.student_id !== selfStudentId) {
        return sendError(res, 'Forbidden: You do not have permission to view other students fee records', 403);
      }
    }

    return sendSuccess(res, fee, 'Fee bill retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * POST /api/fees
 */
async function createFee(req, res) {
  try {
    const {
      studentId,
      feeTypeId,
      academicYear,
      termName,
      amountDue,
      discount,
      dueDate,
      billNumber,
    } = req.body;

    if (!studentId || !feeTypeId || amountDue === undefined || !dueDate) {
      return sendError(res, 'Missing required fields: studentId, feeTypeId, amountDue, and dueDate are required', 400);
    }

    const createdFee = await feeService.createStudentFee({
      studentId,
      feeTypeId,
      academicYear,
      termName,
      amountDue,
      discount,
      dueDate,
      billNumber,
    });

    return sendSuccess(res, createdFee, 'Fee bill created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * PUT /api/fees/:id
 */
async function updateFee(req, res) {
  try {
    const { id } = req.params;
    const updatedFee = await feeService.updateStudentFee(id, req.body);
    return sendSuccess(res, updatedFee, 'Fee bill updated successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * GET /api/fees/student/:studentId/summary
 */
async function getStudentFeeSummary(req, res) {
  try {
    const { studentId } = req.params;

    // If Student role, ensure they only request their own summary
    if (req.user && req.user.role === 'STUDENT') {
      const selfStudentId = await resolveStudentId(req.user);
      if (parseInt(studentId, 10) !== selfStudentId) {
        return sendError(res, 'Forbidden: You can only access your own fee summary', 403);
      }
    }

    const summary = await feeService.getStudentFeeSummary(studentId);
    return sendSuccess(res, summary, 'Student fee summary retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

module.exports = {
  getFeeTypes,
  createFeeType,
  updateFeeType,
  getAllFees,
  getFeeById,
  createFee,
  updateFee,
  getStudentFeeSummary,
};
