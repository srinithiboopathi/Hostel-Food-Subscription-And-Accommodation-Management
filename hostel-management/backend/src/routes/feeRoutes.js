const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Fee Types endpoints
router.get(
  '/types',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  feeController.getFeeTypes
);

router.post(
  '/types',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  feeController.createFeeType
);

router.put(
  '/types/:id',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  feeController.updateFeeType
);

// Student summary endpoint
router.get(
  '/student/:studentId/summary',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  feeController.getStudentFeeSummary
);

// General student fee bills
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  feeController.getAllFees
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  feeController.getFeeById
);

router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  feeController.createFee
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  feeController.updateFee
);

module.exports = router;
