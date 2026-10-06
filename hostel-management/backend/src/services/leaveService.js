const { pool, query } = require('../config/database');

const VALID_LEAVE_TYPES = ['HOME_VISIT', 'MEDICAL', 'ACADEMIC_EVENT', 'EMERGENCY', 'OTHER'];
const VALID_LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RETURNED'];

/**
 * 1. Get All Leave Requests with comprehensive filters & pagination
 */
async function getAllLeaves({
  page = 1,
  limit = 15,
  search = '',
  studentId = '',
  hostelId = '',
  status = '',
  leaveType = '',
  startDate = '',
  endDate = '',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (studentId && studentId.toString().trim() !== '') {
    whereClauses.push('l.student_id = ?');
    params.push(parseInt(studentId, 10));
  }

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('s.current_hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  if (status && status.trim() !== '') {
    const statusUpper = status.trim().toUpperCase();
    if (VALID_LEAVE_STATUSES.includes(statusUpper)) {
      whereClauses.push('l.status = ?');
      params.push(statusUpper);
    }
  }

  if (leaveType && leaveType.trim() !== '') {
    const typeUpper = leaveType.trim().toUpperCase();
    if (VALID_LEAVE_TYPES.includes(typeUpper)) {
      whereClauses.push('l.leave_type = ?');
      params.push(typeUpper);
    }
  }

  if (startDate && startDate.trim() !== '') {
    whereClauses.push('l.start_date >= ?');
    params.push(startDate.trim());
  }

  if (endDate && endDate.trim() !== '') {
    whereClauses.push('l.end_date <= ?');
    params.push(endDate.trim());
  }

  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`;
    whereClauses.push('(u.full_name LIKE ? OR s.roll_number LIKE ? OR l.reason LIKE ? OR l.destination_address LIKE ?)');
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM leave_requests l
    JOIN students s ON l.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    ${whereSQL}
  `;
  const [countResult] = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  const dataSql = `
    SELECT 
      l.id,
      l.student_id,
      l.leave_type,
      l.start_date,
      l.end_date,
      DATEDIFF(l.end_date, l.start_date) + 1 AS duration_days,
      l.reason,
      l.destination_address,
      l.emergency_contact,
      l.status,
      l.reviewed_by,
      l.review_remarks,
      l.actual_return_time,
      l.created_at,
      l.updated_at,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.room_number,
      reviewer.full_name AS reviewed_by_name,
      reviewer.role AS reviewed_by_role
    FROM leave_requests l
    JOIN students s ON l.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    LEFT JOIN users reviewer ON l.reviewed_by = reviewer.id
    ${whereSQL}
    ORDER BY 
      CASE l.status 
        WHEN 'PENDING' THEN 1 
        WHEN 'APPROVED' THEN 2 
        WHEN 'RETURNED' THEN 3 
        WHEN 'REJECTED' THEN 4 
        ELSE 5 
      END ASC,
      l.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSql, queryParams);

  return {
    leaves: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * 2. Get Leave Request Details by ID
 */
async function getLeaveById(id) {
  const sql = `
    SELECT 
      l.id,
      l.student_id,
      l.leave_type,
      l.start_date,
      l.end_date,
      DATEDIFF(l.end_date, l.start_date) + 1 AS duration_days,
      l.reason,
      l.destination_address,
      l.emergency_contact,
      l.status,
      l.reviewed_by,
      l.review_remarks,
      l.actual_return_time,
      l.created_at,
      l.updated_at,
      s.roll_number,
      s.department,
      s.course,
      s.guardian_name,
      s.guardian_phone,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.room_number,
      r.floor AS room_floor,
      reviewer.full_name AS reviewed_by_name,
      reviewer.role AS reviewed_by_role
    FROM leave_requests l
    JOIN students s ON l.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    LEFT JOIN users reviewer ON l.reviewed_by = reviewer.id
    WHERE l.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Leave request not found');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
}

/**
 * 3. Create a new Leave Request
 */
async function createLeave({
  studentId,
  leaveType = 'HOME_VISIT',
  startDate,
  endDate,
  reason,
  destinationAddress,
  emergencyContact,
}) {
  if (!startDate || !endDate) {
    const error = new Error('Start date and end date are required');
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const error = new Error('Invalid date format. Use YYYY-MM-DD');
    error.statusCode = 400;
    throw error;
  }

  if (end < start) {
    const error = new Error('End date cannot be earlier than start date');
    error.statusCode = 400;
    throw error;
  }

  if (!reason || reason.trim() === '') {
    const error = new Error('Reason for leave is required');
    error.statusCode = 400;
    throw error;
  }

  if (!destinationAddress || destinationAddress.trim() === '') {
    const error = new Error('Destination address is required');
    error.statusCode = 400;
    throw error;
  }

  if (!emergencyContact || emergencyContact.trim() === '') {
    const error = new Error('Emergency contact number is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanType = (leaveType || 'HOME_VISIT').trim().toUpperCase();
  if (!VALID_LEAVE_TYPES.includes(cleanType)) {
    const error = new Error(`Invalid leave type "${cleanType}". Allowed: ${VALID_LEAVE_TYPES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Validate student exists and is active
  const [students] = await query(
    `SELECT s.id, s.user_id, s.status, s.guardian_phone 
     FROM students s 
     WHERE s.id = ?`,
    [studentId]
  );

  if (!students || students.length === 0) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }

  const [insertResult] = await query(
    `INSERT INTO leave_requests (
       student_id, leave_type, start_date, end_date, reason, destination_address, emergency_contact, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [
      studentId,
      cleanType,
      startDate,
      endDate,
      reason.trim(),
      destinationAddress.trim(),
      emergencyContact.trim(),
    ]
  );

  return await getLeaveById(insertResult.insertId);
}

/**
 * 4. Update Leave Status (Approve / Reject / Return / Cancel)
 */
async function updateLeaveStatus(id, {
  status,
  reviewRemarks = null,
  reviewerId = null,
  actualReturnTime = null,
}) {
  if (!status) {
    const error = new Error('Status is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanStatus = status.trim().toUpperCase();
  if (!VALID_LEAVE_STATUSES.includes(cleanStatus)) {
    const error = new Error(`Invalid status "${cleanStatus}". Allowed: ${VALID_LEAVE_STATUSES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Check if leave exists
  const [existing] = await query('SELECT * FROM leave_requests WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Leave request not found');
    error.statusCode = 404;
    throw error;
  }

  const current = existing[0];
  const updates = ['status = ?'];
  const params = [cleanStatus];

  if (reviewerId) {
    updates.push('reviewed_by = ?');
    params.push(reviewerId);
  }

  if (reviewRemarks !== undefined) {
    updates.push('review_remarks = ?');
    params.push(reviewRemarks);
  }

  if (cleanStatus === 'RETURNED') {
    updates.push('actual_return_time = ?');
    params.push(actualReturnTime || new Date());
  }

  params.push(id);
  await query(`UPDATE leave_requests SET ${updates.join(', ')} WHERE id = ?`, params);

  return await getLeaveById(id);
}

/**
 * 5. Delete Leave Request (Only for pending requests or Admin)
 */
async function deleteLeave(id) {
  const [existing] = await query('SELECT id, status FROM leave_requests WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Leave request not found');
    error.statusCode = 404;
    throw error;
  }

  await query('DELETE FROM leave_requests WHERE id = ?', [id]);
  return { id, deleted: true };
}

/**
 * 6. Leave Statistics and Analytics via SQL Aggregations
 */
async function getLeaveStatistics() {
  // 1. Overall Status Overview
  const [overviewRows] = await query(`
    SELECT 
      COUNT(id) AS total_requests,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_count,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approved_count,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) AS rejected_count,
      COUNT(CASE WHEN status = 'RETURNED' THEN 1 END) AS returned_count,
      COUNT(CASE WHEN status = 'APPROVED' AND CURDATE() BETWEEN start_date AND end_date THEN 1 END) AS currently_on_leave,
      COUNT(CASE WHEN status = 'APPROVED' AND start_date = CURDATE() THEN 1 END) AS today_departures,
      COUNT(CASE WHEN status = 'APPROVED' AND end_date = CURDATE() THEN 1 END) AS today_expected_returns
    FROM leave_requests
  `);

  // 2. Leave Type Distribution
  const [typeDistribution] = await query(`
    SELECT 
      leave_type,
      COUNT(id) AS count,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approved_count
    FROM leave_requests
    GROUP BY leave_type
    ORDER BY count DESC
  `);

  // 3. Department Breakdown
  const [deptDistribution] = await query(`
    SELECT 
      s.department,
      COUNT(l.id) AS total_requests,
      COUNT(CASE WHEN l.status = 'APPROVED' THEN 1 END) AS approved_requests
    FROM leave_requests l
    JOIN students s ON l.student_id = s.id
    GROUP BY s.department
    ORDER BY total_requests DESC
  `);

  // 4. Monthly Trend (Past 6 Months)
  const [monthlyTrends] = await query(`
    SELECT 
      DATE_FORMAT(start_date, '%b %Y') AS month_label,
      DATE_FORMAT(start_date, '%Y-%m') AS month_key,
      COUNT(id) AS total_leaves,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approved_leaves
    FROM leave_requests
    WHERE start_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(start_date, '%Y-%m'), DATE_FORMAT(start_date, '%b %Y')
    ORDER BY month_key ASC
  `);

  const overview = overviewRows[0] || {};

  return {
    overview: {
      total_requests: parseInt(overview.total_requests || 0, 10),
      pending_count: parseInt(overview.pending_count || 0, 10),
      approved_count: parseInt(overview.approved_count || 0, 10),
      rejected_count: parseInt(overview.rejected_count || 0, 10),
      returned_count: parseInt(overview.returned_count || 0, 10),
      currently_on_leave: parseInt(overview.currently_on_leave || 0, 10),
      today_departures: parseInt(overview.today_departures || 0, 10),
      today_expected_returns: parseInt(overview.today_expected_returns || 0, 10),
    },
    leave_type_distribution: typeDistribution.map((t) => ({
      leave_type: t.leave_type,
      count: parseInt(t.count || 0, 10),
      approved: parseInt(t.approved_count || 0, 10),
    })),
    department_distribution: deptDistribution.map((d) => ({
      department: d.department,
      total: parseInt(d.total_requests || 0, 10),
      approved: parseInt(d.approved_requests || 0, 10),
    })),
    monthly_trends: monthlyTrends.map((m) => ({
      month: m.month_label,
      key: m.month_key,
      total: parseInt(m.total_leaves || 0, 10),
      approved: parseInt(m.approved_leaves || 0, 10),
    })),
  };
}

module.exports = {
  getAllLeaves,
  getLeaveById,
  createLeave,
  updateLeaveStatus,
  deleteLeave,
  getLeaveStatistics,
  VALID_LEAVE_TYPES,
  VALID_LEAVE_STATUSES,
};
