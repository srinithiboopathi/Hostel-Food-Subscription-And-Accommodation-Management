const studentService = require('../services/studentService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');

/**
 * GET /api/students
 */
async function getAllStudents(req, res, next) {
  try {
    const { page, limit, search, department, year, status, hostelId } = req.query;

    const result = await studentService.getAllStudents({
      page,
      limit,
      search,
      department,
      year,
      status,
      hostelId,
    });

    return res.status(200).json({
      success: true,
      data: result.students,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/students/:id
 */
async function getStudentById(req, res, next) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return sendError(res, 'Invalid student ID format', 400);
    }

    // Role verification: Student can only view their own record
    if (req.user.role === 'STUDENT' && req.user.studentId !== studentId) {
      return sendError(res, 'Access denied: Students may only view their own profile', 403);
    }

    const student = await studentService.getStudentById(studentId);
    return sendSuccess(res, student, 'Student details retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/students
 */
async function createStudent(req, res, next) {
  try {
    const newStudent = await studentService.createStudent(req.body);
    return sendSuccess(res, newStudent, 'Student profile created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/students/:id
 */
async function updateStudent(req, res, next) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return sendError(res, 'Invalid student ID format', 400);
    }

    const updatedStudent = await studentService.updateStudent(studentId, req.body);
    return sendSuccess(res, updatedStudent, 'Student profile updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/students/:id (Deactivate / update status)
 */
async function deleteStudent(req, res, next) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return sendError(res, 'Invalid student ID format', 400);
    }

    const status = req.body?.status || req.query?.status || 'VACATED';
    const result = await studentService.deactivateStudent(studentId, status);
    return sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};
