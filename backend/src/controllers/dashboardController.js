const dashboardService = require('../services/dashboardService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * GET /api/dashboard/admin
 */
async function getAdminDashboard(req, res) {
  try {
    const stats = await dashboardService.getAdminDashboard(req.user.id);
    return sendSuccess(res, stats, 'Admin dashboard statistics fetched successfully');
  } catch (error) {
    console.error('[DashboardController.getAdminDashboard Error]:', error);
    return sendError(res, error.message || 'Failed to load admin dashboard', 500);
  }
}

/**
 * GET /api/dashboard/warden
 */
async function getWardenDashboard(req, res) {
  try {
    const stats = await dashboardService.getWardenDashboard(req.user.id);
    return sendSuccess(res, stats, 'Warden dashboard statistics fetched successfully');
  } catch (error) {
    console.error('[DashboardController.getWardenDashboard Error]:', error);
    return sendError(res, error.message || 'Failed to load warden dashboard', 500);
  }
}

/**
 * GET /api/dashboard/mess
 */
async function getMessDashboard(req, res) {
  try {
    const stats = await dashboardService.getMessDashboard(req.user.id);
    return sendSuccess(res, stats, 'Mess manager dashboard statistics fetched successfully');
  } catch (error) {
    console.error('[DashboardController.getMessDashboard Error]:', error);
    return sendError(res, error.message || 'Failed to load mess dashboard', 500);
  }
}

/**
 * GET /api/dashboard/accountant
 */
async function getAccountantDashboard(req, res) {
  try {
    const stats = await dashboardService.getAccountantDashboard(req.user.id);
    return sendSuccess(res, stats, 'Accountant dashboard statistics fetched successfully');
  } catch (error) {
    console.error('[DashboardController.getAccountantDashboard Error]:', error);
    return sendError(res, error.message || 'Failed to load accountant dashboard', 500);
  }
}

/**
 * GET /api/dashboard/student
 * Student ID is always resolved from authenticated user (req.user.id)
 */
async function getStudentDashboard(req, res) {
  try {
    const stats = await dashboardService.getStudentDashboard(req.user.id);
    return sendSuccess(res, stats, 'Student dashboard statistics fetched successfully');
  } catch (error) {
    console.error('[DashboardController.getStudentDashboard Error]:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    return sendError(res, error.message || 'Failed to load student dashboard', statusCode);
  }
}

/**
 * GET /api/dashboard/summary
 */
async function getDashboardSummary(req, res) {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user);
    return sendSuccess(res, summary, 'Dashboard summary fetched successfully');
  } catch (error) {
    console.error('[DashboardController.getDashboardSummary Error]:', error);
    return sendError(res, error.message || 'Failed to load dashboard summary', 500);
  }
}

module.exports = {
  getAdminDashboard,
  getWardenDashboard,
  getMessDashboard,
  getAccountantDashboard,
  getStudentDashboard,
  getDashboardSummary,
};
