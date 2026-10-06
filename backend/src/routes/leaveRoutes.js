const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Statistics (Before /:id)
router.get(
  '/statistics',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'),
  leaveController.getStatistics
);

// Student own leaves
router.get(
  '/my',
  authenticate,
  authorizeRoles('STUDENT', 'ADMIN', 'WARDEN'),
  leaveController.getMyLeaves
);

// List leaves
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  leaveController.getLeaves
);

// Single leave details
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  leaveController.getLeaveById
);

// Create leave
router.post(
  '/',
  authenticate,
  authorizeRoles('STUDENT', 'ADMIN', 'WARDEN'),
  leaveController.createLeave
);

// Update leave status (Approve / Reject / Return / Cancel)
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'STUDENT'),
  leaveController.updateLeaveStatus
);

// Delete leave
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'STUDENT'),
  leaveController.deleteLeave
);

module.exports = router;
