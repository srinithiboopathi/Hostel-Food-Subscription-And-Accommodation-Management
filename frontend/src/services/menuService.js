import axiosClient from '../api/axiosClient';

/**
 * Fetch all active meal types
 */
export async function getMealTypes() {
  return await axiosClient.get('/menu/types');
}

/**
 * Fetch all menu items with optional filters
 * @param {Object} params - { dayOfWeek, mealTypeId, isActive }
 */
export async function getMenuItems(params = {}) {
  return await axiosClient.get('/menu', { params });
}

/**
 * Fetch today's menu grouped by meal types
 * @param {string} date - Optional YYYY-MM-DD
 */
export async function getTodayMenu(date = '') {
  return await axiosClient.get('/menu/today', { params: date ? { date } : {} });
}

/**
 * Fetch weekly 7-day dining schedule
 */
export async function getWeeklyMenu() {
  return await axiosClient.get('/menu/week');
}

/**
 * Fetch single menu item by ID
 * @param {number|string} id 
 */
export async function getMenuItemById(id) {
  return await axiosClient.get(`/menu/${id}`);
}

/**
 * Create or upsert a menu item in MySQL
 * @param {Object} menuData - { mealTypeId, dayOfWeek, itemsDescription, specialItem, caloriesEst, isActive }
 */
export async function createMenuItem(menuData) {
  return await axiosClient.post('/menu', menuData);
}

/**
 * Update an existing menu item
 * @param {number|string} id 
 * @param {Object} updateData 
 */
export async function updateMenuItem(id, updateData) {
  return await axiosClient.put(`/menu/${id}`, updateData);
}

/**
 * Delete a menu item
 * @param {number|string} id 
 */
export async function deleteMenuItem(id) {
  return await axiosClient.delete(`/menu/${id}`);
}
