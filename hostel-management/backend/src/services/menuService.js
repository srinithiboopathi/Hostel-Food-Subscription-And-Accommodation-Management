const { pool, query } = require('../config/database');

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/**
 * Get all meal types from MySQL
 */
async function getMealTypes() {
  const [rows] = await query(
    'SELECT id, name, start_time, end_time, is_active FROM meal_types WHERE is_active = TRUE ORDER BY start_time ASC'
  );
  return rows || [];
}

/**
 * Get all menu items with optional filters
 */
async function getAllMenuItems({ dayOfWeek = '', mealTypeId = '', isActive = '' } = {}) {
  const whereClauses = [];
  const params = [];

  if (dayOfWeek && dayOfWeek.trim() !== '') {
    whereClauses.push('fm.day_of_week = ?');
    params.push(dayOfWeek.trim().toUpperCase());
  }

  if (mealTypeId && mealTypeId.toString().trim() !== '') {
    whereClauses.push('fm.meal_type_id = ?');
    params.push(parseInt(mealTypeId, 10));
  }

  if (isActive !== '') {
    whereClauses.push('fm.is_active = ?');
    params.push(isActive === 'true' || isActive === '1' || isActive === true ? 1 : 0);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      fm.id,
      fm.meal_type_id,
      mt.name AS meal_type,
      mt.start_time,
      mt.end_time,
      fm.day_of_week,
      fm.items_description,
      fm.special_item,
      fm.calories_est,
      fm.is_active,
      fm.created_at,
      fm.updated_at
    FROM food_menu fm
    JOIN meal_types mt ON fm.meal_type_id = mt.id
    ${whereSQL}
    ORDER BY FIELD(fm.day_of_week, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'), mt.start_time ASC
  `;

  const [rows] = await query(sql, params);
  return rows || [];
}

/**
 * Get menu item by ID
 */
async function getMenuItemById(id) {
  const sql = `
    SELECT 
      fm.id,
      fm.meal_type_id,
      mt.name AS meal_type,
      mt.start_time,
      mt.end_time,
      fm.day_of_week,
      fm.items_description,
      fm.special_item,
      fm.calories_est,
      fm.is_active,
      fm.created_at,
      fm.updated_at
    FROM food_menu fm
    JOIN meal_types mt ON fm.meal_type_id = mt.id
    WHERE fm.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    throw error;
  }
  return rows[0];
}

/**
 * Get today's menu grouped by meal types (BREAKFAST, LUNCH, SNACKS, DINNER)
 */
async function getTodayMenu(dateInput = null) {
  const targetDate = dateInput ? new Date(dateInput) : new Date();
  const dayIndex = targetDate.getDay(); // 0 is Sunday, 1 is Monday ...
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const currentDayOfWeek = dayNames[dayIndex];

  // Fetch all meal types to guarantee clean structured response
  const mealTypes = await getMealTypes();

  // Fetch menu for this day of week
  const sql = `
    SELECT 
      fm.id,
      fm.meal_type_id,
      mt.name AS meal_type,
      mt.start_time,
      mt.end_time,
      fm.day_of_week,
      fm.items_description,
      fm.special_item,
      fm.calories_est,
      fm.is_active
    FROM food_menu fm
    JOIN meal_types mt ON fm.meal_type_id = mt.id
    WHERE fm.day_of_week = ? AND fm.is_active = TRUE
    ORDER BY mt.start_time ASC
  `;

  const [menuRows] = await query(sql, [currentDayOfWeek]);

  // Group by meal type
  const menuMap = {};
  (menuRows || []).forEach((item) => {
    menuMap[item.meal_type] = item;
  });

  const structured = mealTypes.map((mt) => {
    const menuItem = menuMap[mt.name];
    return {
      meal_type_id: mt.id,
      meal_type: mt.name,
      start_time: mt.start_time,
      end_time: mt.end_time,
      day_of_week: currentDayOfWeek,
      menu_id: menuItem?.id || null,
      items_description: menuItem?.items_description || null,
      special_item: menuItem?.special_item || null,
      calories_est: menuItem?.calories_est || null,
      has_menu: !!menuItem,
    };
  });

  return {
    date: targetDate.toISOString().split('T')[0],
    day_of_week: currentDayOfWeek,
    meals: structured,
  };
}

/**
 * Get full weekly menu grouped by Day of Week (Monday to Sunday)
 */
async function getWeeklyMenu() {
  const mealTypes = await getMealTypes();
  const allItems = await getAllMenuItems({ isActive: 'true' });

  const weeklySchedule = {};
  DAYS_OF_WEEK.forEach((day) => {
    weeklySchedule[day] = mealTypes.map((mt) => {
      const match = allItems.find((item) => item.day_of_week === day && item.meal_type_id === mt.id);
      return {
        meal_type_id: mt.id,
        meal_type: mt.name,
        start_time: mt.start_time,
        end_time: mt.end_time,
        menu_id: match?.id || null,
        items_description: match?.items_description || 'Menu not configured yet',
        special_item: match?.special_item || null,
        calories_est: match?.calories_est || null,
        has_menu: !!match,
      };
    });
  });

  return {
    meal_types: mealTypes,
    schedule: weeklySchedule,
  };
}

/**
 * Add or Upsert a menu item in MySQL
 */
async function createMenuItem({
  mealTypeId,
  dayOfWeek,
  itemsDescription,
  specialItem = null,
  caloriesEst = null,
  isActive = true,
}) {
  const cleanDay = dayOfWeek.trim().toUpperCase();
  if (!DAYS_OF_WEEK.includes(cleanDay)) {
    const error = new Error(`Invalid day of week "${cleanDay}". Must be one of: ${DAYS_OF_WEEK.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Verify meal type exists
  const [mtype] = await query('SELECT id, name FROM meal_types WHERE id = ?', [mealTypeId]);
  if (!mtype || mtype.length === 0) {
    const error = new Error('Meal type does not exist');
    error.statusCode = 400;
    throw error;
  }

  // Check duplicate unique constraint uq_day_mealtype
  const [existing] = await query(
    'SELECT id FROM food_menu WHERE day_of_week = ? AND meal_type_id = ?',
    [cleanDay, parseInt(mealTypeId, 10)]
  );

  let menuId;
  if (existing.length > 0) {
    menuId = existing[0].id;
    // Update existing record
    await query(
      `UPDATE food_menu 
       SET items_description = ?, special_item = ?, calories_est = ?, is_active = ? 
       WHERE id = ?`,
      [
        itemsDescription.trim(),
        specialItem ? specialItem.trim() : null,
        caloriesEst ? parseInt(caloriesEst, 10) : null,
        isActive ? 1 : 0,
        menuId,
      ]
    );
  } else {
    // Insert new record
    const [result] = await query(
      `INSERT INTO food_menu (meal_type_id, day_of_week, items_description, special_item, calories_est, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parseInt(mealTypeId, 10),
        cleanDay,
        itemsDescription.trim(),
        specialItem ? specialItem.trim() : null,
        caloriesEst ? parseInt(caloriesEst, 10) : null,
        isActive ? 1 : 0,
      ]
    );
    menuId = result.insertId;
  }

  return await getMenuItemById(menuId);
}

/**
 * Update an existing menu item
 */
async function updateMenuItem(id, updateData) {
  const existing = await getMenuItemById(id);

  const updates = [];
  const params = [];

  if (updateData.mealTypeId !== undefined) {
    updates.push('meal_type_id = ?');
    params.push(parseInt(updateData.mealTypeId, 10));
  }
  if (updateData.dayOfWeek !== undefined) {
    const cleanDay = updateData.dayOfWeek.trim().toUpperCase();
    if (!DAYS_OF_WEEK.includes(cleanDay)) {
      const error = new Error(`Invalid day of week: ${cleanDay}`);
      error.statusCode = 400;
      throw error;
    }
    updates.push('day_of_week = ?');
    params.push(cleanDay);
  }
  if (updateData.itemsDescription !== undefined) {
    updates.push('items_description = ?');
    params.push(updateData.itemsDescription.trim());
  }
  if (updateData.specialItem !== undefined) {
    updates.push('special_item = ?');
    params.push(updateData.specialItem ? updateData.specialItem.trim() : null);
  }
  if (updateData.caloriesEst !== undefined) {
    updates.push('calories_est = ?');
    params.push(updateData.caloriesEst ? parseInt(updateData.caloriesEst, 10) : null);
  }
  if (updateData.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(updateData.isActive ? 1 : 0);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE food_menu SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return await getMenuItemById(id);
}

/**
 * Delete / Remove a menu item
 */
async function deleteMenuItem(id) {
  await getMenuItemById(id);
  await query('DELETE FROM food_menu WHERE id = ?', [id]);
  return { id, message: 'Menu item deleted successfully' };
}

module.exports = {
  getMealTypes,
  getAllMenuItems,
  getMenuItemById,
  getTodayMenu,
  getWeeklyMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
