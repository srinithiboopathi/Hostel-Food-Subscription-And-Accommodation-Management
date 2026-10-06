const visitorService = require('../services/visitorService');
const { query } = require('../config/database');

/**
 * Helper to get student record from authenticated user
 */
async function getStudentByUserId(userId) {
  const [rows] = await query('SELECT * FROM students WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

/**
 * GET /api/visitors - Get all visitors (Staff) or own visitors (Student)
 */
async function getVisitors(req, res, next) {
  try {
    let studentId = req.query.studentId;

    if (req.user.role === 'STUDENT') {
      const student = await getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }
      studentId = student.id;
    }

    const result = await visitorService.getAllVisitors({
      ...req.query,
      studentId,
    });

    res.status(200).json({
      success: true,
      message: 'Visitors retrieved successfully',
      data: result.visitors,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/visitors/today - Get today's active visitors
 */
async function getToday(req, res, next) {
  try {
    const result = await visitorService.getTodayVisitors();
    res.status(200).json({
      success: true,
      message: "Today's visitors retrieved successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/visitors/statistics - Visitor analytics & telemetry
 */
async function getStatistics(req, res, next) {
  try {
    const stats = await visitorService.getVisitorStatistics();
    res.status(200).json({
      success: true,
      message: 'Visitor statistics retrieved successfully',
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/visitors/:id - Get specific visitor details
 */
async function getVisitorById(req, res, next) {
  try {
    const visitor = await visitorService.getVisitorById(req.params.id);

    if (req.user.role === 'STUDENT') {
      const student = await getStudentByUserId(req.user.id);
      if (!student || visitor.student_id !== student.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view visitors registered for you.',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Visitor details retrieved successfully',
      data: visitor,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/visitors - Register a new visitor
 */
async function registerVisitor(req, res, next) {
  try {
    const newVisitor = await visitorService.registerVisitor({
      ...req.body,
      approvedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Visitor registered successfully.',
      data: newVisitor,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/visitors/:id/checkout - Quick checkout endpoint or via PUT /api/visitors/:id
 */
async function checkoutVisitor(req, res, next) {
  try {
    const checkedOut = await visitorService.checkoutVisitor(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Visitor checked out successfully.',
      data: checkedOut,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/visitors/:id - General update (or check-out)
 */
async function updateVisitor(req, res, next) {
  try {
    const { status, remarks, checkOutTime } = req.body;

    // If changing to CHECKED_OUT, use checkout helper
    if (status === 'CHECKED_OUT') {
      const checkedOut = await visitorService.checkoutVisitor(req.params.id, {
        remarks,
        checkOutTime,
      });
      return res.status(200).json({
        success: true,
        message: 'Visitor checked out successfully.',
        data: checkedOut,
      });
    }

    const updated = await visitorService.updateVisitor(req.params.id, {
      status,
      remarks,
      approvedBy: req.user.id,
      checkOutTime,
    });

    res.status(200).json({
      success: true,
      message: 'Visitor record updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/visitors/:id - Remove visitor log (Admin only)
 */
async function deleteVisitor(req, res, next) {
  try {
    const result = await visitorService.deleteVisitor(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Visitor record deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVisitors,
  getToday,
  getStatistics,
  getVisitorById,
  registerVisitor,
  checkoutVisitor,
  updateVisitor,
  deleteVisitor,
};
