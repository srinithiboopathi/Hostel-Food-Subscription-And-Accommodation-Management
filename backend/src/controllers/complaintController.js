const complaintService = require('../services/complaintService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { query } = require('../config/database');

/**
 * Helper to resolve student_id for authenticated student
 */
async function resolveStudentId(user) {
  if (!user) return null;
  if (user.studentId) return user.studentId;
  const [rows] = await query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [user.id]);
  return rows[0]?.id || null;
}

/**
 * GET /api/complaints
 */
async function getAllComplaints(req, res) {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      studentId = '',
      hostelId = '',
      roomId = '',
      category = '',
      status = '',
      priority = '',
      assignedTo = '',
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

    const result = await complaintService.getAllComplaints({
      page,
      limit,
      search,
      studentId: targetStudentId,
      hostelId,
      roomId,
      category,
      status,
      priority,
      assignedTo,
    });

    return sendPaginated(
      res,
      result.complaints,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      'Complaints retrieved successfully'
    );
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * GET /api/complaints/my
 */
async function getMyComplaints(req, res) {
  try {
    const selfStudentId = await resolveStudentId(req.user);
    if (!selfStudentId) {
      return sendError(res, 'Student profile not found', 404);
    }

    const { page = 1, limit = 20, status = '', category = '', search = '' } = req.query;
    const result = await complaintService.getAllComplaints({
      page,
      limit,
      search,
      studentId: selfStudentId,
      status,
      category,
    });

    return sendPaginated(
      res,
      result.complaints,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      'Your complaints retrieved successfully'
    );
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * GET /api/complaints/statistics
 */
async function getComplaintStatistics(req, res) {
  try {
    const stats = await complaintService.getComplaintStatistics();
    return sendSuccess(res, stats, 'Complaint statistics retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * GET /api/complaints/:id
 */
async function getComplaintById(req, res) {
  try {
    const { id } = req.params;
    const complaint = await complaintService.getComplaintById(id);

    // Enforce Student Access Boundary
    if (req.user && req.user.role === 'STUDENT') {
      const selfStudentId = await resolveStudentId(req.user);
      if (complaint.student_id !== selfStudentId) {
        return sendError(
          res,
          'Forbidden: You do not have permission to view other students complaint records',
          403
        );
      }
    }

    return sendSuccess(res, complaint, 'Complaint details retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * POST /api/complaints
 */
async function createComplaint(req, res) {
  try {
    const {
      studentId,
      roomId,
      category,
      title,
      description,
      priority,
    } = req.body;

    let targetStudentId = studentId;

    // If Student is creating, strictly force authenticated student ID
    if (req.user && req.user.role === 'STUDENT') {
      const selfStudentId = await resolveStudentId(req.user);
      if (!selfStudentId) {
        return sendError(res, 'Student profile not found for this user', 404);
      }
      targetStudentId = selfStudentId;
    } else {
      if (!targetStudentId) {
        return sendError(res, 'Student ID is required when raising a complaint', 400);
      }
    }

    if (!title || !description || !category) {
      return sendError(res, 'Title, description, and category are required', 400);
    }

    const created = await complaintService.createComplaint({
      studentId: targetStudentId,
      roomId,
      category,
      title,
      description,
      priority: priority || 'MEDIUM',
      userId: req.user.id,
    });

    return sendSuccess(res, created, 'Complaint registered successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * PUT /api/complaints/:id
 */
async function updateComplaint(req, res) {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo, remarks } = req.body;

    // Students are NOT allowed to update/assign complaints
    if (req.user && req.user.role === 'STUDENT') {
      return sendError(res, 'Forbidden: Students are not authorized to modify complaint statuses or assignments', 403);
    }

    const updated = await complaintService.updateComplaint(id, {
      status,
      priority,
      assignedTo,
      remarks,
      userId: req.user.id,
    });

    return sendSuccess(res, updated, 'Complaint updated successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * DELETE /api/complaints/:id
 */
async function deleteComplaint(req, res) {
  try {
    const { id } = req.params;
    const result = await complaintService.deleteComplaint(id);
    return sendSuccess(res, result, 'Complaint deleted successfully');
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
}

module.exports = {
  getAllComplaints,
  getMyComplaints,
  getComplaintStatistics,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint,
};
