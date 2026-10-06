const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Statistics endpoint (must be before /:id)
router.get(
  '/statistics',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'WARDEN'),
  paymentController.getFinancialStatistics
);

// Get payments list
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'WARDEN', 'STUDENT'),
  paymentController.getAllPayments
);

// Get single payment receipt
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'WARDEN', 'STUDENT'),
  paymentController.getPaymentById
);

// Record payment
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  paymentController.recordPayment
);

module.exports = router;
