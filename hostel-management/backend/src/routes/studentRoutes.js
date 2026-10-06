const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');
const router = express.Router();

const studentController = require('../controllers/studentController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// GET /api/students - List all students (Staff roles)
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'),
  studentController.getAllStudents
);

// GET /api/students/:id - Get student details by ID
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'),
  [
    param('id').isInt({ min: 1 }).withMessage('Student ID must be a positive integer'),
    validate,
  ],
  studentController.getStudentById
);

// POST /api/students - Create a new student (Admin and Warden)
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    body('name').trim().notEmpty().withMessage('Student name is required'),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('course').trim().notEmpty().withMessage('Course is required'),
    body('yearOfStudy').optional().isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    body('guardianName').trim().notEmpty().withMessage('Guardian name is required'),
    body('guardianPhone').trim().notEmpty().withMessage('Guardian phone is required'),
    body('permanentAddress').trim().notEmpty().withMessage('Permanent address is required'),
    validate,
  ],
  studentController.createStudent
);

// PUT /api/students/:id - Update student information (Admin and Warden)
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Student ID must be a positive integer'),
    body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('yearOfStudy').optional().isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    validate,
  ],
  studentController.updateStudent
);

// DELETE /api/students/:id - Deactivate student (Admin and Warden)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'WARDEN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Student ID must be a positive integer'),
    validate,
  ],
  studentController.deleteStudent
);

module.exports = router;
