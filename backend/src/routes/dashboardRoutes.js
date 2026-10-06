const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * GET /api/dashboard/admin
 * Role required: ADMIN
 */
router.get(
  '/admin',
  authenticate,
  authorizeRoles('ADMIN'),
  dashboardController.getAdminDashboard
);

/**
 * GET /api/dashboard/warden
 * Role required: ADMIN or WARDEN
 */
router.get(
  '/warden',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  dashboardController.getWardenDashboard
);

/**
 * GET /api/dashboard/mess
 * Role required: ADMIN or MESS_MANAGER
 */
router.get(
  '/mess',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  dashboardController.getMessDashboard
);

/**
 * GET /api/dashboard/accountant
 * Role required: ADMIN or ACCOUNTANT
 */
router.get(
  '/accountant',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  dashboardController.getAccountantDashboard
);

/**
 * GET /api/dashboard/student
 * Role required: STUDENT
 * Student ID is always resolved from req.user.id
 */
router.get(
  '/student',
  authenticate,
  authorizeRoles('STUDENT'),
  dashboardController.getStudentDashboard
);

/**
 * GET /api/dashboard/summary
 * Accessible to any authenticated role, returns summary tailored to req.user.role
 */
router.get(
  '/summary',
  authenticate,
  dashboardController.getDashboardSummary
);

module.exports = router;
