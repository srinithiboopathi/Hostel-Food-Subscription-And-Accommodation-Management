const leaveService = require('../services/leaveService');
const { query } = require('../config/database');

/**
 * Helper to get student record from authenticated user
 */
async function getStudentByUserId(userId) {
  const [rows] = await query('SELECT * FROM students WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

/**
 * GET /api/leaves - All leaves (Staff) or own leaves (Student)
 */
async function getLeaves(req, res, next) {
  try {
    let studentId = req.query.studentId;

    if (req.user.role === 'STUDENT') {
      const student = await getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }
      studentId = student.id;
    }

    const result = await leaveService.getAllLeaves({
      ...req.query,
      studentId,
    });

    res.status(200).json({
      success: true,
      message: 'Leave requests retrieved successfully',
      data: result.leaves,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leaves/my - Student's own leave requests
 */
async function getMyLeaves(req, res, next) {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const result = await leaveService.getAllLeaves({
      ...req.query,
      studentId: student.id,
    });

    res.status(200).json({
      success: true,
      message: 'My leave requests retrieved successfully',
      data: result.leaves,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leaves/statistics - Aggregate telemetry & counts
 */
async function getStatistics(req, res, next) {
  try {
    const stats = await leaveService.getLeaveStatistics();
    res.status(200).json({
      success: true,
      message: 'Leave statistics retrieved successfully',
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leaves/:id - Specific leave request details
 */
async function getLeaveById(req, res, next) {
  try {
    const leave = await leaveService.getLeaveById(req.params.id);

    // If student, ensure ownership
    if (req.user.role === 'STUDENT') {
      const student = await getStudentByUserId(req.user.id);
      if (!student || leave.student_id !== student.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own leave requests.',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Leave request details retrieved successfully',
      data: leave,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/leaves - Submit a new leave request
 */
async function createLeave(req, res, next) {
  try {
    let studentId = req.body.studentId;

    if (req.user.role === 'STUDENT') {
      const student = await getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }
      studentId = student.id;
    } else {
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'studentId is required when creating leave on behalf of a student.',
        });
      }
    }

    const newLeave = await leaveService.createLeave({
      ...req.body,
      studentId,
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      data: newLeave,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/leaves/:id - Update leave status (Approve/Reject/Return/Cancel)
 */
async function updateLeaveStatus(req, res, next) {
  try {
    const { status, reviewRemarks, actualReturnTime } = req.body;

    // Students can only CANCEL their own pending leaves
    if (req.user.role === 'STUDENT') {
      const student = await getStudentByUserId(req.user.id);
      const leave = await leaveService.getLeaveById(req.params.id);

      if (!student || leave.student_id !== student.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot modify this leave request.',
        });
      }

      if (status !== 'CANCELLED') {
        return res.status(403).json({
          success: false,
          message: 'Students can only cancel their own pending leave requests.',
        });
      }

      if (leave.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Only pending leave requests can be cancelled.',
        });
      }
    }

    const updated = await leaveService.updateLeaveStatus(req.params.id, {
      status,
      reviewRemarks,
      reviewerId: req.user.id,
      actualReturnTime,
    });

    res.status(200).json({
      success: true,
      message: `Leave request status updated to ${status}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/leaves/:id - Remove leave record (Admin or student pending)
 */
async function deleteLeave(req, res, next) {
  try {
    const leave = await leaveService.getLeaveById(req.params.id);

    if (req.user.role === 'STUDENT') {
      const student = await getStudentByUserId(req.user.id);
      if (!student || leave.student_id !== student.id || leave.status !== 'PENDING') {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own pending leave requests.',
        });
      }
    } else if (!['ADMIN', 'WARDEN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient privileges to delete leave requests.',
      });
    }

    const result = await leaveService.deleteLeave(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLeaves,
  getMyLeaves,
  getStatistics,
  getLeaveById,
  createLeave,
  updateLeaveStatus,
  deleteLeave,
};
