const { pool, query } = require('../config/database');

/**
 * Get meal attendance logs with comprehensive filters and pagination
 */
async function getMealAttendance({
  page = 1,
  limit = 20,
  date = '',
  mealTypeId = '',
  status = '',
  studentId = '',
  search = '',
  hostelId = '',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (date && date.trim() !== '') {
    whereClauses.push('ma.meal_date = ?');
    params.push(date.trim());
  }

  if (mealTypeId && mealTypeId.toString().trim() !== '') {
    whereClauses.push('ma.meal_type_id = ?');
    params.push(parseInt(mealTypeId, 10));
  }

  if (status && status.trim() !== '') {
    whereClauses.push('ma.status = ?');
    params.push(status.trim().toUpperCase());
  }

  if (studentId && studentId.toString().trim() !== '') {
    whereClauses.push('ma.student_id = ?');
    params.push(parseInt(studentId, 10));
  }

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('s.current_hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`;
    whereClauses.push('(u.full_name LIKE ? OR s.roll_number LIKE ?)');
    params.push(searchTerm, searchTerm);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total records
  const countSql = `
    SELECT COUNT(*) AS total
    FROM meal_attendance ma
    JOIN students s ON ma.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ${whereSQL}
  `;
  const [countResult] = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  // Fetch paginated records
  const dataSql = `
    SELECT 
      ma.id,
      ma.student_id,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      s.current_hostel_id,
      h.name AS hostel_name,
      r.room_number,
      ma.meal_type_id,
      mt.name AS meal_type,
      mt.start_time,
      mt.end_time,
      ma.food_menu_id,
      fm.items_description AS menu_items,
      fm.special_item,
      ma.meal_date,
      ma.status,
      ma.remarks,
      ma.marked_by,
      mb.full_name AS marked_by_name,
      ma.created_at
    FROM meal_attendance ma
    JOIN students s ON ma.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    JOIN meal_types mt ON ma.meal_type_id = mt.id
    LEFT JOIN food_menu fm ON ma.food_menu_id = fm.id
    LEFT JOIN users mb ON ma.marked_by = mb.id
    ${whereSQL}
    ORDER BY ma.meal_date DESC, mt.start_time DESC, ma.id DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSql, queryParams);

  return {
    attendance: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Record or Upsert student meal attendance (Prevents duplicate conflicts)
 */
async function recordAttendance({
  studentId,
  mealTypeId,
  mealDate,
  status = 'PRESENT',
  foodMenuId = null,
  remarks = null,
  markedBy = null,
}) {
  const cleanDate = mealDate || new Date().toISOString().split('T')[0];
  const cleanStatus = (status || 'PRESENT').toUpperCase();

  // Validate status ENUM
  const validStatuses = ['PRESENT', 'ABSENT', 'SPECIAL_REQUEST', 'PACKED'];
  if (!validStatuses.includes(cleanStatus)) {
    const error = new Error(`Invalid status "${cleanStatus}". Allowed: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Validate student
  const [students] = await query('SELECT id, status FROM students WHERE id = ?', [studentId]);
  if (!students || students.length === 0) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Validate meal type
  const [mealTypes] = await query('SELECT id, name FROM meal_types WHERE id = ?', [mealTypeId]);
  if (!mealTypes || mealTypes.length === 0) {
    const error = new Error('Meal type not found');
    error.statusCode = 404;
    throw error;
  }

  // Check student food subscription status
  const [subRows] = await query(
    `SELECT fs.id, fs.status, fs.start_date, fs.end_date, fp.has_breakfast, fp.has_lunch, fp.has_snacks, fp.has_dinner
     FROM food_subscriptions fs
     JOIN food_plans fp ON fs.plan_id = fp.id
     WHERE fs.student_id = ?
     ORDER BY fs.id DESC LIMIT 1`,
    [studentId]
  );

  if (subRows.length > 0) {
    const sub = subRows[0];
    if (sub.status !== 'ACTIVE') {
      const error = new Error(`Cannot record meal consumption: Student food subscription is currently ${sub.status}.`);
      error.statusCode = 400;
      throw error;
    }
    const formattedMealDate = new Date(cleanDate);
    const subEnd = new Date(sub.end_date);
    const subStart = new Date(sub.start_date);
    if (formattedMealDate < subStart || formattedMealDate > subEnd) {
      const error = new Error(`Cannot record meal consumption: Food subscription expired on ${sub.end_date}.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Find linked food_menu_id if not supplied
  let targetFoodMenuId = foodMenuId;
  if (!targetFoodMenuId) {
    const targetDate = new Date(cleanDate);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayOfWeek = dayNames[targetDate.getDay()];

    const [menus] = await query(
      'SELECT id FROM food_menu WHERE day_of_week = ? AND meal_type_id = ? AND is_active = TRUE LIMIT 1',
      [currentDayOfWeek, mealTypeId]
    );
    if (menus && menus.length > 0) {
      targetFoodMenuId = menus[0].id;
    }
  }

  // Check existing record for unique constraint (student_id, meal_date, meal_type_id)
  const [existing] = await query(
    'SELECT id, status FROM meal_attendance WHERE student_id = ? AND meal_date = ? AND meal_type_id = ?',
    [studentId, cleanDate, mealTypeId]
  );

  if (existing.length > 0) {
    const error = new Error(`Meal attendance has already been recorded for this student on ${cleanDate} (${mealTypes[0].name}).`);
    error.statusCode = 400;
    throw error;
  }

  // Insert new attendance
  const [result] = await query(
    `INSERT INTO meal_attendance (student_id, food_menu_id, meal_type_id, meal_date, status, marked_by, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [studentId, targetFoodMenuId, mealTypeId, cleanDate, cleanStatus, markedBy, remarks ? remarks.trim() : null]
  );
  const attendanceId = result.insertId;

  // Fetch full details of the attendance
  const [rows] = await query(
    `SELECT 
       ma.id,
       ma.student_id,
       s.roll_number,
       u.full_name AS student_name,
       ma.meal_type_id,
       mt.name AS meal_type,
       ma.meal_date,
       ma.status,
       ma.remarks,
       ma.marked_by,
       ma.created_at
     FROM meal_attendance ma
     JOIN students s ON ma.student_id = s.id
     JOIN users u ON s.user_id = u.id
     JOIN meal_types mt ON ma.meal_type_id = mt.id
     WHERE ma.id = ?`,
    [attendanceId]
  );

  return rows[0];
}

/**
 * Update attendance record by ID
 */
async function updateAttendance(id, { status, remarks, markedBy }) {
  const [existing] = await query('SELECT id FROM meal_attendance WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Meal attendance record not found');
    error.statusCode = 404;
    throw error;
  }

  const updates = [];
  const params = [];

  if (status !== undefined) {
    const cleanStatus = status.trim().toUpperCase();
    const validStatuses = ['PRESENT', 'ABSENT', 'SPECIAL_REQUEST', 'PACKED'];
    if (!validStatuses.includes(cleanStatus)) {
      const error = new Error(`Invalid status "${cleanStatus}". Allowed: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    updates.push('status = ?');
    params.push(cleanStatus);
  }

  if (remarks !== undefined) {
    updates.push('remarks = ?');
    params.push(remarks ? remarks.trim() : null);
  }

  if (markedBy !== undefined) {
    updates.push('marked_by = ?');
    params.push(markedBy);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE meal_attendance SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const [rows] = await query(
    `SELECT 
       ma.id,
       ma.student_id,
       s.roll_number,
       u.full_name AS student_name,
       ma.meal_type_id,
       mt.name AS meal_type,
       ma.meal_date,
       ma.status,
       ma.remarks,
       ma.created_at
     FROM meal_attendance ma
     JOIN students s ON ma.student_id = s.id
     JOIN users u ON s.user_id = u.id
     JOIN meal_types mt ON ma.meal_type_id = mt.id
     WHERE ma.id = ?`,
    [id]
  );

  return rows[0];
}

/**
 * Today's meal attendance summary with resident check-ins
 */
async function getTodayMealAttendance(dateInput = null) {
  const targetDate = dateInput || new Date().toISOString().split('T')[0];

  const mealTypes = await query('SELECT id, name, start_time, end_time FROM meal_types WHERE is_active = TRUE ORDER BY start_time ASC');
  const [types] = mealTypes;

  // Aggregate attendance count for each meal type
  const [counts] = await query(
    `SELECT 
       ma.meal_type_id,
       mt.name AS meal_type,
       COUNT(CASE WHEN ma.status IN ('PRESENT', 'PACKED', 'SPECIAL_REQUEST') THEN 1 END) AS present_count,
       COUNT(CASE WHEN ma.status = 'ABSENT' THEN 1 END) AS absent_count,
       COUNT(ma.id) AS total_marked
     FROM meal_attendance ma
     JOIN meal_types mt ON ma.meal_type_id = mt.id
     WHERE ma.meal_date = ?
     GROUP BY ma.meal_type_id, mt.name`,
    [targetDate]
  );

  const countMap = {};
  counts.forEach((c) => {
    countMap[c.meal_type_id] = c;
  });

  const summary = types.map((mt) => ({
    meal_type_id: mt.id,
    meal_type: mt.name,
    start_time: mt.start_time,
    end_time: mt.end_time,
    present_count: countMap[mt.id]?.present_count || 0,
    absent_count: countMap[mt.id]?.absent_count || 0,
    total_marked: countMap[mt.id]?.total_marked || 0,
  }));

  return {
    date: targetDate,
    summary,
  };
}

/**
 * Get comprehensive meal statistics with SQL aggregations
 */
async function getMealStatistics({ date = '', startDate = '', endDate = '' } = {}) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  // 1. Total active residents in hostels
  const [residentRows] = await query(
    `SELECT COUNT(*) AS total_residents 
     FROM students 
     WHERE status = 'ACTIVE' AND current_room_id IS NOT NULL`
  );
  const totalResidents = residentRows[0]?.total_residents || 0;

  // 2. Meal breakdown for the target date
  const [mealBreakdown] = await query(
    `SELECT 
       mt.id AS meal_type_id,
       mt.name AS meal_type,
       COUNT(CASE WHEN ma.status IN ('PRESENT', 'PACKED', 'SPECIAL_REQUEST') THEN 1 END) AS consumed_count,
       COUNT(CASE WHEN ma.status = 'ABSENT' THEN 1 END) AS absent_count,
       COUNT(CASE WHEN ma.status = 'SPECIAL_REQUEST' THEN 1 END) AS special_request_count,
       COUNT(CASE WHEN ma.status = 'PACKED' THEN 1 END) AS packed_count,
       COUNT(ma.id) AS total_logged
     FROM meal_types mt
     LEFT JOIN meal_attendance ma ON mt.id = ma.meal_type_id AND ma.meal_date = ?
     WHERE mt.is_active = TRUE
     GROUP BY mt.id, mt.name
     ORDER BY mt.start_time ASC`,
    [targetDate]
  );

  let breakfastCount = 0;
  let lunchCount = 0;
  let snacksCount = 0;
  let dinnerCount = 0;
  let totalConsumed = 0;

  mealBreakdown.forEach((mb) => {
    const name = mb.meal_type.toUpperCase();
    const consumed = parseInt(mb.consumed_count, 10) || 0;
    totalConsumed += consumed;

    if (name.includes('BREAKFAST')) breakfastCount = consumed;
    else if (name.includes('LUNCH')) lunchCount = consumed;
    else if (name.includes('SNACK')) snacksCount = consumed;
    else if (name.includes('DINNER')) dinnerCount = consumed;
  });

  // Calculate consumption percentage based on active residents * active meal types
  const maxPossible = totalResidents > 0 ? totalResidents * (mealBreakdown.length || 4) : 0;
  const consumptionPercentage = maxPossible > 0 ? Number(((totalConsumed / maxPossible) * 100).toFixed(1)) : 0;

  // 3. Past 7-day trend analysis
  const [dailyTrends] = await query(
    `SELECT 
       ma.meal_date,
       COUNT(CASE WHEN ma.status IN ('PRESENT', 'PACKED', 'SPECIAL_REQUEST') THEN 1 END) AS total_consumed,
       COUNT(CASE WHEN mt.name = 'BREAKFAST' AND ma.status IN ('PRESENT', 'PACKED') THEN 1 END) AS breakfast,
       COUNT(CASE WHEN mt.name = 'LUNCH' AND ma.status IN ('PRESENT', 'PACKED') THEN 1 END) AS lunch,
       COUNT(CASE WHEN mt.name = 'SNACKS' AND ma.status IN ('PRESENT', 'PACKED') THEN 1 END) AS snacks,
       COUNT(CASE WHEN mt.name = 'DINNER' AND ma.status IN ('PRESENT', 'PACKED') THEN 1 END) AS dinner
     FROM meal_attendance ma
     JOIN meal_types mt ON ma.meal_type_id = mt.id
     WHERE ma.meal_date BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND ?
     GROUP BY ma.meal_date
     ORDER BY ma.meal_date ASC`,
    [targetDate, targetDate]
  );

  return {
    date: targetDate,
    total_residents: totalResidents,
    breakfast_count: breakfastCount,
    lunch_count: lunchCount,
    snacks_count: snacksCount,
    dinner_count: dinnerCount,
    total_consumed: totalConsumed,
    consumption_percentage: consumptionPercentage,
    meal_breakdown: mealBreakdown,
    daily_trends: dailyTrends || [],
  };
}

/**
 * Get individual student meal attendance history (for /my-meals)
 */
async function getStudentMealHistory(studentId, { page = 1, limit = 30, month = '', year = '' } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = ['ma.student_id = ?'];
  const params = [studentId];

  if (month && year) {
    whereClauses.push('MONTH(ma.meal_date) = ? AND YEAR(ma.meal_date) = ?');
    params.push(parseInt(month, 10), parseInt(year, 10));
  } else if (year) {
    whereClauses.push('YEAR(ma.meal_date) = ?');
    params.push(parseInt(year, 10));
  }

  const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

  const [countResult] = await query(
    `SELECT COUNT(*) AS total FROM meal_attendance ma ${whereSQL}`,
    params
  );
  const total = countResult[0]?.total || 0;

  const sql = `
    SELECT 
      ma.id,
      ma.meal_date,
      ma.meal_type_id,
      mt.name AS meal_type,
      mt.start_time,
      mt.end_time,
      ma.status,
      fm.items_description AS menu_items,
      fm.special_item,
      ma.remarks,
      ma.created_at
    FROM meal_attendance ma
    JOIN meal_types mt ON ma.meal_type_id = mt.id
    LEFT JOIN food_menu fm ON ma.food_menu_id = fm.id
    ${whereSQL}
    ORDER BY ma.meal_date DESC, mt.start_time ASC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await query(sql, [...params, limitNum, offset]);

  // Also group history by date for structured day-view
  const groupedByDate = {};
  (rows || []).forEach((row) => {
    const dStr = row.meal_date instanceof Date ? row.meal_date.toISOString().split('T')[0] : String(row.meal_date).split('T')[0];
    if (!groupedByDate[dStr]) {
      groupedByDate[dStr] = {
        date: dStr,
        breakfast: null,
        lunch: null,
        snacks: null,
        dinner: null,
        logs: [],
      };
    }
    const type = row.meal_type.toUpperCase();
    if (type.includes('BREAKFAST')) groupedByDate[dStr].breakfast = row.status;
    else if (type.includes('LUNCH')) groupedByDate[dStr].lunch = row.status;
    else if (type.includes('SNACK')) groupedByDate[dStr].snacks = row.status;
    else if (type.includes('DINNER')) groupedByDate[dStr].dinner = row.status;
    groupedByDate[dStr].logs.push(row);
  });

  return {
    student_id: studentId,
    history: rows || [],
    grouped_by_date: Object.values(groupedByDate),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

module.exports = {
  getMealAttendance,
  recordAttendance,
  updateAttendance,
  getTodayMealAttendance,
  getMealStatistics,
  getStudentMealHistory,
};
