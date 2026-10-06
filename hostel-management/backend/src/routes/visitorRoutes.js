const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Statistics & Today (Before /:id)
router.get(
  '/statistics',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'),
  visitorController.getStatistics
);

router.get(
  '/today',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'),
  visitorController.getToday
);

// All visitors
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  visitorController.getVisitors
);

// Single visitor details
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  visitorController.getVisitorById
);

// Register visitor
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  visitorController.registerVisitor
);

// Checkout visitor (Dedicated convenience route)
router.put(
  '/:id/checkout',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  visitorController.checkoutVisitor
);

// Update visitor record
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  visitorController.updateVisitor
);

// Delete visitor record
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  visitorController.deleteVisitor
);

module.exports = router;
