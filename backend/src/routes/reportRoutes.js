const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * 1. Students Report
 * Roles: ADMIN, WARDEN, STUDENT (isolated)
 */
router.get(
  '/students',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'STUDENT'),
  reportController.getStudentReport
);

/**
 * 2. Room & Occupancy Report
 * Roles: ADMIN, WARDEN, STUDENT
 */
router.get(
  '/rooms',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'STUDENT'),
  reportController.getRoomReport
);

/**
 * 3. Room Allocation Report
 * Roles: ADMIN, WARDEN, STUDENT (isolated)
 */
router.get(
  '/allocations',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'STUDENT'),
  reportController.getAllocationReport
);

/**
 * 4. Food & Meal Attendance Report
 * Roles: ADMIN, MESS_MANAGER, STUDENT (isolated)
 */
router.get(
  '/meals',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'STUDENT'),
  reportController.getMealReport
);

/**
 * 5. Food Menu Report
 * Roles: ADMIN, MESS_MANAGER, STUDENT, WARDEN, ACCOUNTANT
 */
router.get(
  '/menu',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'STUDENT', 'WARDEN', 'ACCOUNTANT'),
  reportController.getMenuReport
);

/**
 * 6. Fees Report
 * Roles: ADMIN, ACCOUNTANT, STUDENT (isolated)
 */
router.get(
  '/fees',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'STUDENT'),
  reportController.getFeeReport
);

/**
 * 7. Payment Report
 * Roles: ADMIN, ACCOUNTANT, STUDENT (isolated)
 */
router.get(
  '/payments',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'STUDENT'),
  reportController.getPaymentReport
);

/**
 * 8. Complaint Report
 * Roles: ADMIN, WARDEN, MESS_MANAGER, STUDENT (isolated)
 */
router.get(
  '/complaints',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'STUDENT'),
  reportController.getComplaintReport
);

/**
 * 9. Leave Report
 * Roles: ADMIN, WARDEN, STUDENT (isolated)
 */
router.get(
  '/leaves',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'STUDENT'),
  reportController.getLeaveReport
);

/**
 * 10. Visitor Report
 * Roles: ADMIN, WARDEN, STUDENT (isolated)
 */
router.get(
  '/visitors',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'STUDENT'),
  reportController.getVisitorReport
);

/**
 * 11. Notification Report
 * Roles: ADMIN, WARDEN, MESS_MANAGER, ACCOUNTANT, STUDENT
 */
router.get(
  '/notifications',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  reportController.getNotificationReport
);

/**
 * 12. Summary Consolidated Report
 * Roles: ADMIN, WARDEN, ACCOUNTANT
 */
router.get(
  '/summary',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'ACCOUNTANT'),
  reportController.getSummaryReport
);

module.exports = router;
