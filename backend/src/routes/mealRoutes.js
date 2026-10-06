const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');
const router = express.Router();

const mealController = require('../controllers/mealController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// GET /api/meals/today - Today's attendance summary by meal type
router.get(
  '/today',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  mealController.getTodayMealAttendance
);

// GET /api/meals/statistics - Meal statistics with aggregation & trends
router.get(
  '/statistics',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT'),
  mealController.getMealStatistics
);

// GET /api/meals/my-history - Student's personal meal attendance history
router.get(
  '/my-history',
  authenticate,
  authorizeRoles('STUDENT', 'ADMIN', 'MESS_MANAGER'),
  mealController.getStudentMealHistory
);

// GET /api/meals/attendance - List attendance records with filtering and pagination
router.get(
  '/attendance',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  mealController.getMealAttendance
);

// POST /api/meals/attendance - Mark student meal attendance (ADMIN and MESS_MANAGER only)
router.post(
  '/attendance',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  [
    body('studentId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Student ID must be a positive integer'),
    body('student_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Student ID must be a positive integer'),
    body('mealTypeId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Meal type ID must be a positive integer'),
    body('meal_type_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Meal type ID must be a positive integer'),
    body('status')
      .optional()
      .isIn(['PRESENT', 'ABSENT', 'SPECIAL_REQUEST', 'PACKED', 'present', 'absent', 'special_request', 'packed'])
      .withMessage('Invalid attendance status'),
    body('mealDate').optional().isDate().withMessage('Valid meal date is required (YYYY-MM-DD)'),
    body('meal_date').optional().isDate().withMessage('Valid meal date is required (YYYY-MM-DD)'),
    validate,
  ],
  mealController.recordAttendance
);

// PUT /api/meals/attendance/:id - Update attendance record
router.put(
  '/attendance/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  [
    param('id').isInt({ min: 1 }).withMessage('Attendance ID must be a positive integer'),
    body('status')
      .optional()
      .isIn(['PRESENT', 'ABSENT', 'SPECIAL_REQUEST', 'PACKED', 'present', 'absent', 'special_request', 'packed'])
      .withMessage('Invalid attendance status'),
    validate,
  ],
  mealController.updateAttendance
);

module.exports = router;
