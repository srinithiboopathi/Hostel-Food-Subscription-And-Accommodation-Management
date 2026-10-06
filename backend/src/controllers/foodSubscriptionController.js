const foodSubscriptionService = require('../services/foodSubscriptionService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * GET /api/food/statistics - Summary statistics for food management dashboard
 */
async function getFoodDashboardStats(req, res, next) {
  try {
    const stats = await foodSubscriptionService.getFoodDashboardStats();
    return sendSuccess(res, stats, 'Food dashboard statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food/plans - List all food plans
 */
async function getAllFoodPlans(req, res, next) {
  try {
    const { status } = req.query;
    const plans = await foodSubscriptionService.getAllFoodPlans({ status });
    return sendSuccess(res, plans, 'Food plans retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food/plans/:id - Get food plan by ID
 */
async function getFoodPlanById(req, res, next) {
  try {
    const plan = await foodSubscriptionService.getFoodPlanById(req.params.id);
    return sendSuccess(res, plan, 'Food plan details retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/food/plans - Create new food plan (ADMIN / MESS_MANAGER)
 */
async function createFoodPlan(req, res, next) {
  try {
    const newPlan = await foodSubscriptionService.createFoodPlan(req.body);
    return sendSuccess(res, newPlan, 'Food plan created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/food/plans/:id - Update food plan
 */
async function updateFoodPlan(req, res, next) {
  try {
    const updatedPlan = await foodSubscriptionService.updateFoodPlan(req.params.id, req.body);
    return sendSuccess(res, updatedPlan, 'Food plan updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/food/plans/:id/toggle-status - Toggle food plan status
 */
async function toggleFoodPlanStatus(req, res, next) {
  try {
    const updatedPlan = await foodSubscriptionService.toggleFoodPlanStatus(req.params.id);
    return sendSuccess(res, updatedPlan, `Food plan status changed to ${updatedPlan.status}`);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food/subscriptions - List student food subscriptions
 */
async function getAllFoodSubscriptions(req, res, next) {
  try {
    const { page, limit, search, hostelId, planId, department, status, studentId } = req.query;

    let targetStudentId = studentId;
    if (req.user?.role === 'STUDENT') {
      targetStudentId = req.user.studentId;
    }

    const result = await foodSubscriptionService.getAllFoodSubscriptions({
      page,
      limit,
      search,
      hostelId,
      planId,
      department,
      status,
      studentId: targetStudentId,
    });

    return res.status(200).json({
      success: true,
      data: result.subscriptions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food/subscriptions/:id - Get subscription by ID
 */
async function getSubscriptionById(req, res, next) {
  try {
    const sub = await foodSubscriptionService.getSubscriptionById(req.params.id);
    if (req.user?.role === 'STUDENT' && req.user.studentId !== sub.student_id) {
      return sendError(res, 'Access denied', 403);
    }
    return sendSuccess(res, sub, 'Subscription details retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food/my-subscription - Student's own active food subscription
 */
async function getMySubscription(req, res, next) {
  try {
    if (!req.user?.studentId) {
      return sendError(res, 'Student profile not associated with this account', 400);
    }
    const sub = await foodSubscriptionService.getStudentActiveSubscription(req.user.studentId);
    return sendSuccess(res, sub, 'Active subscription retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/food/subscriptions - Create new food subscription
 */
async function createSubscription(req, res, next) {
  try {
    let studentId = req.body.studentId ?? req.body.student_id;
    if (req.user?.role === 'STUDENT') {
      studentId = req.user.studentId;
    }
    const newSub = await foodSubscriptionService.createSubscription({
      ...req.body,
      studentId,
      createdBy: req.user?.id || null,
    });
    return sendSuccess(res, newSub, 'Food subscription created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/food/subscriptions/:id/change-plan - Change subscription plan
 */
async function changeSubscriptionPlan(req, res, next) {
  try {
    if (req.user?.role === 'STUDENT') {
      const sub = await foodSubscriptionService.getSubscriptionById(req.params.id);
      if (sub.student_id !== req.user.studentId) {
        return sendError(res, 'Access denied', 403);
      }
    }
    const updated = await foodSubscriptionService.changeSubscriptionPlan(req.params.id, {
      ...req.body,
      updatedBy: req.user?.id || null,
    });
    return sendSuccess(res, updated, 'Food subscription plan changed successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/food/subscriptions/:id/pause - Pause subscription
 */
async function pauseSubscription(req, res, next) {
  try {
    if (req.user?.role === 'STUDENT') {
      const sub = await foodSubscriptionService.getSubscriptionById(req.params.id);
      if (sub.student_id !== req.user.studentId) {
        return sendError(res, 'Access denied', 403);
      }
    }
    const updated = await foodSubscriptionService.pauseSubscription(req.params.id, req.body);
    return sendSuccess(res, updated, 'Food subscription paused successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/food/subscriptions/:id/resume - Resume subscription
 */
async function resumeSubscription(req, res, next) {
  try {
    if (req.user?.role === 'STUDENT') {
      const sub = await foodSubscriptionService.getSubscriptionById(req.params.id);
      if (sub.student_id !== req.user.studentId) {
        return sendError(res, 'Access denied', 403);
      }
    }
    const updated = await foodSubscriptionService.resumeSubscription(req.params.id, req.body);
    return sendSuccess(res, updated, 'Food subscription resumed successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/food/subscriptions/:id/cancel - Cancel subscription
 */
async function cancelSubscription(req, res, next) {
  try {
    if (req.user?.role === 'STUDENT') {
      const sub = await foodSubscriptionService.getSubscriptionById(req.params.id);
      if (sub.student_id !== req.user.studentId) {
        return sendError(res, 'Access denied', 403);
      }
    }
    const updated = await foodSubscriptionService.cancelSubscription(req.params.id, req.body);
    return sendSuccess(res, updated, 'Food subscription cancelled successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/food/subscriptions/:id/renew - Renew subscription
 */
async function renewSubscription(req, res, next) {
  try {
    if (req.user?.role === 'STUDENT') {
      const sub = await foodSubscriptionService.getSubscriptionById(req.params.id);
      if (sub.student_id !== req.user.studentId) {
        return sendError(res, 'Access denied', 403);
      }
    }
    const updated = await foodSubscriptionService.renewSubscription(req.params.id, req.body);
    return sendSuccess(res, updated, 'Food subscription renewed successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food/history/:studentId - Complete student food history
 */
async function getStudentFoodHistory(req, res, next) {
  try {
    const targetStudentId = req.params.studentId || req.user?.studentId;
    if (req.user?.role === 'STUDENT' && req.user.studentId !== parseInt(targetStudentId, 10)) {
      return sendError(res, 'Access denied', 403);
    }
    const history = await foodSubscriptionService.getStudentFoodHistory(targetStudentId);
    return sendSuccess(res, history, 'Student food history retrieved successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFoodDashboardStats,
  getAllFoodPlans,
  getFoodPlanById,
  createFoodPlan,
  updateFoodPlan,
  toggleFoodPlanStatus,
  getAllFoodSubscriptions,
  getSubscriptionById,
  getMySubscription,
  createSubscription,
  changeSubscriptionPlan,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  renewSubscription,
  getStudentFoodHistory,
};
