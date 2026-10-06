const menuService = require('../services/menuService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * GET /api/menu/types
 */
async function getMealTypes(req, res, next) {
  try {
    const mealTypes = await menuService.getMealTypes();
    return sendSuccess(res, mealTypes, 'Meal types retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/menu
 */
async function getAllMenuItems(req, res, next) {
  try {
    const { dayOfWeek, mealTypeId, isActive } = req.query;
    const items = await menuService.getAllMenuItems({ dayOfWeek, mealTypeId, isActive });
    return sendSuccess(res, items, 'Menu items retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/menu/today
 */
async function getTodayMenu(req, res, next) {
  try {
    const { date } = req.query;
    const todayMenu = await menuService.getTodayMenu(date || null);
    return sendSuccess(res, todayMenu, "Today's menu retrieved successfully");
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/menu/date/:date
 */
async function getMenuByDate(req, res, next) {
  try {
    const { date } = req.params;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(res, 'Invalid date format. Expected YYYY-MM-DD', 400);
    }
    const menu = await menuService.getTodayMenu(date);
    return sendSuccess(res, menu, `Menu for ${date} retrieved successfully`);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/menu/week
 */
async function getWeeklyMenu(req, res, next) {
  try {
    const weeklySchedule = await menuService.getWeeklyMenu();
    return sendSuccess(res, weeklySchedule, 'Weekly menu retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/menu/:id
 */
async function getMenuItemById(req, res, next) {
  try {
    const menuId = parseInt(req.params.id, 10);
    if (isNaN(menuId)) {
      return sendError(res, 'Invalid menu item ID format', 400);
    }
    const item = await menuService.getMenuItemById(menuId);
    return sendSuccess(res, item, 'Menu item retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/menu
 */
async function createMenuItem(req, res, next) {
  try {
    const {
      mealTypeId,
      meal_type_id,
      dayOfWeek,
      day_of_week,
      itemsDescription,
      items_description,
      specialItem,
      special_item,
      caloriesEst,
      calories_est,
      isActive,
      is_active,
    } = req.body;

    const targetMealTypeId = mealTypeId || meal_type_id;
    const targetDayOfWeek = dayOfWeek || day_of_week;
    const targetItemsDescription = itemsDescription || items_description;

    if (!targetMealTypeId) {
      return sendError(res, 'Meal type is required', 400);
    }
    if (!targetDayOfWeek) {
      return sendError(res, 'Day of week is required', 400);
    }
    if (!targetItemsDescription || targetItemsDescription.trim() === '') {
      return sendError(res, 'Food items description is required', 400);
    }

    const item = await menuService.createMenuItem({
      mealTypeId: targetMealTypeId,
      dayOfWeek: targetDayOfWeek,
      itemsDescription: targetItemsDescription,
      specialItem: specialItem || special_item || null,
      caloriesEst: caloriesEst || calories_est || null,
      isActive: isActive !== undefined ? isActive : (is_active !== undefined ? is_active : true),
    });

    return sendSuccess(res, item, 'Menu item saved successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/menu/:id
 */
async function updateMenuItem(req, res, next) {
  try {
    const menuId = parseInt(req.params.id, 10);
    if (isNaN(menuId)) {
      return sendError(res, 'Invalid menu item ID format', 400);
    }

    const {
      mealTypeId,
      meal_type_id,
      dayOfWeek,
      day_of_week,
      itemsDescription,
      items_description,
      specialItem,
      special_item,
      caloriesEst,
      calories_est,
      isActive,
      is_active,
    } = req.body;

    const updateData = {};
    if (mealTypeId !== undefined || meal_type_id !== undefined) {
      updateData.mealTypeId = mealTypeId !== undefined ? mealTypeId : meal_type_id;
    }
    if (dayOfWeek !== undefined || day_of_week !== undefined) {
      updateData.dayOfWeek = dayOfWeek !== undefined ? dayOfWeek : day_of_week;
    }
    if (itemsDescription !== undefined || items_description !== undefined) {
      updateData.itemsDescription = itemsDescription !== undefined ? itemsDescription : items_description;
    }
    if (specialItem !== undefined || special_item !== undefined) {
      updateData.specialItem = specialItem !== undefined ? specialItem : special_item;
    }
    if (caloriesEst !== undefined || calories_est !== undefined) {
      updateData.caloriesEst = caloriesEst !== undefined ? caloriesEst : calories_est;
    }
    if (isActive !== undefined || is_active !== undefined) {
      updateData.isActive = isActive !== undefined ? isActive : is_active;
    }

    const updated = await menuService.updateMenuItem(menuId, updateData);
    return sendSuccess(res, updated, 'Menu item updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/menu/:id
 */
async function deleteMenuItem(req, res, next) {
  try {
    const menuId = parseInt(req.params.id, 10);
    if (isNaN(menuId)) {
      return sendError(res, 'Invalid menu item ID format', 400);
    }

    const result = await menuService.deleteMenuItem(menuId);
    return sendSuccess(res, result, 'Menu item deleted successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMealTypes,
  getAllMenuItems,
  getTodayMenu,
  getMenuByDate,
  getWeeklyMenu,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
