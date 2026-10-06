const authService = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Handle User Login
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const result = await authService.loginUser(email, password);
    return sendSuccess(res, result, 'Login successful', 200);
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
  getMe,
};
