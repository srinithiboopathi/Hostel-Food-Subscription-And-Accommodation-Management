const mealService = require('../services/mealService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');

/**
 * GET /api/meals/attendance
 */
async function getMealAttendance(req, res, next) {
  try {
    const { page, limit, date, mealTypeId, status, studentId, search, hostelId } = req.query;

    let targetStudentId = studentId;
    if (req.user?.role === 'STUDENT') {
      targetStudentId = req.user.studentId;
    }

    const result = await mealService.getMealAttendance({
      page,
      limit,
      date,
      mealTypeId,
      status,
      studentId: targetStudentId,
      search,
      hostelId,
    });

    return res.status(200).json({
      success: true,
      data: result.attendance,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/meals/attendance
 */
async function recordAttendance(req, res, next) {
  try {
    const {
      studentId,
      student_id,
      mealTypeId,
      meal_type_id,
      mealDate,
      meal_date,
      status,
      foodMenuId,
      food_menu_id,
      remarks,
    } = req.body;

    const targetStudentId = studentId || student_id;
    const targetMealTypeId = mealTypeId || meal_type_id;
    const targetMealDate = mealDate || meal_date || new Date().toISOString().split('T')[0];

    if (!targetStudentId) {
      return sendError(res, 'Student ID is required', 400);
    }
    if (!targetMealTypeId) {
      return sendError(res, 'Meal type ID is required', 400);
    }

    const attendance = await mealService.recordAttendance({
      studentId: parseInt(targetStudentId, 10),
      mealTypeId: parseInt(targetMealTypeId, 10),
      mealDate: targetMealDate,
      status: status || 'PRESENT',
      foodMenuId: foodMenuId || food_menu_id || null,
      remarks,
      markedBy: req.user?.id || null,
    });

    return sendSuccess(res, attendance, 'Meal attendance recorded successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/meals/attendance/:id
 */
async function updateAttendance(req, res, next) {
  try {
    const attendanceId = parseInt(req.params.id, 10);
    if (isNaN(attendanceId)) {
      return sendError(res, 'Invalid attendance ID format', 400);
    }

    const { status, remarks } = req.body;
    const updated = await mealService.updateAttendance(attendanceId, {
      status,
      remarks,
      markedBy: req.user?.id || null,
    });

    return sendSuccess(res, updated, 'Meal attendance updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/meals/today
 */
async function getTodayMealAttendance(req, res, next) {
  try {
    const { date } = req.query;
    const summary = await mealService.getTodayMealAttendance(date || null);
    return sendSuccess(res, summary, "Today's meal attendance summary retrieved successfully");
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/meals/statistics
 */
async function getMealStatistics(req, res, next) {
  try {
    const { date, startDate, endDate } = req.query;
    const statistics = await mealService.getMealStatistics({ date, startDate, endDate });
    return sendSuccess(res, statistics, 'Meal statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/meals/my-history
 */
async function getStudentMealHistory(req, res, next) {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      return sendError(res, 'Student profile not linked to this user account', 400);
    }

    const { page, limit, month, year } = req.query;
    const history = await mealService.getStudentMealHistory(studentId, {
      page,
      limit,
      month,
      year,
    });

    return res.status(200).json({
      success: true,
      data: history.history,
      grouped_by_date: history.grouped_by_date,
      pagination: history.pagination,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMealAttendance,
  recordAttendance,
  updateAttendance,
  getTodayMealAttendance,
  getMealStatistics,
  getStudentMealHistory,
};
