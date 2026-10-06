const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');
const router = express.Router();

const allocationController = require('../controllers/allocationController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// GET /api/allocations/available-rooms - Get only rooms with available capacity
router.get(
  '/available-rooms',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  allocationController.getAvailableRooms
);

// GET /api/allocations - List all room allocations (with filters)
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  allocationController.getAllAllocations
);

// GET /api/allocations/:id - Get allocation by ID
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  [
    param('id').isInt({ min: 1 }).withMessage('Allocation ID must be a positive integer'),
    validate,
  ],
  allocationController.getAllocationById
);

// POST /api/allocations - Allocate student to room (ADMIN and WARDEN only)
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    body('studentId').notEmpty().withMessage('Student ID is required').isInt({ min: 1 }).withMessage('Invalid student ID'),
    body('roomId').notEmpty().withMessage('Room ID is required').isInt({ min: 1 }).withMessage('Invalid room ID'),
    body('academicYear').optional().trim(),
    body('allocatedFrom').optional().isDate().withMessage('Valid allocation start date is required'),
    body('allocatedTo').optional({ nullable: true }).isDate().withMessage('Valid allocation end date is required'),
    body('securityDeposit').optional().isFloat({ min: 0 }).withMessage('Security deposit must be non-negative'),
    body('remarks').optional().trim(),
    validate,
  ],
  allocationController.createAllocation
);

// PUT /api/allocations/:id - Update allocation / Transfer room / Checkout (ADMIN and WARDEN only)
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Allocation ID must be a positive integer'),
    body('roomId').optional().isInt({ min: 1 }).withMessage('Invalid room ID'),
    body('status').optional().isIn(['ACTIVE', 'TRANSFERRED', 'VACATED', 'CANCELLED']).withMessage('Invalid allocation status'),
    body('securityDeposit').optional().isFloat({ min: 0 }).withMessage('Security deposit must be non-negative'),
    validate,
  ],
  allocationController.updateAllocation
);

// DELETE /api/allocations/:id - Cancel allocation (ADMIN and WARDEN)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Allocation ID must be a positive integer'),
    validate,
  ],
  allocationController.deleteAllocation
);

module.exports = router;
