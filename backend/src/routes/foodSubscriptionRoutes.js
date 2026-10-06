const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const foodSubscriptionController = require('../controllers/foodSubscriptionController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// GET /api/food/statistics & /api/food/stats - Summary statistics
router.get(
  '/statistics',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  foodSubscriptionController.getFoodDashboardStats
);
router.get(
  '/stats',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  foodSubscriptionController.getFoodDashboardStats
);

// GET /api/food/plans - List all plans
router.get(
  '/plans',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  foodSubscriptionController.getAllFoodPlans
);

// GET /api/food/plans/:id - Get plan by ID
router.get(
  '/plans/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid plan ID'), validate],
  foodSubscriptionController.getFoodPlanById
);

// POST /api/food/plans - Create new plan (ADMIN / MESS_MANAGER)
router.post(
  '/plans',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  [
    body('name').trim().notEmpty().withMessage('Plan name is required'),
    body('code').trim().notEmpty().withMessage('Plan code is required'),
    validate,
  ],
  foodSubscriptionController.createFoodPlan
);

// PUT /api/food/plans/:id - Update food plan (ADMIN / MESS_MANAGER)
router.put(
  '/plans/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid plan ID'),
    validate,
  ],
  foodSubscriptionController.updateFoodPlan
);

// PATCH /api/food/plans/:id/toggle-status - Toggle status
router.patch(
  '/plans/:id/toggle-status',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid plan ID'), validate],
  foodSubscriptionController.toggleFoodPlanStatus
);

// GET /api/food/subscriptions/my-subscription - Student active subscription
router.get(
  '/subscriptions/my-subscription',
  authenticate,
  authorizeRoles('STUDENT', 'ADMIN', 'MESS_MANAGER', 'WARDEN'),
  foodSubscriptionController.getMySubscription
);

// GET /api/food/subscriptions - List subscriptions
router.get(
  '/subscriptions',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  foodSubscriptionController.getAllFoodSubscriptions
);

// GET /api/food/subscriptions/:id - Get subscription by ID
router.get(
  '/subscriptions/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.getSubscriptionById
);

// POST /api/food/subscriptions - Create subscription (ADMIN, MESS_MANAGER, WARDEN, STUDENT)
router.post(
  '/subscriptions',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [
    validate,
  ],
  foodSubscriptionController.createSubscription
);

// PUT & POST /api/food/subscriptions/:id/change-plan
router.put(
  '/subscriptions/:id/change-plan',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.changeSubscriptionPlan
);
router.post(
  '/subscriptions/:id/change-plan',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.changeSubscriptionPlan
);

// PUT & POST /api/food/subscriptions/:id/pause
router.put(
  '/subscriptions/:id/pause',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.pauseSubscription
);
router.post(
  '/subscriptions/:id/pause',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.pauseSubscription
);

// PUT & POST /api/food/subscriptions/:id/resume
router.put(
  '/subscriptions/:id/resume',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.resumeSubscription
);
router.post(
  '/subscriptions/:id/resume',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.resumeSubscription
);

// PUT & POST /api/food/subscriptions/:id/cancel
router.put(
  '/subscriptions/:id/cancel',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.cancelSubscription
);
router.post(
  '/subscriptions/:id/cancel',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.cancelSubscription
);

// PUT & POST /api/food/subscriptions/:id/renew
router.put(
  '/subscriptions/:id/renew',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.renewSubscription
);
router.post(
  '/subscriptions/:id/renew',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid subscription ID'), validate],
  foodSubscriptionController.renewSubscription
);

// GET /api/food/history/:studentId & /api/food/students/:studentId/history
router.get(
  '/history/:studentId',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  [param('studentId').isInt({ min: 1 }).withMessage('Invalid student ID'), validate],
  foodSubscriptionController.getStudentFoodHistory
);
router.get(
  '/students/:studentId/history',
  authenticate,
  authorizeRoles('ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'),
  [param('studentId').isInt({ min: 1 }).withMessage('Invalid student ID'), validate],
  foodSubscriptionController.getStudentFoodHistory
);

module.exports = router;
