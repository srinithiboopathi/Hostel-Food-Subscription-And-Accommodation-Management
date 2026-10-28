const authService = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Handle User Login
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, identifier, rollNumber, password } = req.body;
    const loginIdentifier = identifier || email || rollNumber;

    if (!loginIdentifier || !password) {
      return sendError(res, 'Email/Roll Number and password are required', 400);
    }

    const result = await authService.loginUser(loginIdentifier, password, [
      'ADMIN',
      'WARDEN',
      'MESS_MANAGER',
      'ACCOUNTANT',
    ]);
    return sendSuccess(res, result, 'Login successful', 200);
  } catch (error) {
    next(error);
  }
}

async function studentLogin(req, res, next) {
  try {
    const { identifier, email, rollNumber, password } = req.body;
    const loginIdentifier = identifier || email || rollNumber;

    if (!loginIdentifier || !password) {
      return sendError(res, 'Student ID or email and password are required', 400);
    }

    const result = await authService.loginUser(loginIdentifier, password, 'STUDENT');
    return sendSuccess(res, result, 'Student login successful', 200);
  } catch (error) {
    next(error);
  }
}

async function staffLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Staff email and password are required', 400);
    }

    const result = await authService.loginUser(email, password, [
      'ADMIN',
      'WARDEN',
      'MESS_MANAGER',
      'ACCOUNTANT',
    ]);
    return sendSuccess(res, result, 'Staff login successful', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Register a new student account
 * POST /api/auth/register-student
 */
async function registerStudent(req, res, next) {
  try {
    const result = await authService.registerStudent(req.body);
    return sendSuccess(res, result, 'Student registered successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Get Authenticated User Profile
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await authService.getUserProfile(userId);
    return sendSuccess(res, profile, 'Profile retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  staffLogin,
  studentLogin,
  registerStudent,
  getMe,
};
