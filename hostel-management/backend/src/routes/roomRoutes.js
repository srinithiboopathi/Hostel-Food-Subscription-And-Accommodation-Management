const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');
const router = express.Router();

const roomController = require('../controllers/roomController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// GET /api/rooms - List all rooms (Authenticated users can view)
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  roomController.getAllRooms
);

// GET /api/rooms/:id - Get room by ID with residents list
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  [
    param('id').isInt({ min: 1 }).withMessage('Room ID must be a positive integer'),
    validate,
  ],
  roomController.getRoomById
);

// POST /api/rooms - Create new room (ADMIN and WARDEN)
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    body('hostelId').notEmpty().withMessage('Hostel is required').isInt({ min: 1 }).withMessage('Invalid hostel ID'),
    body('roomNumber').trim().notEmpty().withMessage('Room number is required'),
    body('floor').optional().isInt({ min: 0 }).withMessage('Floor must be 0 or greater'),
    body('roomType').optional().isIn(['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_BED', 'DORM']).withMessage('Invalid room type'),
    body('capacity').notEmpty().withMessage('Capacity is required').isInt({ min: 1, max: 20 }).withMessage('Capacity must be between 1 and 20'),
    body('baseRent').optional().isFloat({ min: 0 }).withMessage('Base rent must be a non-negative number'),
    body('status').optional().isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']).withMessage('Invalid room status'),
    validate,
  ],
  roomController.createRoom
);

// PUT /api/rooms/:id - Update room (ADMIN and WARDEN)
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Room ID must be a positive integer'),
    body('hostelId').optional().isInt({ min: 1 }).withMessage('Invalid hostel ID'),
    body('floor').optional().isInt({ min: 0 }).withMessage('Floor must be 0 or greater'),
    body('roomType').optional().isIn(['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_BED', 'DORM']).withMessage('Invalid room type'),
    body('capacity').optional().isInt({ min: 1, max: 20 }).withMessage('Capacity must be between 1 and 20'),
    body('baseRent').optional().isFloat({ min: 0 }).withMessage('Base rent must be a non-negative number'),
    body('status').optional().isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']).withMessage('Invalid room status'),
    validate,
  ],
  roomController.updateRoom
);

// DELETE /api/rooms/:id - Delete room (ADMIN only)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Room ID must be a positive integer'),
    validate,
  ],
  roomController.deleteRoom
);

module.exports = router;
