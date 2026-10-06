const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');
const router = express.Router();

const hostelController = require('../controllers/hostelController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// GET /api/hostels - List all hostels (All authenticated roles can view)
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  hostelController.getAllHostels
);

// GET /api/hostels/:id - Get hostel details & rooms
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  [
    param('id').isInt({ min: 1 }).withMessage('Hostel ID must be a positive integer'),
    validate,
  ],
  hostelController.getHostelById
);

// POST /api/hostels - Create new hostel (ADMIN only)
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Hostel name is required'),
    body('code').trim().notEmpty().withMessage('Hostel code is required'),
    body('type').optional().isIn(['BOYS', 'GIRLS', 'COED']).withMessage('Type must be BOYS, GIRLS, or COED'),
    body('totalFloors').optional().isInt({ min: 1 }).withMessage('Total floors must be at least 1'),
    body('wardenId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Warden ID must be a positive integer'),
    body('status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).withMessage('Status must be ACTIVE, MAINTENANCE, or INACTIVE'),
    validate,
  ],
  hostelController.createHostel
);

// PUT /api/hostels/:id - Update hostel (ADMIN and WARDEN)
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Hostel ID must be a positive integer'),
    body('type').optional().isIn(['BOYS', 'GIRLS', 'COED']).withMessage('Type must be BOYS, GIRLS, or COED'),
    body('totalFloors').optional().isInt({ min: 1 }).withMessage('Total floors must be at least 1'),
    body('wardenId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Warden ID must be a positive integer'),
    body('status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).withMessage('Status must be ACTIVE, MAINTENANCE, or INACTIVE'),
    validate,
  ],
  hostelController.updateHostel
);

// DELETE /api/hostels/:id - Delete hostel (ADMIN only)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Hostel ID must be a positive integer'),
    validate,
  ],
  hostelController.deleteHostel
);

module.exports = router;
