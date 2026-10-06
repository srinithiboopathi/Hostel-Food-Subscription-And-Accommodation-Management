import axiosClient from '../api/axiosClient';

/**
 * Fetch Food & Mess Dashboard Summary Statistics
 */
export async function getFoodDashboardStats() {
  return await axiosClient.get('/food/statistics');
}

export async function getFoodStats() {
  return await axiosClient.get('/food/statistics');
}

/**
 * Fetch all food plans
 * @param {Object} params - { status }
 */
export async function getFoodPlans(params = {}) {
  return await axiosClient.get('/food/plans', { params });
}

/**
 * Fetch single food plan by ID
 * @param {number|string} id 
 */
export async function getFoodPlanById(id) {
  return await axiosClient.get(`/food/plans/${id}`);
}

/**
 * Create new food plan
 * @param {Object} planData 
 */
export async function createFoodPlan(planData) {
  return await axiosClient.post('/food/plans', planData);
}

/**
 * Update food plan
 * @param {number|string} id 
 * @param {Object} planData 
 */
export async function updateFoodPlan(id, planData) {
  return await axiosClient.put(`/food/plans/${id}`, planData);
}

/**
 * Toggle food plan status (ACTIVE <-> INACTIVE)
 * @param {number|string} id 
 */
export async function togglePlanStatus(id) {
  return await axiosClient.patch(`/food/plans/${id}/toggle-status`);
}

/**
 * Fetch student food subscriptions
 * @param {Object} params - { page, limit, search, hostelId, planId, department, status, studentId }
 */
export async function getFoodSubscriptions(params = {}) {
  return await axiosClient.get('/food/subscriptions', { params });
}

export async function getSubscriptions(params = {}) {
  return await axiosClient.get('/food/subscriptions', { params });
}

/**
 * Fetch single subscription by ID
 * @param {number|string} id 
 */
export async function getSubscriptionById(id) {
  return await axiosClient.get(`/food/subscriptions/${id}`);
}

/**
 * Fetch active student subscription
 */
export async function getMyFoodSubscription() {
  return await axiosClient.get('/food/subscriptions/my-subscription');
}

export async function getMySubscription() {
  return await axiosClient.get('/food/subscriptions/my-subscription');
}

/**
 * Create new food subscription
 * @param {Object} subData - { studentId, planId, startDate, endDate, monthlyPrice, remarks }
 */
export async function createFoodSubscription(subData) {
  return await axiosClient.post('/food/subscriptions', subData);
}

export async function createSubscription(subData) {
  return await axiosClient.post('/food/subscriptions', subData);
}

/**
 * Change subscription plan
 * @param {number|string} id 
 * @param {Object} planData - { newPlanId, remarks }
 */
export async function changeSubscriptionPlan(id, planData) {
  return await axiosClient.put(`/food/subscriptions/${id}/change-plan`, planData);
}

export async function changePlan(id, planData) {
  return await axiosClient.put(`/food/subscriptions/${id}/change-plan`, planData);
}

/**
 * Pause subscription
 * @param {number|string} id 
 * @param {Object} data - { remarks }
 */
export async function pauseFoodSubscription(id, data = {}) {
  return await axiosClient.put(`/food/subscriptions/${id}/pause`, data);
}

export async function pauseSubscription(id, data = {}) {
  return await axiosClient.put(`/food/subscriptions/${id}/pause`, data);
}

/**
 * Resume subscription
 * @param {number|string} id 
 * @param {Object} data - { remarks }
 */
export async function resumeFoodSubscription(id, data = {}) {
  return await axiosClient.put(`/food/subscriptions/${id}/resume`, data);
}

export async function resumeSubscription(id, data = {}) {
  return await axiosClient.put(`/food/subscriptions/${id}/resume`, data);
}

/**
 * Cancel subscription
 * @param {number|string} id 
 * @param {Object} data - { remarks }
 */
export async function cancelFoodSubscription(id, data = {}) {
  return await axiosClient.put(`/food/subscriptions/${id}/cancel`, data);
}

export async function cancelSubscription(id, data = {}) {
  return await axiosClient.put(`/food/subscriptions/${id}/cancel`, data);
}

/**
 * Renew subscription
 * @param {number|string} id 
 * @param {Object} data - { newEndDate, remarks }
 */
export async function renewFoodSubscription(id, data = {}) {
  return await axiosClient.put(`/food/subscriptions/${id}/renew`, data);
}

export async function renewSubscription(id, data = {}) {
  return await axiosClient.put(`/food/subscriptions/${id}/renew`, data);
}

/**
 * Get student complete food history
 * @param {number|string} studentId 
 */
export async function getStudentFoodHistory(studentId) {
  return await axiosClient.get(`/food/history/${studentId}`);
}

const foodSubscriptionService = {
  getFoodDashboardStats,
  getFoodStats,
  getFoodPlans,
  getFoodPlanById,
  createFoodPlan,
  updateFoodPlan,
  togglePlanStatus,
  getFoodSubscriptions,
  getSubscriptions,
  getSubscriptionById,
  getMyFoodSubscription,
  getMySubscription,
  createFoodSubscription,
  createSubscription,
  changeSubscriptionPlan,
  changePlan,
  pauseFoodSubscription,
  pauseSubscription,
  resumeFoodSubscription,
  resumeSubscription,
  cancelFoodSubscription,
  cancelSubscription,
  renewFoodSubscription,
  renewSubscription,
  getStudentFoodHistory,
};

export default foodSubscriptionService;
