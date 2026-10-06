const { query } = require('../config/database');

/**
 * Helper to resolve student profile record by user_id
 */
async function getStudentByUserId(userId) {
  const [rows] = await query(
    `SELECT s.*, u.full_name, u.email, u.phone, u.avatar_url 
     FROM students s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * =========================================================================
 * 1. ADMIN DASHBOARD SERVICE
 * =========================================================================
 */
async function getAdminDashboard(adminUserId) {
  // 1. Students Breakdown
  const [studentStatsRows] = await query(`
    SELECT 
      COUNT(*) AS totalStudents,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeStudents,
      SUM(CASE WHEN status = 'PASSED_OUT' THEN 1 ELSE 0 END) AS passedOutStudents,
      SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspendedStudents,
      SUM(CASE WHEN status = 'VACATED' THEN 1 ELSE 0 END) AS vacatedStudents
    FROM students
  `);

  const [studentsByGender] = await query(`
    SELECT gender, COUNT(*) AS count
    FROM students
    GROUP BY gender
  `);

  const [studentsByYear] = await query(`
    SELECT year_of_study AS year, COUNT(*) AS count
    FROM students
    GROUP BY year_of_study
    ORDER BY year_of_study ASC
  `);

  const [studentsByDept] = await query(`
    SELECT department, COUNT(*) AS count
    FROM students
    GROUP BY department
    ORDER BY count DESC
    LIMIT 6
  `);

  // 1.5 Recent Students Table
  const [recentStudents] = await query(`
    SELECT 
      s.id, s.roll_number, s.department, s.year_of_study, s.status,
      u.full_name AS student_name, u.email,
      h.name AS hostel_name, r.room_number
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    ORDER BY s.id DESC
    LIMIT 6
  `);

  const [studentsByHostel] = await query(`
    SELECT COALESCE(h.name, 'Unassigned') AS hostel_name, COUNT(s.id) AS count
    FROM students s
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    WHERE s.status = 'ACTIVE'
    GROUP BY h.id, h.name
    ORDER BY count DESC
  `);

  // 2. Hostel & Room Occupancy
  const [hostelStatsRows] = await query(`
    SELECT 
      COUNT(*) AS totalHostels,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeHostels
    FROM hostels
  `);

  const [roomStatsRows] = await query(`
    SELECT 
      COUNT(*) AS totalRooms,
      COALESCE(SUM(capacity), 0) AS totalCapacity,
      COALESCE(SUM(occupied_count), 0) AS occupiedBeds,
      COALESCE(SUM(capacity - occupied_count), 0) AS availableBeds,
      SUM(CASE WHEN occupied_count > 0 THEN 1 ELSE 0 END) AS occupiedRooms,
      SUM(CASE WHEN status = 'AVAILABLE' AND occupied_count = 0 THEN 1 ELSE 0 END) AS availableRooms,
      SUM(CASE WHEN status = 'AVAILABLE' AND occupied_count > 0 AND occupied_count < capacity THEN 1 ELSE 0 END) AS partialRooms,
      SUM(CASE WHEN status = 'AVAILABLE' AND occupied_count >= capacity THEN 1 ELSE 0 END) AS fullRooms,
      SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenanceRooms
    FROM rooms
  `);

  const roomStats = roomStatsRows[0] || {};
  const totalCapacity = Number(roomStats.totalCapacity) || 0;
  const occupiedBeds = Number(roomStats.occupiedBeds) || 0;
  const occupancyPercentage = totalCapacity > 0 ? Number(((occupiedBeds / totalCapacity) * 100).toFixed(1)) : 0;

  const [hostelOccupancy] = await query(`
    SELECT 
      h.id, 
      h.name, 
      h.code, 
      h.type,
      h.status,
      w.full_name AS warden_name,
      COUNT(r.id) AS totalRooms,
      COALESCE(SUM(r.capacity), 0) AS totalCapacity,
      COALESCE(SUM(r.occupied_count), 0) AS occupiedBeds,
      COALESCE(SUM(r.capacity - r.occupied_count), 0) AS availableBeds,
      CASE 
        WHEN COALESCE(SUM(r.capacity), 0) > 0 
        THEN ROUND((COALESCE(SUM(r.occupied_count), 0) / SUM(r.capacity)) * 100, 1)
        ELSE 0 
      END AS occupancyRate
    FROM hostels h
    LEFT JOIN users w ON h.warden_id = w.id
    LEFT JOIN rooms r ON h.id = r.hostel_id
    GROUP BY h.id, h.name, h.code, h.type, h.status, w.full_name
    ORDER BY h.name ASC
  `);

  // 3. Food / Mess Subscriptions & Attendance
  const [foodSubStats] = await query(`
    SELECT 
      COUNT(DISTINCT student_id) AS totalSubscribers,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeSubscribers,
      COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN monthly_price ELSE 0 END), 0) AS monthlyFoodRevenue
    FROM food_subscriptions
  `);

  const [planDistribution] = await query(`
    SELECT 
      fp.id, fp.name, fp.code, fp.monthly_price,
      COUNT(fs.id) AS count
    FROM food_plans fp
    LEFT JOIN food_subscriptions fs ON fp.id = fs.plan_id AND fs.status = 'ACTIVE'
    WHERE fp.status = 'ACTIVE'
    GROUP BY fp.id, fp.name, fp.code, fp.monthly_price
    ORDER BY count DESC
  `);

  const [todayMealStats] = await query(`
    SELECT 
      COUNT(*) AS totalAttendance,
      SUM(CASE WHEN mt.name = 'BREAKFAST' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS breakfast,
      SUM(CASE WHEN mt.name = 'LUNCH' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS lunch,
      SUM(CASE WHEN mt.name = 'SNACKS' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS snacks,
      SUM(CASE WHEN mt.name = 'DINNER' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS dinner
    FROM meal_attendance ma
    JOIN meal_types mt ON ma.meal_type_id = mt.id
    WHERE ma.meal_date = CURDATE()
  `);

  const [todayMenu] = await query(`
    SELECT 
      fm.id, fm.day_of_week, mt.name AS meal_type, mt.start_time, mt.end_time, 
      fm.items_description AS menu_items, fm.special_item, fm.calories_est, fm.is_active
    FROM food_menu fm
    JOIN meal_types mt ON fm.meal_type_id = mt.id
    WHERE fm.day_of_week = UPPER(DAYNAME(CURDATE())) AND fm.is_active = 1
    ORDER BY mt.start_time ASC
  `);

  // 4. Fees & Payments
  const startOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  const [feeStatsRows] = await query(`
    SELECT 
      COALESCE(SUM(amount_due - discount), 0) AS totalBilled,
      COALESCE(SUM(amount_paid), 0) AS totalCollected,
      COALESCE(SUM(GREATEST(0, (amount_due - discount) - amount_paid)), 0) AS totalPending,
      COUNT(*) AS totalInvoices,
      SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paidInvoices,
      SUM(CASE WHEN status = 'PARTIAL' THEN 1 ELSE 0 END) AS partialInvoices,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pendingInvoices,
      SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdueInvoices
    FROM student_fees
  `);

  const feeStats = feeStatsRows[0] || {};
  const totalBilled = Number(feeStats.totalBilled) || 0;
  const totalCollected = Number(feeStats.totalCollected) || 0;
  const totalPending = Number(feeStats.totalPending) || 0;
  const collectionPercentage = totalBilled > 0 ? Number(((totalCollected / totalBilled) * 100).toFixed(1)) : 0;

  const [paymentStatsRows] = await query(`
    SELECT 
      COUNT(*) AS totalPayments,
      COALESCE(SUM(amount), 0) AS totalAmount,
      SUM(CASE WHEN DATE(payment_date) = CURDATE() THEN 1 ELSE 0 END) AS todayPaymentsCount,
      COALESCE(SUM(CASE WHEN DATE(payment_date) = CURDATE() THEN amount ELSE 0 END), 0) AS todayPaymentsAmount,
      COALESCE(SUM(CASE WHEN DATE(payment_date) >= ? THEN amount ELSE 0 END), 0) AS thisMonthAmount
    FROM payments
    WHERE payment_status = 'SUCCESS'
  `, [startOfMonth]);

  const [monthlyRevenueTrend] = await query(`
    SELECT 
      DATE_FORMAT(payment_date, '%b %Y') AS month,
      DATE_FORMAT(payment_date, '%Y-%m') AS month_key,
      COALESCE(SUM(amount), 0) AS collected,
      COUNT(id) AS count
    FROM payments
    WHERE payment_status = 'SUCCESS' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b %Y')
    ORDER BY month_key ASC
  `);

  const [feeCategoryRevenueRows] = await query(`
    SELECT 
      COALESCE(SUM(CASE WHEN LOWER(ft.name) LIKE '%mess%' OR LOWER(ft.name) LIKE '%food%' THEN p.amount ELSE 0 END), 0) AS foodRevenue,
      COALESCE(SUM(CASE WHEN LOWER(ft.name) LIKE '%hostel%' OR LOWER(ft.name) LIKE '%accommodation%' OR LOWER(ft.name) LIKE '%room%' THEN p.amount ELSE 0 END), 0) AS accommodationRevenue,
      COALESCE(SUM(CASE WHEN LOWER(ft.name) NOT LIKE '%mess%' AND LOWER(ft.name) NOT LIKE '%food%' AND LOWER(ft.name) NOT LIKE '%hostel%' AND LOWER(ft.name) NOT LIKE '%accommodation%' AND LOWER(ft.name) NOT LIKE '%room%' THEN p.amount ELSE 0 END), 0) AS otherRevenue
    FROM payments p
    JOIN student_fees sf ON p.student_fee_id = sf.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    WHERE p.payment_status = 'SUCCESS'
  `);

  const [recentPendingFees] = await query(`
    SELECT 
      sf.id, sf.bill_number, sf.term_name, sf.amount_due, sf.amount_paid, sf.discount,
      CAST(GREATEST(0, (sf.amount_due - sf.discount) - sf.amount_paid) AS DOUBLE) AS balance,
      sf.due_date, sf.status,
      u.full_name AS student_name, s.roll_number, ft.name AS fee_type_name
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    WHERE sf.status IN ('PENDING', 'PARTIAL')
    ORDER BY sf.due_date ASC
    LIMIT 5
  `);

  const [recentOverdueFees] = await query(`
    SELECT 
      sf.id, sf.bill_number, sf.term_name, sf.amount_due, sf.amount_paid, sf.discount,
      CAST(GREATEST(0, (sf.amount_due - sf.discount) - sf.amount_paid) AS DOUBLE) AS balance,
      sf.due_date, sf.status,
      DATEDIFF(CURDATE(), sf.due_date) AS days_overdue,
      u.full_name AS student_name, s.roll_number, ft.name AS fee_type_name
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    WHERE sf.status = 'OVERDUE' OR (sf.status IN ('PENDING', 'PARTIAL') AND sf.due_date < CURDATE())
    ORDER BY sf.due_date ASC
    LIMIT 5
  `);

  const [paymentsByMethod] = await query(`
    SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS totalAmount
    FROM payments
    WHERE payment_status = 'SUCCESS'
    GROUP BY payment_method
  `);

  // 5. Complaints
  const [complaintStatsRows] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM complaints
  `);

  const [complaintsByCategory] = await query(`
    SELECT category, COUNT(*) AS count
    FROM complaints
    GROUP BY category
    ORDER BY count DESC
  `);

  // 6. Leaves
  const [leaveStatsRows] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) AS returned,
      SUM(CASE WHEN status = 'APPROVED' AND CURDATE() BETWEEN start_date AND end_date THEN 1 ELSE 0 END) AS activeOnLeave
    FROM leave_requests
  `);

  // 7. Visitors
  const [visitorStatsRows] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN DATE(check_in_time) = CURDATE() THEN 1 ELSE 0 END) AS todayVisitors,
      SUM(CASE WHEN status = 'INSIDE' THEN 1 ELSE 0 END) AS currentlyInside,
      SUM(CASE WHEN status = 'CHECKED_OUT' THEN 1 ELSE 0 END) AS checkedOut
    FROM visitors
  `);

  // 8. Notifications for Admin
  const [notifRows] = await query(`
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `, [adminUserId]);

  const [recentNotifications] = await query(`
    SELECT id, title, message, type, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [adminUserId]);

  // 9. Recent Activities
  const [recentPayments] = await query(`
    SELECT 
      p.id, p.receipt_number, p.amount, p.payment_method, p.payment_date, p.payment_status,
      u.full_name AS student_name, s.roll_number, ft.name AS fee_type_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN student_fees sf ON p.student_fee_id = sf.id
    LEFT JOIN fee_types ft ON sf.fee_type_id = ft.id
    ORDER BY p.payment_date DESC, p.id DESC
    LIMIT 6
  `);

  const [recentComplaints] = await query(`
    SELECT 
      c.id, c.ticket_number, c.title, c.category, c.priority, c.status, c.created_at,
      u.full_name AS student_name, s.roll_number, r.room_number, h.name AS hostel_name
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN hostels h ON r.hostel_id = h.id
    ORDER BY c.created_at DESC
    LIMIT 5
  `);

  const [recentLeaves] = await query(`
    SELECT 
      l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
      u.full_name AS student_name, s.roll_number
    FROM leave_requests l
    JOIN students s ON l.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 5
  `);

  const [recentVisitors] = await query(`
    SELECT 
      v.id, v.visitor_name, v.relationship, v.purpose, v.status, v.check_in_time, v.check_out_time,
      u.full_name AS student_name, s.roll_number
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ORDER BY v.check_in_time DESC
    LIMIT 5
  `);

  const [recentAllocations] = await query(`
    SELECT 
      a.id, a.academic_year, a.allocated_from, a.status, a.created_at,
      u.full_name AS student_name, s.roll_number, r.room_number, h.name AS hostel_name
    FROM room_allocations a
    JOIN students s ON a.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN rooms r ON a.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    ORDER BY a.created_at DESC
    LIMIT 5
  `);

  const catRev = feeCategoryRevenueRows[0] || {};
  const payStats = paymentStatsRows[0] || {};
  const foodSubs = foodSubStats[0] || {};

  return {
    students: {
      total: Number(studentStatsRows[0]?.totalStudents) || 0,
      active: Number(studentStatsRows[0]?.activeStudents) || 0,
      passedOut: Number(studentStatsRows[0]?.passedOutStudents) || 0,
      suspended: Number(studentStatsRows[0]?.suspendedStudents) || 0,
      vacated: Number(studentStatsRows[0]?.vacatedStudents) || 0,
      byGender: studentsByGender,
      byYear: studentsByYear,
      byDepartment: studentsByDept,
      byHostel: studentsByHostel,
      recent: recentStudents,
    },
    hostel: {
      totalHostels: Number(hostelStatsRows[0]?.totalHostels) || 0,
      activeHostels: Number(hostelStatsRows[0]?.activeHostels) || 0,
      totalRooms: Number(roomStats.totalRooms) || 0,
      occupiedRooms: Number(roomStats.occupiedRooms) || 0,
      availableRooms: Number(roomStats.availableRooms) || 0,
      partialRooms: Number(roomStats.partialRooms) || 0,
      fullRooms: Number(roomStats.fullRooms) || 0,
      maintenanceRooms: Number(roomStats.maintenanceRooms) || 0,
      totalCapacity,
      occupiedBeds,
      availableBeds: Number(roomStats.availableBeds) || 0,
      occupancyPercentage,
      hostelOccupancy,
      hostelsList: hostelOccupancy,
      roomStatus: {
        available: Number(roomStats.availableRooms) || 0,
        partial: Number(roomStats.partialRooms) || 0,
        full: Number(roomStats.fullRooms) || 0,
        maintenance: Number(roomStats.maintenanceRooms) || 0,
      },
    },
    food: {
      totalSubscribers: Number(foodSubs.totalSubscribers) || 0,
      activeSubscribers: Number(foodSubs.activeSubscribers) || 0,
      monthlyFoodRevenue: Number(foodSubs.monthlyFoodRevenue) || 0,
      planDistribution: planDistribution || [],
      todayAttendance: {
        total: Number(todayMealStats[0]?.totalAttendance) || 0,
        breakfast: Number(todayMealStats[0]?.breakfast) || 0,
        lunch: Number(todayMealStats[0]?.lunch) || 0,
        snacks: Number(todayMealStats[0]?.snacks) || 0,
        dinner: Number(todayMealStats[0]?.dinner) || 0,
      },
      todayMenu,
    },
    meals: {
      todayAttendance: {
        total: Number(todayMealStats[0]?.totalAttendance) || 0,
        breakfast: Number(todayMealStats[0]?.breakfast) || 0,
        lunch: Number(todayMealStats[0]?.lunch) || 0,
        snacks: Number(todayMealStats[0]?.snacks) || 0,
        dinner: Number(todayMealStats[0]?.dinner) || 0,
      },
      todayMenu,
    },
    fees: {
      totalFeeAmount: totalBilled,
      totalBilled,
      totalPaid: totalCollected,
      totalCollected,
      totalRevenue: totalCollected,
      totalPending,
      collectionPercentage,
      totalInvoices: Number(feeStats.totalInvoices) || 0,
      paidInvoices: Number(feeStats.paidInvoices) || 0,
      partialInvoices: Number(feeStats.partialInvoices) || 0,
      pendingInvoices: Number(feeStats.pendingInvoices) || 0,
      overdueInvoices: Number(feeStats.overdueInvoices) || 0,
      paymentCount: Number(payStats.totalPayments) || 0,
      totalPayments: Number(payStats.totalPayments) || 0,
      todayCollection: Number(payStats.todayPaymentsAmount) || 0,
      todayPaymentsCount: Number(payStats.todayPaymentsCount) || 0,
      thisMonthCollection: Number(payStats.thisMonthAmount) || 0,
      foodRevenue: Number(catRev.foodRevenue) || 0,
      accommodationRevenue: Number(catRev.accommodationRevenue) || 0,
      otherRevenue: Number(catRev.otherRevenue) || 0,
      monthlyRevenueTrend: monthlyRevenueTrend || [],
      feeCategoryRevenue: [
        { name: 'Food / Mess', value: Number(catRev.foodRevenue) || 0, color: '#10b981' },
        { name: 'Accommodation', value: Number(catRev.accommodationRevenue) || 0, color: '#3b82f6' },
        { name: 'Other Fees', value: Number(catRev.otherRevenue) || 0, color: '#8b5cf6' },
      ],
      recentPendingFees,
      recentOverdueFees,
      paymentsByMethod,
    },
    finance: {
      totalBilled,
      totalCollected,
      totalRevenue: totalCollected,
      totalPending,
      todayCollection: Number(payStats.todayPaymentsAmount) || 0,
      thisMonthCollection: Number(payStats.thisMonthAmount) || 0,
      foodRevenue: Number(catRev.foodRevenue) || 0,
      accommodationRevenue: Number(catRev.accommodationRevenue) || 0,
      otherRevenue: Number(catRev.otherRevenue) || 0,
      overdueInvoices: Number(feeStats.overdueInvoices) || 0,
      monthlyRevenueTrend: monthlyRevenueTrend || [],
      feeCategoryRevenue: [
        { name: 'Food / Mess', value: Number(catRev.foodRevenue) || 0, color: '#10b981' },
        { name: 'Accommodation', value: Number(catRev.accommodationRevenue) || 0, color: '#3b82f6' },
        { name: 'Other Fees', value: Number(catRev.otherRevenue) || 0, color: '#8b5cf6' },
      ],
      recentPendingFees,
      recentOverdueFees,
      recentPayments,
    },
    complaints: {
      total: Number(complaintStatsRows[0]?.total) || 0,
      pending: Number(complaintStatsRows[0]?.pending) || 0,
      inProgress: Number(complaintStatsRows[0]?.inProgress) || 0,
      resolved: Number(complaintStatsRows[0]?.resolved) || 0,
      rejected: Number(complaintStatsRows[0]?.rejected) || 0,
      byCategory: complaintsByCategory,
    },
    leaves: {
      total: Number(leaveStatsRows[0]?.total) || 0,
      pending: Number(leaveStatsRows[0]?.pending) || 0,
      approved: Number(leaveStatsRows[0]?.approved) || 0,
      rejected: Number(leaveStatsRows[0]?.rejected) || 0,
      returned: Number(leaveStatsRows[0]?.returned) || 0,
      activeOnLeave: Number(leaveStatsRows[0]?.activeOnLeave) || 0,
    },
    visitors: {
      total: Number(visitorStatsRows[0]?.total) || 0,
      todayVisitors: Number(visitorStatsRows[0]?.todayVisitors) || 0,
      currentlyInside: Number(visitorStatsRows[0]?.currentlyInside) || 0,
      checkedOut: Number(visitorStatsRows[0]?.checkedOut) || 0,
    },
    notifications: {
      unreadCount: Number(notifRows[0]?.unreadCount) || 0,
      recent: recentNotifications,
    },
    recentActivity: {
      payments: recentPayments,
      complaints: recentComplaints,
      leaves: recentLeaves,
      visitors: recentVisitors,
      allocations: recentAllocations,
    },
  };
}

/**
 * =========================================================================
 * 2. WARDEN DASHBOARD SERVICE
 * =========================================================================
 */
async function getWardenDashboard(wardenUserId) {
  // Check if warden is assigned to specific hostels
  const [assignedHostels] = await query(
    `SELECT id, name, code, type, total_floors FROM hostels WHERE warden_id = ?`,
    [wardenUserId]
  );

  // Student stats
  const [studentStats] = await query(`
    SELECT 
      COUNT(*) AS totalStudents,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeStudents
    FROM students
  `);

  // Room & Occupancy
  const [roomStatsRows] = await query(`
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

  const roomStats = roomStatsRows[0] || {};
  const totalCapacity = Number(roomStats.totalCapacity) || 0;
  const occupiedBeds = Number(roomStats.occupiedBeds) || 0;
  const occupancyPercentage = totalCapacity > 0 ? Number(((occupiedBeds / totalCapacity) * 100).toFixed(1)) : 0;

  // Pending room allocations
  const [allocationStats] = await query(`
    SELECT 
      COUNT(*) AS totalAllocations,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeAllocations
    FROM room_allocations
  `);

  // Leaves
  const [leaveStatsRows] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) AS returned,
      SUM(CASE WHEN status = 'APPROVED' AND CURDATE() BETWEEN start_date AND end_date THEN 1 ELSE 0 END) AS activeOnLeave
    FROM leave_requests
  `);

  // Visitors
  const [visitorStatsRows] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN DATE(check_in_time) = CURDATE() THEN 1 ELSE 0 END) AS todayVisitors,
      SUM(CASE WHEN status = 'INSIDE' THEN 1 ELSE 0 END) AS currentlyInside,
      SUM(CASE WHEN status = 'CHECKED_OUT' THEN 1 ELSE 0 END) AS checkedOut
    FROM visitors
  `);

  // Complaints
  const [complaintStatsRows] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM complaints
  `);

  const [complaintsByCategory] = await query(`
    SELECT category, COUNT(*) AS count
    FROM complaints
    GROUP BY category
    ORDER BY count DESC
  `);

  // Hostel Breakdown
  const [hostelBreakdown] = await query(`
    SELECT 
      h.id, h.name, h.code, h.type,
      COUNT(r.id) AS totalRooms,
      COALESCE(SUM(r.capacity), 0) AS totalCapacity,
      COALESCE(SUM(r.occupied_count), 0) AS occupiedBeds,
      COALESCE(SUM(r.capacity - r.occupied_count), 0) AS availableBeds,
      CASE 
        WHEN COALESCE(SUM(r.capacity), 0) > 0 
        THEN ROUND((COALESCE(SUM(r.occupied_count), 0) / SUM(r.capacity)) * 100, 1)
        ELSE 0 
      END AS occupancyRate
    FROM hostels h
    LEFT JOIN rooms r ON h.id = r.hostel_id
    GROUP BY h.id, h.name, h.code, h.type
  `);

  // Notifications
  const [notifRows] = await query(`
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `, [wardenUserId]);

  const [recentNotifications] = await query(`
    SELECT id, title, message, type, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [wardenUserId]);

  // Recent Complaints, Leaves, Visitors
  const [recentComplaints] = await query(`
    SELECT 
      c.id, c.ticket_number, c.title, c.category, c.priority, c.status, c.created_at,
      u.full_name AS student_name, s.roll_number, r.room_number, h.name AS hostel_name
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN hostels h ON r.hostel_id = h.id
    ORDER BY c.created_at DESC
    LIMIT 6
  `);

  const [recentLeaves] = await query(`
    SELECT 
      l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
      u.full_name AS student_name, s.roll_number
    FROM leave_requests l
    JOIN students s ON l.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 6
  `);

  const [recentVisitors] = await query(`
    SELECT 
      v.id, v.visitor_name, v.relationship, v.purpose, v.status, v.check_in_time,
      u.full_name AS student_name, s.roll_number
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    JOIN users u ON s.user_id = u.id
    ORDER BY v.check_in_time DESC
    LIMIT 6
  `);

  return {
    assignedHostels,
    students: {
      total: Number(studentStats[0]?.totalStudents) || 0,
      active: Number(studentStats[0]?.activeStudents) || 0,
    },
    occupancy: {
      totalRooms: Number(roomStats.totalRooms) || 0,
      occupiedRooms: Number(roomStats.occupiedRooms) || 0,
      availableRooms: Number(roomStats.availableRooms) || 0,
      maintenanceRooms: Number(roomStats.maintenanceRooms) || 0,
      totalCapacity,
      occupiedBeds,
      availableBeds: Number(roomStats.availableBeds) || 0,
      occupancyPercentage,
      hostelBreakdown,
    },
    allocations: {
      total: Number(allocationStats[0]?.totalAllocations) || 0,
      active: Number(allocationStats[0]?.activeAllocations) || 0,
    },
    leaves: {
      total: Number(leaveStatsRows[0]?.total) || 0,
      pending: Number(leaveStatsRows[0]?.pending) || 0,
      approved: Number(leaveStatsRows[0]?.approved) || 0,
      rejected: Number(leaveStatsRows[0]?.rejected) || 0,
      returned: Number(leaveStatsRows[0]?.returned) || 0,
      activeOnLeave: Number(leaveStatsRows[0]?.activeOnLeave) || 0,
    },
    visitors: {
      total: Number(visitorStatsRows[0]?.total) || 0,
      todayVisitors: Number(visitorStatsRows[0]?.todayVisitors) || 0,
      currentlyInside: Number(visitorStatsRows[0]?.currentlyInside) || 0,
      checkedOut: Number(visitorStatsRows[0]?.checkedOut) || 0,
    },
    complaints: {
      total: Number(complaintStatsRows[0]?.total) || 0,
      pending: Number(complaintStatsRows[0]?.pending) || 0,
      inProgress: Number(complaintStatsRows[0]?.inProgress) || 0,
      resolved: Number(complaintStatsRows[0]?.resolved) || 0,
      rejected: Number(complaintStatsRows[0]?.rejected) || 0,
      byCategory: complaintsByCategory,
    },
    notifications: {
      unreadCount: Number(notifRows[0]?.unreadCount) || 0,
      recent: recentNotifications,
    },
    recentActivity: {
      complaints: recentComplaints,
      leaves: recentLeaves,
      visitors: recentVisitors,
    },
  };
}

/**
 * =========================================================================
 * 3. MESS MANAGER DASHBOARD SERVICE
 * =========================================================================
 */
async function getMessDashboard(messManagerUserId) {
  // 1. Today's Full Menu
  const [todayMenu] = await query(`
    SELECT 
      fm.id, fm.day_of_week, mt.name AS meal_type, mt.start_time, mt.end_time, 
      fm.items_description AS menu_items, fm.special_item, fm.calories_est, fm.is_active
    FROM food_menu fm
    JOIN meal_types mt ON fm.meal_type_id = mt.id
    WHERE fm.day_of_week = UPPER(DAYNAME(CURDATE())) AND fm.is_active = 1
    ORDER BY mt.start_time ASC
  `);

  // 2. Today's Meal Attendance Breakdown
  const [todayMealStats] = await query(`
    SELECT 
      COUNT(*) AS totalAttendance,
      SUM(CASE WHEN mt.name = 'BREAKFAST' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS breakfastCount,
      SUM(CASE WHEN mt.name = 'LUNCH' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS lunchCount,
      SUM(CASE WHEN mt.name = 'SNACKS' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS snacksCount,
      SUM(CASE WHEN mt.name = 'DINNER' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS dinnerCount,
      SUM(CASE WHEN ma.status = 'SPECIAL_REQUEST' THEN 1 ELSE 0 END) AS specialDietCount,
      SUM(CASE WHEN ma.status = 'PACKED' THEN 1 ELSE 0 END) AS packedMealsCount
    FROM meal_attendance ma
    JOIN meal_types mt ON ma.meal_type_id = mt.id
    WHERE ma.meal_date = CURDATE()
  `);

  // 3. Last 7 Days Meal Attendance Trends
  const [attendanceTrends] = await query(`
    SELECT 
      ma.meal_date,
      SUM(CASE WHEN mt.name = 'BREAKFAST' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS breakfast,
      SUM(CASE WHEN mt.name = 'LUNCH' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS lunch,
      SUM(CASE WHEN mt.name = 'SNACKS' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS snacks,
      SUM(CASE WHEN mt.name = 'DINNER' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END) AS dinner,
      COUNT(CASE WHEN ma.status = 'PRESENT' THEN 1 END) AS totalPresent
    FROM meal_attendance ma
    JOIN meal_types mt ON ma.meal_type_id = mt.id
    WHERE ma.meal_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY ma.meal_date
    ORDER BY ma.meal_date ASC
  `);

  // 4. Menu Overview Statistics
  const [menuStats] = await query(`
    SELECT 
      COUNT(*) AS totalMenuItems,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeMenuItems,
      SUM(CASE WHEN special_item IS NOT NULL AND TRIM(special_item) != '' THEN 1 ELSE 0 END) AS specialItemsCount
    FROM food_menu
  `);

  // 5. Total Active Boarders (Eligible students)
  const [activeBoarders] = await query(`
    SELECT COUNT(*) AS totalBoarders
    FROM students
    WHERE status = 'ACTIVE' AND current_room_id IS NOT NULL
  `);

  // 6. Food & Mess Related Complaints
  const [messComplaints] = await query(`
    SELECT 
      c.id, c.ticket_number, c.title, c.description, c.priority, c.status, c.created_at,
      u.full_name AS student_name, s.roll_number, r.room_number
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN rooms r ON c.room_id = r.id
    WHERE c.category = 'MESS_FOOD'
    ORDER BY c.created_at DESC
    LIMIT 6
  `);

  const [messComplaintStats] = await query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved
    FROM complaints
    WHERE category = 'MESS_FOOD'
  `);

  // 7. Notifications
  const [notifRows] = await query(`
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `, [messManagerUserId]);

  const [recentNotifications] = await query(`
    SELECT id, title, message, type, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [messManagerUserId]);

  return {
    todayMenu,
    todayAttendance: {
      total: Number(todayMealStats[0]?.totalAttendance) || 0,
      breakfast: Number(todayMealStats[0]?.breakfastCount) || 0,
      lunch: Number(todayMealStats[0]?.lunchCount) || 0,
      snacks: Number(todayMealStats[0]?.snacksCount) || 0,
      dinner: Number(todayMealStats[0]?.dinnerCount) || 0,
      specialDiet: Number(todayMealStats[0]?.specialDietCount) || 0,
      packed: Number(todayMealStats[0]?.packedMealsCount) || 0,
    },
    attendanceTrends,
    menuOverview: {
      totalItems: Number(menuStats[0]?.totalMenuItems) || 0,
      activeItems: Number(menuStats[0]?.activeMenuItems) || 0,
      specialItems: Number(menuStats[0]?.specialItemsCount) || 0,
      totalBoarders: Number(activeBoarders[0]?.totalBoarders) || 0,
    },
    complaints: {
      total: Number(messComplaintStats[0]?.total) || 0,
      pending: Number(messComplaintStats[0]?.pending) || 0,
      inProgress: Number(messComplaintStats[0]?.inProgress) || 0,
      resolved: Number(messComplaintStats[0]?.resolved) || 0,
      recent: messComplaints,
    },
    notifications: {
      unreadCount: Number(notifRows[0]?.unreadCount) || 0,
      recent: recentNotifications,
    },
  };
}

/**
 * =========================================================================
 * 4. ACCOUNTANT DASHBOARD SERVICE
 * =========================================================================
 */
async function getAccountantDashboard(accountantUserId) {
  // 1. Fee Totals & Invoices Status
  const [feeStatsRows] = await query(`
    SELECT 
      COALESCE(SUM(amount_due), 0) AS totalBilled,
      COALESCE(SUM(amount_paid), 0) AS totalCollected,
      COALESCE(SUM(amount_due - amount_paid), 0) AS totalPending,
      COUNT(*) AS totalInvoices,
      SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paidInvoices,
      SUM(CASE WHEN status = 'PARTIAL' THEN 1 ELSE 0 END) AS partialInvoices,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pendingInvoices,
      SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdueInvoices,
      COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN (amount_due - amount_paid) ELSE 0 END), 0) AS overdueAmount
    FROM student_fees
  `);

  const feeStats = feeStatsRows[0] || {};
  const totalBilled = Number(feeStats.totalBilled) || 0;
  const totalCollected = Number(feeStats.totalCollected) || 0;
  const totalPending = Number(feeStats.totalPending) || 0;
  const overdueAmount = Number(feeStats.overdueAmount) || 0;
  const collectionPercentage = totalBilled > 0 ? Number(((totalCollected / totalBilled) * 100).toFixed(1)) : 0;

  // 2. Payments Data & Today's Collection
  const [paymentStatsRows] = await query(`
    SELECT 
      COUNT(*) AS totalTransactions,
      COALESCE(SUM(amount), 0) AS totalPaymentAmount,
      SUM(CASE WHEN DATE(payment_date) = CURDATE() THEN 1 ELSE 0 END) AS todayPaymentsCount,
      COALESCE(SUM(CASE WHEN DATE(payment_date) = CURDATE() THEN amount ELSE 0 END), 0) AS todayPaymentsAmount
    FROM payments
    WHERE payment_status = 'SUCCESS'
  `);

  const paymentStats = paymentStatsRows[0] || {};

  // 3. Payment Method Distribution
  const [paymentsByMethod] = await query(`
    SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS totalAmount
    FROM payments
    WHERE payment_status = 'SUCCESS'
    GROUP BY payment_method
    ORDER BY totalAmount DESC
  `);

  // 4. Monthly / Recent Collection Trend
  const [monthlyCollection] = await query(`
    SELECT 
      DATE_FORMAT(payment_date, '%Y-%m') AS monthYear,
      DATE_FORMAT(payment_date, '%b %Y') AS monthLabel,
      COUNT(*) AS transactionCount,
      COALESCE(SUM(amount), 0) AS totalAmount
    FROM payments
    WHERE payment_status = 'SUCCESS'
    GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b %Y')
    ORDER BY monthYear ASC
    LIMIT 12
  `);

  // 5. Recent Payments List with Student and Due details
  const [recentPayments] = await query(`
    SELECT 
      p.id, p.receipt_number, p.transaction_id, p.payment_method, p.amount, 
      p.payment_date, p.payment_status, p.notes,
      u.full_name AS student_name, s.roll_number, s.department,
      sf.bill_number, sf.term_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN student_fees sf ON p.student_fee_id = sf.id
    ORDER BY p.payment_date DESC
    LIMIT 8
  `);

  // 6. Fee Types Overview
  const [feeTypes] = await query(`
    SELECT id, name, frequency, description, is_active
    FROM fee_types
    WHERE is_active = 1
  `);

  // 7. Notifications
  const [notifRows] = await query(`
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `, [accountantUserId]);

  const [recentNotifications] = await query(`
    SELECT id, title, message, type, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [accountantUserId]);

  return {
    overview: {
      totalFeeAmount: totalBilled,
      totalBilled,
      totalCollected,
      totalPaid: totalCollected,
      pendingAmount: totalPending,
      totalPending,
      overdueAmount,
      collectionPercentage,
      totalInvoices: Number(feeStats.totalInvoices) || 0,
      paidInvoices: Number(feeStats.paidInvoices) || 0,
      partialInvoices: Number(feeStats.partialInvoices) || 0,
      pendingInvoices: Number(feeStats.pendingInvoices) || 0,
      overdueInvoices: Number(feeStats.overdueInvoices) || 0,
    },
    payments: {
      paymentCount: Number(paymentStats.totalTransactions) || 0,
      totalTransactions: Number(paymentStats.totalTransactions) || 0,
      totalAmount: Number(paymentStats.totalPaymentAmount) || 0,
      todayCount: Number(paymentStats.todayPaymentsCount) || 0,
      todayAmount: Number(paymentStats.todayPaymentsAmount) || 0,
      byMethod: paymentsByMethod,
      monthlyTrends: monthlyCollection,
      recent: recentPayments,
    },
    feeTypes,
    notifications: {
      unreadCount: Number(notifRows[0]?.unreadCount) || 0,
      recent: recentNotifications,
    },
  };
}

/**
 * =========================================================================
 * 5. STUDENT DASHBOARD SERVICE (Private, Isolated to Authenticated User)
 * =========================================================================
 */
async function getStudentDashboard(studentUserId) {
  // 1. Resolve Student Profile using studentUserId
  const student = await getStudentByUserId(studentUserId);
  if (!student) {
    throw new Error('Student profile not found for this user account.');
  }

  const studentId = student.id;

  // 2. Room & Hostel Information
  let hostelInfo = null;
  if (student.current_hostel_id) {
    const [hostelRows] = await query(
      `SELECT id, name, code, type, contact_phone, address FROM hostels WHERE id = ? LIMIT 1`,
      [student.current_hostel_id]
    );
    hostelInfo = hostelRows[0] || null;
  }

  let roomInfo = null;
  let roommates = [];
  if (student.current_room_id) {
    const [roomRows] = await query(
      `SELECT id, room_number, floor, room_type, capacity, occupied_count, base_rent, status 
       FROM rooms WHERE id = ? LIMIT 1`,
      [student.current_room_id]
    );
    roomInfo = roomRows[0] || null;

    // Roommates (same room, different student)
    const [roommateRows] = await query(
      `SELECT s.id, u.full_name, s.roll_number, s.department, s.year_of_study, u.phone, u.avatar_url
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.current_room_id = ? AND s.id != ? AND s.status = 'ACTIVE'`,
      [student.current_room_id, studentId]
    );
    roommates = roommateRows;
  }

  // Active Room Allocation
  const [activeAllocations] = await query(
    `SELECT a.id, a.academic_year, a.allocated_from, a.allocated_to, a.security_deposit, a.status, a.remarks
     FROM room_allocations a
     WHERE a.student_id = ? AND a.status = 'ACTIVE'
     ORDER BY a.allocated_from DESC
     LIMIT 1`,
    [studentId]
  );
  const currentAllocation = activeAllocations[0] || null;

  // 3. Fees Information for this Student
  const [studentFeeStats] = await query(
    `SELECT 
      COALESCE(SUM(amount_due), 0) AS totalPayable,
      COALESCE(SUM(amount_paid), 0) AS totalPaid,
      COALESCE(SUM(amount_due - amount_paid), 0) AS pendingAmount,
      COUNT(*) AS totalDues,
      SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paidDuesCount,
      SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdueDuesCount
    FROM student_fees
    WHERE student_id = ?`,
    [studentId]
  );

  const [studentFeeDues] = await query(
    `SELECT sf.id, sf.bill_number, sf.term_name, sf.amount_due, sf.amount_paid, sf.discount, sf.status, sf.due_date, ft.name AS fee_type_name
     FROM student_fees sf
     LEFT JOIN fee_types ft ON sf.fee_type_id = ft.id
     WHERE sf.student_id = ?
     ORDER BY sf.due_date DESC`,
    [studentId]
  );

  const [studentRecentPayments] = await query(
    `SELECT id, receipt_number, transaction_id, payment_method, amount, payment_date, payment_status, notes
     FROM payments
     WHERE student_id = ?
     ORDER BY payment_date DESC
     LIMIT 5`,
    [studentId]
  );

  // 4. Meals Information
  const [todayMenu] = await query(`
    SELECT 
      fm.id, fm.day_of_week, mt.name AS meal_type, mt.start_time, mt.end_time, 
      fm.items_description AS menu_items, fm.special_item, fm.calories_est
    FROM food_menu fm
    JOIN meal_types mt ON fm.meal_type_id = mt.id
    WHERE fm.day_of_week = UPPER(DAYNAME(CURDATE())) AND fm.is_active = 1
    ORDER BY mt.start_time ASC
  `);

  const [recentMealAttendance] = await query(
    `SELECT ma.meal_date, mt.name AS meal_type, ma.status, ma.remarks
     FROM meal_attendance ma
     JOIN meal_types mt ON ma.meal_type_id = mt.id
     WHERE ma.student_id = ?
     ORDER BY ma.meal_date DESC, mt.start_time ASC
     LIMIT 14`,
    [studentId]
  );

  const [studentMealStats] = await query(
    `SELECT 
      COUNT(*) AS totalMarked,
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
      SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
      SUM(CASE WHEN status = 'SPECIAL_REQUEST' THEN 1 ELSE 0 END) AS specialDietCount
    FROM meal_attendance
    WHERE student_id = ?`,
    [studentId]
  );

  // 5. Complaints Information
  const [studentComplaintStats] = await query(
    `SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM complaints
    WHERE student_id = ?`,
    [studentId]
  );

  const [studentRecentComplaints] = await query(
    `SELECT id, ticket_number, title, category, priority, status, created_at
     FROM complaints
     WHERE student_id = ?
     ORDER BY created_at DESC
     LIMIT 5`,
    [studentId]
  );

  // 6. Leaves Information
  const [studentLeaveStats] = await query(
    `SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) AS returned,
      SUM(CASE WHEN status = 'APPROVED' AND CURDATE() BETWEEN start_date AND end_date THEN 1 ELSE 0 END) AS currentlyOnLeave
    FROM leave_requests
    WHERE student_id = ?`,
    [studentId]
  );

  const [studentRecentLeaves] = await query(
    `SELECT id, leave_type, start_date, end_date, reason, destination_address, status, review_remarks, created_at
     FROM leave_requests
     WHERE student_id = ?
     ORDER BY created_at DESC
     LIMIT 5`,
    [studentId]
  );

  // 7. Visitors Information
  const [studentVisitorStats] = await query(
    `SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'INSIDE' THEN 1 ELSE 0 END) AS currentlyInside,
      SUM(CASE WHEN DATE(check_in_time) = CURDATE() THEN 1 ELSE 0 END) AS todayVisitors
    FROM visitors
    WHERE student_id = ?`,
    [studentId]
  );

  const [studentRecentVisitors] = await query(
    `SELECT id, visitor_name, relationship, purpose, status, check_in_time, check_out_time
     FROM visitors
     WHERE student_id = ?
     ORDER BY check_in_time DESC
     LIMIT 5`,
    [studentId]
  );

  // 8. Notifications
  const [notifRows] = await query(
    `SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = 0`,
    [studentUserId]
  );

  const [studentNotifications] = await query(
    `SELECT id, title, message, type, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 6`,
    [studentUserId]
  );

  return {
    studentProfile: {
      id: student.id,
      userId: student.user_id,
      fullName: student.full_name,
      rollNumber: student.roll_number,
      department: student.department,
      course: student.course,
      yearOfStudy: student.year_of_study,
      email: student.email,
      phone: student.phone,
      avatarUrl: student.avatar_url,
      gender: student.gender,
      bloodGroup: student.blood_group,
      admissionDate: student.admission_date,
      status: student.status,
    },
    accommodation: {
      hostel: hostelInfo,
      room: roomInfo,
      allocation: currentAllocation,
      roommates,
    },
    fees: {
      totalDue: Number(studentFeeStats[0]?.totalPayable) || 0,
      totalPayable: Number(studentFeeStats[0]?.totalPayable) || 0,
      totalPaid: Number(studentFeeStats[0]?.totalPaid) || 0,
      pendingAmount: Number(studentFeeStats[0]?.pendingAmount) || 0,
      totalDues: Number(studentFeeStats[0]?.totalDues) || 0,
      paidDuesCount: Number(studentFeeStats[0]?.paidDuesCount) || 0,
      overdueDuesCount: Number(studentFeeStats[0]?.overdueDuesCount) || 0,
      dues: studentFeeDues,
      recentPayments: studentRecentPayments,
    },
    meals: {
      todayMenu,
      recentAttendance: recentMealAttendance,
      stats: {
        totalMarked: Number(studentMealStats[0]?.totalMarked) || 0,
        presentCount: Number(studentMealStats[0]?.presentCount) || 0,
        absentCount: Number(studentMealStats[0]?.absentCount) || 0,
        specialDietCount: Number(studentMealStats[0]?.specialDietCount) || 0,
      },
    },
    complaints: {
      total: Number(studentComplaintStats[0]?.total) || 0,
      pending: Number(studentComplaintStats[0]?.pending) || 0,
      inProgress: Number(studentComplaintStats[0]?.inProgress) || 0,
      resolved: Number(studentComplaintStats[0]?.resolved) || 0,
      rejected: Number(studentComplaintStats[0]?.rejected) || 0,
      recent: studentRecentComplaints,
    },
    leaves: {
      total: Number(studentLeaveStats[0]?.total) || 0,
      pending: Number(studentLeaveStats[0]?.pending) || 0,
      approved: Number(studentLeaveStats[0]?.approved) || 0,
      rejected: Number(studentLeaveStats[0]?.rejected) || 0,
      returned: Number(studentLeaveStats[0]?.returned) || 0,
      currentlyOnLeave: Number(studentLeaveStats[0]?.currentlyOnLeave) || 0,
      recent: studentRecentLeaves,
    },
    visitors: {
      total: Number(studentVisitorStats[0]?.total) || 0,
      currentlyInside: Number(studentVisitorStats[0]?.currentlyInside) || 0,
      todayVisitors: Number(studentVisitorStats[0]?.todayVisitors) || 0,
      recent: studentRecentVisitors,
    },
    notifications: {
      unreadCount: Number(notifRows[0]?.unreadCount) || 0,
      recent: studentNotifications,
    },
  };
}

/**
 * =========================================================================
 * 6. SUMMARY DASHBOARD SERVICE
 * =========================================================================
 */
async function getDashboardSummary(user) {
  const role = user.role;

  if (role === 'ADMIN' || role === 'WARDEN') {
    const [students] = await query(`SELECT COUNT(*) AS c FROM students WHERE status = 'ACTIVE'`);
    const [rooms] = await query(`
      SELECT 
        COUNT(*) AS totalRooms,
        SUM(CASE WHEN occupied_count > 0 THEN 1 ELSE 0 END) AS occupiedRooms,
        SUM(CASE WHEN status = 'AVAILABLE' AND occupied_count = 0 THEN 1 ELSE 0 END) AS availableRooms
      FROM rooms
    `);
    const [complaints] = await query(`SELECT COUNT(*) AS c FROM complaints WHERE status = 'PENDING'`);
    const [leaves] = await query(`SELECT COUNT(*) AS c FROM leave_requests WHERE status = 'PENDING'`);
    const [visitors] = await query(`SELECT COUNT(*) AS c FROM visitors WHERE status = 'INSIDE'`);
    const [notif] = await query(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`, [user.id]);

    return {
      role,
      summary: {
        totalStudents: students[0]?.c || 0,
        totalRooms: rooms[0]?.totalRooms || 0,
        occupiedRooms: rooms[0]?.occupiedRooms || 0,
        availableRooms: rooms[0]?.availableRooms || 0,
        pendingComplaints: complaints[0]?.c || 0,
        pendingLeaves: leaves[0]?.c || 0,
        visitorsInside: visitors[0]?.c || 0,
        unreadNotifications: notif[0]?.c || 0,
      },
    };
  }

  if (role === 'MESS_MANAGER') {
    const [attendance] = await query(`
      SELECT COUNT(*) AS c FROM meal_attendance WHERE meal_date = CURDATE() AND status = 'PRESENT'
    `);
    const [complaints] = await query(`
      SELECT COUNT(*) AS c FROM complaints WHERE category = 'MESS_FOOD' AND status = 'PENDING'
    `);
    const [notif] = await query(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`, [user.id]);

    return {
      role,
      summary: {
        todayMealAttendance: attendance[0]?.c || 0,
        pendingMessComplaints: complaints[0]?.c || 0,
        unreadNotifications: notif[0]?.c || 0,
      },
    };
  }

  if (role === 'ACCOUNTANT') {
    const [dues] = await query(`
      SELECT 
        COALESCE(SUM(amount_due), 0) AS billed,
        COALESCE(SUM(amount_paid), 0) AS collected,
        COALESCE(SUM(amount_due - amount_paid), 0) AS pending
      FROM student_fees
    `);
    const [todayPay] = await query(`
      SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS amount
      FROM payments WHERE DATE(payment_date) = CURDATE() AND payment_status = 'SUCCESS'
    `);
    const [notif] = await query(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`, [user.id]);

    return {
      role,
      summary: {
        totalBilled: Number(dues[0]?.billed) || 0,
        totalCollected: Number(dues[0]?.collected) || 0,
        totalPending: Number(dues[0]?.pending) || 0,
        todayPaymentsCount: todayPay[0]?.c || 0,
        todayPaymentsAmount: Number(todayPay[0]?.amount) || 0,
        unreadNotifications: notif[0]?.c || 0,
      },
    };
  }

  if (role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) {
      return { role, summary: { unreadNotifications: 0 } };
    }

    const [dues] = await query(
      `SELECT COALESCE(SUM(amount_due - amount_paid), 0) AS pending FROM student_fees WHERE student_id = ?`,
      [student.id]
    );
    const [complaints] = await query(
      `SELECT COUNT(*) AS c FROM complaints WHERE student_id = ? AND status = 'PENDING'`,
      [student.id]
    );
    const [leaves] = await query(
      `SELECT COUNT(*) AS c FROM leave_requests WHERE student_id = ? AND status = 'PENDING'`,
      [student.id]
    );
    const [notif] = await query(
      `SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`,
      [user.id]
    );

    return {
      role,
      summary: {
        pendingFee: Number(dues[0]?.pending) || 0,
        pendingComplaints: complaints[0]?.c || 0,
        pendingLeaves: leaves[0]?.c || 0,
        unreadNotifications: notif[0]?.c || 0,
      },
    };
  }

  return { role, summary: {} };
}

module.exports = {
  getAdminDashboard,
  getWardenDashboard,
  getMessDashboard,
  getAccountantDashboard,
  getStudentDashboard,
  getDashboardSummary,
};
