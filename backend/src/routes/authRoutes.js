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
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate,
  ],
  authController.login
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
