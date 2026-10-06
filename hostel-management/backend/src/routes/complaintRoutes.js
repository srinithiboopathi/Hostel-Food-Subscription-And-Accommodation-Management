const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Statistics endpoint (must be before /:id)
router.get(
  '/statistics',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'),
  complaintController.getComplaintStatistics
);

// Student personal complaints endpoint
router.get(
  '/my',
  authenticate,
  authorizeRoles('STUDENT', 'ADMIN'),
  complaintController.getMyComplaints
);

// General list
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  complaintController.getAllComplaints
);

// Single complaint by ID
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  complaintController.getComplaintById
);

// Create complaint
router.post(
  '/',
  authenticate,
  authorizeRoles('STUDENT', 'ADMIN', 'WARDEN'),
  complaintController.createComplaint
);

// Update/assign complaint
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER'),
  complaintController.updateComplaint
);

// Delete complaint (ADMIN only)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  complaintController.deleteComplaint
);

module.exports = router;
