const { query } = require('../config/database');

/**
 * Helper to get student ID for a logged-in student user
 */
async function resolveStudentId(user) {
  if (!user) return null;
  if (user.studentId) return user.studentId;
  const [rows] = await query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [user.id]);
  return rows[0]?.id || null;
}

/**
 * Helper to format CSV values safely
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function convertToCsv(records, columnMappings) {
  if (!records || records.length === 0) {
    return Object.values(columnMappings).map(escapeCsvValue).join(',') + '\n';
  }
  const headers = Object.values(columnMappings).map(escapeCsvValue).join(',');
  const keys = Object.keys(columnMappings);

  const rows = records.map((rec) => {
    return keys.map((k) => escapeCsvValue(rec[k])).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * =========================================================================
 * 1. STUDENT REPORT
 * =========================================================================
 */
async function getStudentReport(filters = {}, user) {
  const {
    department = '',
    year = '',
    status = '',
    hostelId = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Strict Student Role Isolation
  if (user && user.role === 'STUDENT') {
    const studentId = await resolveStudentId(user);
    if (!studentId) throw new Error('Student profile not found');
    whereConditions.push('s.id = ?');
    params.push(studentId);
  }

  if (department) {
    whereConditions.push('s.department = ?');
    params.push(department);
  }

  if (year) {
    whereConditions.push('s.year_of_study = ?');
    params.push(year);
  }

  if (status) {
    whereConditions.push('s.status = ?');
    params.push(status);
  }

  if (hostelId) {
    whereConditions.push('s.current_hostel_id = ?');
    params.push(hostelId);
  }

  if (search) {
    whereConditions.push('(u.full_name LIKE ? OR s.roll_number LIKE ? OR u.email LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 1. Fetch records
  const listSql = `
    SELECT 
      s.id, s.roll_number, u.full_name AS student_name, u.email, u.phone,
      s.department, s.course, s.year_of_study, s.gender, s.blood_group,
      h.name AS hostel_name, r.room_number, s.status, s.admission_date, s.created_at
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    ${whereClause}
    ORDER BY s.roll_number ASC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  // 2. Count total
  const countSql = `
    SELECT COUNT(*) AS total
    FROM students s
    JOIN users u ON s.user_id = u.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  // 3. Summary metrics
  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalStudents,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeCount,
      SUM(CASE WHEN status = 'PASSED_OUT' THEN 1 ELSE 0 END) AS passedOutCount,
      SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspendedCount,
      SUM(CASE WHEN status = 'VACATED' THEN 1 ELSE 0 END) AS vacatedCount
    FROM students
  `);

  return {
    records,
    summary: {
      totalStudents: Number(summaryRows[0]?.totalStudents) || 0,
      active: Number(summaryRows[0]?.activeCount) || 0,
      passedOut: Number(summaryRows[0]?.passedOutCount) || 0,
      suspended: Number(summaryRows[0]?.suspendedCount) || 0,
      vacated: Number(summaryRows[0]?.vacatedCount) || 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 2. ROOM & OCCUPANCY REPORT
 * =========================================================================
 */
async function getRoomReport(filters = {}, user) {
  const {
    hostelId = '',
    roomType = '',
    status = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  if (hostelId) {
    whereConditions.push('r.hostel_id = ?');
    params.push(hostelId);
  }

  if (roomType) {
    whereConditions.push('r.room_type = ?');
    params.push(roomType);
  }

  if (status) {
    whereConditions.push('r.status = ?');
    params.push(status);
  }

  if (search) {
    whereConditions.push('(r.room_number LIKE ? OR h.name LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      r.id, h.name AS hostel_name, h.code AS hostel_code, r.room_number, r.floor,
      r.room_type, r.capacity, r.occupied_count, 
      (r.capacity - r.occupied_count) AS available_beds,
      r.base_rent, r.status,
      CASE 
        WHEN r.occupied_count = 0 THEN 'EMPTY'
        WHEN r.occupied_count >= r.capacity THEN 'FULL'
        ELSE 'PARTIAL'
      END AS occupancy_status
    FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    ${whereClause}
    ORDER BY h.name ASC, r.floor ASC, r.room_number ASC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  // Global Room Summary
  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalRooms,
      COALESCE(SUM(capacity), 0) AS totalCapacity,
      COALESCE(SUM(occupied_count), 0) AS occupiedBeds,
      COALESCE(SUM(capacity - occupied_count), 0) AS availableBeds,
      SUM(CASE WHEN occupied_count > 0 THEN 1 ELSE 0 END) AS occupiedRooms,
      SUM(CASE WHEN status = 'AVAILABLE' AND occupied_count = 0 THEN 1 ELSE 0 END) AS availableRooms,
      SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenanceRooms
    FROM rooms
  `);

  const summaryData = summaryRows[0] || {};
  const totalCap = Number(summaryData.totalCapacity) || 0;
  const occBeds = Number(summaryData.occupiedBeds) || 0;
  const occupancyPercentage = totalCap > 0 ? Number(((occBeds / totalCap) * 100).toFixed(1)) : 0;

  return {
    records,
    summary: {
      totalRooms: Number(summaryData.totalRooms) || 0,
      totalCapacity: totalCap,
      occupiedBeds: occBeds,
      availableBeds: Number(summaryData.availableBeds) || 0,
      occupiedRooms: Number(summaryData.occupiedRooms) || 0,
      availableRooms: Number(summaryData.availableRooms) || 0,
      maintenanceRooms: Number(summaryData.maintenanceRooms) || 0,
      occupancyPercentage,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 3. ROOM ALLOCATION REPORT
 * =========================================================================
 */
async function getAllocationReport(filters = {}, user) {
  const {
    hostelId = '',
    roomId = '',
    status = '',
    academicYear = '',
    startDate = '',
    endDate = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Strict Student Role Isolation
  if (user && user.role === 'STUDENT') {
    const studentId = await resolveStudentId(user);
    if (!studentId) throw new Error('Student profile not found');
    whereConditions.push('a.student_id = ?');
    params.push(studentId);
  }

  if (hostelId) {
    whereConditions.push('r.hostel_id = ?');
    params.push(hostelId);
  }

  if (roomId) {
    whereConditions.push('a.room_id = ?');
    params.push(roomId);
  }

  if (status) {
    whereConditions.push('a.status = ?');
    params.push(status);
  }

  if (academicYear) {
    whereConditions.push('a.academic_year = ?');
    params.push(academicYear);
  }

  if (startDate) {
    whereConditions.push('a.allocated_from >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('a.allocated_from <= ?');
    params.push(endDate);
  }

  if (search) {
    whereConditions.push('(u.full_name LIKE ? OR s.roll_number LIKE ? OR r.room_number LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      a.id, u.full_name AS student_name, s.roll_number, s.department,
      h.name AS hostel_name, r.room_number, r.room_type,
      a.academic_year, a.allocated_from, a.allocated_to, a.security_deposit,
      a.status, a.vacated_at, a.remarks, au.full_name AS allocated_by_name, a.created_at
    FROM room_allocations a
    JOIN students s ON a.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN rooms r ON a.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN users au ON a.allocated_by = au.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM room_allocations a
    JOIN students s ON a.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN rooms r ON a.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalAllocations,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeCount,
      SUM(CASE WHEN status = 'VACATED' THEN 1 ELSE 0 END) AS vacatedCount,
      SUM(CASE WHEN status = 'TRANSFERRED' THEN 1 ELSE 0 END) AS transferredCount
    FROM room_allocations
  `);

  return {
    records,
    summary: {
      totalAllocations: Number(summaryRows[0]?.totalAllocations) || 0,
      active: Number(summaryRows[0]?.activeCount) || 0,
      vacated: Number(summaryRows[0]?.vacatedCount) || 0,
      transferred: Number(summaryRows[0]?.transferredCount) || 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 4. FOOD & MEAL ATTENDANCE REPORT
 * =========================================================================
 */
async function getMealReport(filters = {}, user) {
  const {
    startDate = '',
    endDate = '',
    mealType = '',
    status = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Strict Student Role Isolation
  if (user && user.role === 'STUDENT') {
    const studentId = await resolveStudentId(user);
    if (!studentId) throw new Error('Student profile not found');
    whereConditions.push('ma.student_id = ?');
    params.push(studentId);
  }

  if (startDate) {
    whereConditions.push('ma.meal_date >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('ma.meal_date <= ?');
    params.push(endDate);
  }

  if (mealType) {
    whereConditions.push('mt.name = ?');
    params.push(mealType);
  }

  if (status) {
    whereConditions.push('ma.status = ?');
    params.push(status);
  }

  if (search) {
    whereConditions.push('(u.full_name LIKE ? OR s.roll_number LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      ma.id, ma.meal_date, mt.name AS meal_type, u.full_name AS student_name, s.roll_number,
      ma.status, ma.remarks, fm.special_item, mu.full_name AS marked_by_name, ma.created_at
    FROM meal_attendance ma
    JOIN students s ON ma.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN meal_types mt ON ma.meal_type_id = mt.id
    LEFT JOIN food_menu fm ON ma.food_menu_id = fm.id
    LEFT JOIN users mu ON ma.marked_by = mu.id
    ${whereClause}
    ORDER BY ma.meal_date DESC, mt.start_time ASC, s.roll_number ASC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM meal_attendance ma
    JOIN students s ON ma.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN meal_types mt ON ma.meal_type_id = mt.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  // Attendance summary
  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalAttendance,
      SUM(CASE WHEN mt.name = 'BREAKFAST' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS breakfastCount,
      SUM(CASE WHEN mt.name = 'LUNCH' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS lunchCount,
      SUM(CASE WHEN mt.name = 'SNACKS' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS snacksCount,
      SUM(CASE WHEN mt.name = 'DINNER' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS dinnerCount,
      SUM(CASE WHEN ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS totalPresent,
      SUM(CASE WHEN ma.status = 'ABSENT' THEN 1 ELSE 0 END) AS totalAbsent,
      SUM(CASE WHEN ma.status = 'SPECIAL_REQUEST' THEN 1 ELSE 0 END) AS specialDietCount,
      SUM(CASE WHEN ma.status = 'PACKED' THEN 1 ELSE 0 END) AS packedCount
    FROM meal_attendance ma
    JOIN meal_types mt ON ma.meal_type_id = mt.id
  `);

  return {
    records,
    summary: {
      totalAttendance: Number(summaryRows[0]?.totalAttendance) || 0,
      breakfast: Number(summaryRows[0]?.breakfastCount) || 0,
      lunch: Number(summaryRows[0]?.lunchCount) || 0,
      snacks: Number(summaryRows[0]?.snacksCount) || 0,
      dinner: Number(summaryRows[0]?.dinnerCount) || 0,
      present: Number(summaryRows[0]?.totalPresent) || 0,
      absent: Number(summaryRows[0]?.totalAbsent) || 0,
      specialDiet: Number(summaryRows[0]?.specialDietCount) || 0,
      packed: Number(summaryRows[0]?.packedCount) || 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 5. FOOD MENU REPORT
 * =========================================================================
 */
async function getMenuReport(filters = {}) {
  const { dayOfWeek = '', mealType = '', isActive = '' } = filters;

  const whereConditions = [];
  const params = [];

  if (dayOfWeek) {
    whereConditions.push('fm.day_of_week = ?');
    params.push(dayOfWeek.toUpperCase());
  }

  if (mealType) {
    whereConditions.push('mt.name = ?');
    params.push(mealType.toUpperCase());
  }

  if (isActive !== '') {
    whereConditions.push('fm.is_active = ?');
    params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      fm.id, fm.day_of_week, mt.name AS meal_type, mt.start_time, mt.end_time,
      fm.items_description, fm.special_item, fm.calories_est, fm.is_active, fm.updated_at
    FROM food_menu fm
    JOIN meal_types mt ON fm.meal_type_id = mt.id
    ${whereClause}
    ORDER BY FIELD(fm.day_of_week, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'), mt.start_time ASC
  `;

  const [records] = await query(sql, params);

  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalItems,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeItems,
      SUM(CASE WHEN special_item IS NOT NULL AND TRIM(special_item) != '' THEN 1 ELSE 0 END) AS specialItems
    FROM food_menu
  `);

  return {
    records,
    summary: {
      totalItems: Number(summaryRows[0]?.totalItems) || 0,
      activeItems: Number(summaryRows[0]?.activeItems) || 0,
      specialItems: Number(summaryRows[0]?.specialItems) || 0,
    },
  };
}

/**
 * =========================================================================
 * 6. FEES REPORT
 * =========================================================================
 */
async function getFeeReport(filters = {}, user) {
  const {
    feeTypeId = '',
    status = '',
    academicYear = '',
    startDate = '',
    endDate = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Strict Student Role Isolation
  if (user && user.role === 'STUDENT') {
    const studentId = await resolveStudentId(user);
    if (!studentId) throw new Error('Student profile not found');
    whereConditions.push('sf.student_id = ?');
    params.push(studentId);
  }

  if (feeTypeId) {
    whereConditions.push('sf.fee_type_id = ?');
    params.push(feeTypeId);
  }

  if (status) {
    whereConditions.push('sf.status = ?');
    params.push(status);
  }

  if (academicYear) {
    whereConditions.push('sf.academic_year = ?');
    params.push(academicYear);
  }

  if (startDate) {
    whereConditions.push('sf.due_date >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('sf.due_date <= ?');
    params.push(endDate);
  }

  if (search) {
    whereConditions.push('(sf.bill_number LIKE ? OR u.full_name LIKE ? OR s.roll_number LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      sf.id, sf.bill_number, u.full_name AS student_name, s.roll_number, s.department,
      ft.name AS fee_type_name, sf.academic_year, sf.term_name,
      sf.amount_due, sf.amount_paid, sf.discount,
      (sf.amount_due - sf.amount_paid) AS balance_pending,
      sf.status, sf.due_date, sf.created_at
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN fee_types ft ON sf.fee_type_id = ft.id
    ${whereClause}
    ORDER BY sf.due_date DESC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  const [summaryRows] = await query(`
    SELECT 
      COALESCE(SUM(amount_due), 0) AS totalBilled,
      COALESCE(SUM(amount_paid), 0) AS totalCollected,
      COALESCE(SUM(amount_due - amount_paid), 0) AS totalPending,
      COUNT(*) AS totalInvoices,
      SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paidInvoices,
      SUM(CASE WHEN status = 'PARTIAL' THEN 1 ELSE 0 END) AS partialInvoices,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pendingInvoices,
      SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdueInvoices
    FROM student_fees
  `);

  const summaryData = summaryRows[0] || {};

  return {
    records,
    summary: {
      totalBilled: Number(summaryData.totalBilled) || 0,
      totalCollected: Number(summaryData.totalCollected) || 0,
      totalPending: Number(summaryData.totalPending) || 0,
      totalInvoices: Number(summaryData.totalInvoices) || 0,
      paidInvoices: Number(summaryData.paidInvoices) || 0,
      partialInvoices: Number(summaryData.partialInvoices) || 0,
      pendingInvoices: Number(summaryData.pendingInvoices) || 0,
      overdueInvoices: Number(summaryData.overdueInvoices) || 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 7. PAYMENT REPORT
 * =========================================================================
 */
async function getPaymentReport(filters = {}, user) {
  const {
    paymentMethod = '',
    paymentStatus = '',
    startDate = '',
    endDate = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Strict Student Role Isolation
  if (user && user.role === 'STUDENT') {
    const studentId = await resolveStudentId(user);
    if (!studentId) throw new Error('Student profile not found');
    whereConditions.push('p.student_id = ?');
    params.push(studentId);
  }

  if (paymentMethod) {
    whereConditions.push('p.payment_method = ?');
    params.push(paymentMethod);
  }

  if (paymentStatus) {
    whereConditions.push('p.payment_status = ?');
    params.push(paymentStatus);
  }

  if (startDate) {
    whereConditions.push('DATE(p.payment_date) >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('DATE(p.payment_date) <= ?');
    params.push(endDate);
  }

  if (search) {
    whereConditions.push('(p.receipt_number LIKE ? OR p.transaction_id LIKE ? OR u.full_name LIKE ? OR s.roll_number LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      p.id, p.receipt_number, p.transaction_id, u.full_name AS student_name, s.roll_number,
      sf.bill_number, sf.term_name, p.amount, p.payment_method, p.payment_date,
      p.payment_status, cu.full_name AS collected_by_name, p.notes, p.created_at
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN student_fees sf ON p.student_fee_id = sf.id
    LEFT JOIN users cu ON p.collected_by = cu.id
    ${whereClause}
    ORDER BY p.payment_date DESC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalTransactions,
      COALESCE(SUM(amount), 0) AS totalCollected,
      SUM(CASE WHEN payment_status = 'SUCCESS' THEN 1 ELSE 0 END) AS successCount,
      SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) AS pendingCount,
      SUM(CASE WHEN payment_status = 'FAILED' THEN 1 ELSE 0 END) AS failedCount
    FROM payments
  `);

  return {
    records,
    summary: {
      totalTransactions: Number(summaryRows[0]?.totalTransactions) || 0,
      totalCollected: Number(summaryRows[0]?.totalCollected) || 0,
      successCount: Number(summaryRows[0]?.successCount) || 0,
      pendingCount: Number(summaryRows[0]?.pendingCount) || 0,
      failedCount: Number(summaryRows[0]?.failedCount) || 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 8. COMPLAINT REPORT
 * =========================================================================
 */
async function getComplaintReport(filters = {}, user) {
  const {
    status = '',
    category = '',
    priority = '',
    startDate = '',
    endDate = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Strict Student Role Isolation
  if (user && user.role === 'STUDENT') {
    const studentId = await resolveStudentId(user);
    if (!studentId) throw new Error('Student profile not found');
    whereConditions.push('c.student_id = ?');
    params.push(studentId);
  }

  // Mess Manager food complaint isolation if requested
  if (user && user.role === 'MESS_MANAGER') {
    whereConditions.push("c.category = 'MESS_FOOD'");
  }

  if (status) {
    whereConditions.push('c.status = ?');
    params.push(status);
  }

  if (category) {
    whereConditions.push('c.category = ?');
    params.push(category);
  }

  if (priority) {
    whereConditions.push('c.priority = ?');
    params.push(priority);
  }

  if (startDate) {
    whereConditions.push('DATE(c.created_at) >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('DATE(c.created_at) <= ?');
    params.push(endDate);
  }

  if (search) {
    whereConditions.push('(c.ticket_number LIKE ? OR c.title LIKE ? OR u.full_name LIKE ? OR s.roll_number LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      c.id, c.ticket_number, u.full_name AS student_name, s.roll_number,
      h.name AS hostel_name, r.room_number, c.category, c.title, c.description,
      c.priority, c.status, au.full_name AS assigned_to_name, c.created_at, c.updated_at
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN users au ON c.assigned_to = au.id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalComplaints,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pendingCount,
      SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgressCount,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolvedCount,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejectedCount
    FROM complaints
  `);

  return {
    records,
    summary: {
      totalComplaints: Number(summaryRows[0]?.totalComplaints) || 0,
      pending: Number(summaryRows[0]?.pendingCount) || 0,
      inProgress: Number(summaryRows[0]?.inProgressCount) || 0,
      resolved: Number(summaryRows[0]?.resolvedCount) || 0,
      rejected: Number(summaryRows[0]?.rejectedCount) || 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 9. LEAVE REPORT
 * =========================================================================
 */
async function getLeaveReport(filters = {}, user) {
  const {
    status = '',
    leaveType = '',
    startDate = '',
    endDate = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Strict Student Role Isolation
  if (user && user.role === 'STUDENT') {
    const studentId = await resolveStudentId(user);
    if (!studentId) throw new Error('Student profile not found');
    whereConditions.push('l.student_id = ?');
    params.push(studentId);
  }

  if (status) {
    whereConditions.push('l.status = ?');
    params.push(status);
  }

  if (leaveType) {
    whereConditions.push('l.leave_type = ?');
    params.push(leaveType);
  }

  if (startDate) {
    whereConditions.push('l.start_date >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('l.end_date <= ?');
    params.push(endDate);
  }

  if (search) {
    whereConditions.push('(u.full_name LIKE ? OR s.roll_number LIKE ? OR l.reason LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      l.id, u.full_name AS student_name, s.roll_number, s.department,
      l.leave_type, l.start_date, l.end_date, l.reason, l.destination_address,
      l.emergency_contact, l.status, ru.full_name AS reviewed_by_name,
      l.review_remarks, l.actual_return_time, l.created_at
    FROM leave_requests l
    JOIN students s ON l.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN users ru ON l.reviewed_by = ru.id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM leave_requests l
    JOIN students s ON l.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalLeaves,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pendingCount,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approvedCount,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejectedCount,
      SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) AS returnedCount,
      SUM(CASE WHEN status = 'APPROVED' AND CURDATE() BETWEEN start_date AND end_date THEN 1 ELSE 0 END) AS activeOnLeaveCount
    FROM leave_requests
  `);

  return {
    records,
    summary: {
      totalLeaves: Number(summaryRows[0]?.totalLeaves) || 0,
      pending: Number(summaryRows[0]?.pendingCount) || 0,
      approved: Number(summaryRows[0]?.approvedCount) || 0,
      rejected: Number(summaryRows[0]?.rejectedCount) || 0,
      returned: Number(summaryRows[0]?.returnedCount) || 0,
      activeOnLeave: Number(summaryRows[0]?.activeOnLeaveCount) || 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 10. VISITOR REPORT
 * =========================================================================
 */
async function getVisitorReport(filters = {}, user) {
  const {
    status = '',
    startDate = '',
    endDate = '',
    search = '',
    page = 1,
    limit = 50,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Strict Student Role Isolation
  if (user && user.role === 'STUDENT') {
    const studentId = await resolveStudentId(user);
    if (!studentId) throw new Error('Student profile not found');
    whereConditions.push('v.student_id = ?');
    params.push(studentId);
  }

  if (status) {
    whereConditions.push('v.status = ?');
    params.push(status);
  }

  if (startDate) {
    whereConditions.push('DATE(v.check_in_time) >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('DATE(v.check_in_time) <= ?');
    params.push(endDate);
  }

  if (search) {
    whereConditions.push('(v.visitor_name LIKE ? OR u.full_name LIKE ? OR s.roll_number LIKE ? OR v.phone_number LIKE ?)');
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      v.id, v.visitor_name, v.relationship, v.phone_number,
      u.full_name AS student_name, s.roll_number, v.purpose,
      v.id_proof_type, v.id_proof_number,
      v.check_in_time, v.check_out_time, v.status,
      au.full_name AS approved_by_name, v.remarks, v.created_at
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN users au ON v.approved_by = au.id
    ${whereClause}
    ORDER BY v.check_in_time DESC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalVisitors,
      SUM(CASE WHEN DATE(check_in_time) = CURDATE() THEN 1 ELSE 0 END) AS todayVisitors,
      SUM(CASE WHEN status = 'INSIDE' THEN 1 ELSE 0 END) AS currentlyInside,
      SUM(CASE WHEN status = 'CHECKED_OUT' THEN 1 ELSE 0 END) AS checkedOut,
      SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) AS blockedCount
    FROM visitors
  `);

  return {
    records,
    summary: {
      totalVisitors: Number(summaryRows[0]?.totalVisitors) || 0,
      todayVisitors: Number(summaryRows[0]?.todayVisitors) || 0,
      currentlyInside: Number(summaryRows[0]?.currentlyInside) || 0,
      checkedOut: Number(summaryRows[0]?.checkedOut) || 0,
      blocked: Number(summaryRows[0]?.blockedCount) || 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 11. NOTIFICATION REPORT
 * =========================================================================
 */
async function getNotificationReport(filters = {}, user) {
  const { type = '', isRead = '', page = 1, limit = 50 } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const params = [];

  // Scoped to user unless Admin chooses otherwise
  if (user && user.role !== 'ADMIN') {
    whereConditions.push('n.user_id = ?');
    params.push(user.id);
  }

  if (type) {
    whereConditions.push('n.type = ?');
    params.push(type);
  }

  if (isRead !== '') {
    whereConditions.push('n.is_read = ?');
    params.push(isRead === '1' || isRead === 'true' ? 1 : 0);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const listSql = `
    SELECT 
      n.id, u.full_name AS user_name, u.email, u.role,
      n.title, n.message, n.type, n.link, n.is_read, n.created_at
    FROM notifications n
    JOIN users u ON n.user_id = u.id
    ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [records] = await query(listSql, [...params, limitNum, offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM notifications n
    JOIN users u ON n.user_id = u.id
    ${whereClause}
  `;
  const [countResult] = await query(countSql, params);
  const total = Number(countResult[0]?.total) || 0;

  const [summaryRows] = await query(`
    SELECT 
      COUNT(*) AS totalNotifications,
      SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unreadCount,
      SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) AS readCount
    FROM notifications
  `);

  const [byTypeRows] = await query(`
    SELECT type, COUNT(*) AS count
    FROM notifications
    GROUP BY type
  `);

  return {
    records,
    summary: {
      totalNotifications: Number(summaryRows[0]?.totalNotifications) || 0,
      unreadCount: Number(summaryRows[0]?.unreadCount) || 0,
      readCount: Number(summaryRows[0]?.readCount) || 0,
      byType: byTypeRows,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * =========================================================================
 * 12. CONSOLIDATED SUMMARY REPORT
 * =========================================================================
 */
async function getReportSummary() {
  const [students] = await query(`SELECT COUNT(*) AS total FROM students`);
  const [rooms] = await query(`
    SELECT 
      COUNT(*) AS totalRooms,
      COALESCE(SUM(capacity), 0) AS totalCapacity,
      COALESCE(SUM(occupied_count), 0) AS occupiedBeds,
      COALESCE(SUM(capacity - occupied_count), 0) AS availableBeds,
      SUM(CASE WHEN occupied_count > 0 THEN 1 ELSE 0 END) AS occupiedRooms,
      SUM(CASE WHEN status = 'AVAILABLE' AND occupied_count = 0 THEN 1 ELSE 0 END) AS availableRooms
    FROM rooms
  `);
  const [fees] = await query(`
    SELECT 
      COALESCE(SUM(amount_due), 0) AS totalBilled,
      COALESCE(SUM(amount_paid), 0) AS totalCollected,
      COALESCE(SUM(amount_due - amount_paid), 0) AS totalPending
    FROM student_fees
  `);
  const [meals] = await query(`
    SELECT COUNT(*) AS todayAttendance
    FROM meal_attendance
    WHERE meal_date = CURDATE() AND status = 'PRESENT'
  `);
  const [complaints] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved
    FROM complaints
  `);
  const [leaves] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM leave_requests
  `);
  const [visitors] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN DATE(check_in_time) = CURDATE() THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN status = 'INSIDE' THEN 1 ELSE 0 END) AS inside
    FROM visitors
  `);
  const [notifications] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unread
    FROM notifications
  `);

  const roomData = rooms[0] || {};
  const totalCap = Number(roomData.totalCapacity) || 0;
  const occBeds = Number(roomData.occupiedBeds) || 0;
  const occupancyPercentage = totalCap > 0 ? Number(((occBeds / totalCap) * 100).toFixed(1)) : 0;

  return {
    students: {
      total: Number(students[0]?.total) || 0,
    },
    rooms: {
      totalRooms: Number(roomData.totalRooms) || 0,
      occupiedRooms: Number(roomData.occupiedRooms) || 0,
      availableRooms: Number(roomData.availableRooms) || 0,
      totalCapacity: totalCap,
      occupiedBeds: occBeds,
      availableBeds: Number(roomData.availableBeds) || 0,
      occupancyPercentage,
    },
    fees: {
      totalBilled: Number(fees[0]?.totalBilled) || 0,
      totalCollected: Number(fees[0]?.totalCollected) || 0,
      totalPending: Number(fees[0]?.totalPending) || 0,
    },
    meals: {
      todayAttendance: Number(meals[0]?.todayAttendance) || 0,
    },
    complaints: {
      total: Number(complaints[0]?.total) || 0,
      pending: Number(complaints[0]?.pending) || 0,
      resolved: Number(complaints[0]?.resolved) || 0,
    },
    leaves: {
      total: Number(leaves[0]?.total) || 0,
      pending: Number(leaves[0]?.pending) || 0,
      approved: Number(leaves[0]?.approved) || 0,
      rejected: Number(leaves[0]?.rejected) || 0,
    },
    visitors: {
      total: Number(visitors[0]?.total) || 0,
      today: Number(visitors[0]?.today) || 0,
      currentlyInside: Number(visitors[0]?.inside) || 0,
    },
    notifications: {
      total: Number(notifications[0]?.total) || 0,
      unread: Number(notifications[0]?.unread) || 0,
    },
  };
}

module.exports = {
  getStudentReport,
  getRoomReport,
  getAllocationReport,
  getMealReport,
  getMenuReport,
  getFeeReport,
  getPaymentReport,
  getComplaintReport,
  getLeaveReport,
  getVisitorReport,
  getNotificationReport,
  getReportSummary,
  convertToCsv,
};
