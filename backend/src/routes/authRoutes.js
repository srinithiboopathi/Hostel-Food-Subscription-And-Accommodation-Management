const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { sendSuccess } = require('../utils/responseHelper');

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .optional()
      .trim(),
    body('identifier')
      .optional()
      .trim(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.identifier && !req.body.rollNumber) {
        throw new Error('Email or Roll Number is required');
      }
      return true;
    }),
    validate,
  ],
  authController.login
);

router.post(
  '/student-login',
  [
    body('identifier').optional().trim(),
    body('email').optional().trim(),
    body('rollNumber').optional().trim(),
    body('password').notEmpty().withMessage('Password is required'),
    body().custom((value, { req }) => {
      if (!req.body.identifier && !req.body.email && !req.body.rollNumber) {
        throw new Error('Student ID or email is required');
      }
      return true;
    }),
    validate,
  ],
  authController.studentLogin
);

router.post(
  '/staff-login',
  [
    body('email').trim().isEmail().withMessage('Valid staff email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  authController.staffLogin
);

// POST /api/auth/register-student (Public self-registration for students)
router.post(
  '/register-student',
  [
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    validate,
  ],
  authController.registerStudent
);

// GET /api/auth/me (Requires valid JWT)
router.get('/me', authenticate, authController.getMe);

// GET /api/auth/admin-only (Role-protected test route for ADMIN)
router.get('/admin-only', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Welcome Admin: Authorized access granted');
});

// GET /api/auth/warden-only (Role-protected test route for WARDEN)
router.get('/warden-only', authenticate, authorizeRoles('WARDEN'), (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Welcome Warden: Authorized access granted');
});

module.exports = router;
