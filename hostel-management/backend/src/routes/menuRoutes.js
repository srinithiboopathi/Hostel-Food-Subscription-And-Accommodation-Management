const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const menuController = require('../controllers/menuController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// GET /api/menu/types - List all meal types (Breakfast, Lunch, etc.)
router.get(
  '/types',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  menuController.getMealTypes
);

// GET /api/menu/today - Today's menu grouped by meal types
router.get(
  '/today',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  menuController.getTodayMenu
);

// GET /api/menu/date/:date - Menu by specific date (YYYY-MM-DD)
router.get(
  '/date/:date',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  menuController.getMenuByDate
);

// GET /api/menu/week - Weekly 7-day dining schedule
router.get(
  '/week',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  menuController.getWeeklyMenu
);

// GET /api/menu - List all menu items with filters
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  menuController.getAllMenuItems
);

// GET /api/menu/:id - Single menu item by ID
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  [
    param('id').isInt({ min: 1 }).withMessage('Menu ID must be a positive integer'),
    validate,
  ],
  menuController.getMenuItemById
);

// POST /api/menu - Add menu item (ADMIN and MESS_MANAGER)
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  [
    body('dayOfWeek')
      .optional()
      .isIn(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Invalid day of week'),
    body('day_of_week')
      .optional()
      .isIn(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Invalid day of week'),
    body('caloriesEst').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Calories must be a positive integer'),
    body('calories_est').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Calories must be a positive integer'),
    validate,
  ],
  menuController.createMenuItem
);

// PUT /api/menu/:id - Update menu item (ADMIN and MESS_MANAGER)
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  [
    param('id').isInt({ min: 1 }).withMessage('Menu ID must be a positive integer'),
    body('caloriesEst').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Calories must be a positive integer'),
    body('calories_est').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Calories must be a positive integer'),
    validate,
  ],
  menuController.updateMenuItem
);

// DELETE /api/menu/:id - Delete menu item (ADMIN and MESS_MANAGER)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  [
    param('id').isInt({ min: 1 }).withMessage('Menu ID must be a positive integer'),
    validate,
  ],
  menuController.deleteMenuItem
);

module.exports = router;
