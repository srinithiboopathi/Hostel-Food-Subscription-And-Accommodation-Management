const { pool, query } = require('../config/database');

const VALID_ID_PROOF_TYPES = ['AADHAAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'];
const VALID_VISITOR_STATUSES = ['INSIDE', 'CHECKED_OUT', 'BLOCKED'];

/**
 * 1. Get All Visitors with pagination & filters
 */
async function getAllVisitors({
  page = 1,
  limit = 15,
  search = '',
  studentId = '',
  hostelId = '',
  status = '',
  date = '',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (studentId && studentId.toString().trim() !== '') {
    whereClauses.push('v.student_id = ?');
    params.push(parseInt(studentId, 10));
  }

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('s.current_hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  if (status && status.trim() !== '') {
    const statusUpper = status.trim().toUpperCase();
    if (VALID_VISITOR_STATUSES.includes(statusUpper)) {
      whereClauses.push('v.status = ?');
      params.push(statusUpper);
    }
  }

  if (date && date.trim() !== '') {
    whereClauses.push('DATE(v.check_in_time) = ?');
    params.push(date.trim());
  }

  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`;
    whereClauses.push('(v.visitor_name LIKE ? OR v.phone_number LIKE ? OR u.full_name LIKE ? OR s.roll_number LIKE ? OR v.purpose LIKE ?)');
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    ${whereSQL}
  `;
  const [countResult] = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  const dataSql = `
    SELECT 
      v.id,
      v.student_id,
      v.visitor_name,
      v.relationship,
      v.phone_number,
      v.id_proof_type,
      v.purpose,
      v.check_in_time,
      v.check_out_time,
      v.status,
      v.approved_by,
      v.remarks,
      v.created_at,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.room_number,
      approver.full_name AS approved_by_name,
      approver.role AS approved_by_role
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    LEFT JOIN users approver ON v.approved_by = approver.id
    ${whereSQL}
    ORDER BY 
      CASE v.status 
        WHEN 'INSIDE' THEN 1 
        WHEN 'CHECKED_OUT' THEN 2 
        ELSE 3 
      END ASC,
      v.check_in_time DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSql, queryParams);

  return {
    visitors: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * 2. Get Today's Visitors summary
 */
async function getTodayVisitors() {
  const sql = `
    SELECT 
      v.id,
      v.student_id,
      v.visitor_name,
      v.relationship,
      v.phone_number,
      v.id_proof_type,
      v.purpose,
      v.check_in_time,
      v.check_out_time,
      v.status,
      v.remarks,
      s.roll_number,
      u.full_name AS student_name,
      h.name AS hostel_name,
      r.room_number
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    WHERE DATE(v.check_in_time) = CURDATE()
    ORDER BY 
      CASE v.status WHEN 'INSIDE' THEN 1 ELSE 2 END ASC,
      v.check_in_time DESC
  `;

  const [rows] = await query(sql);

  const totalToday = rows.length;
  const currentlyInside = rows.filter((v) => v.status === 'INSIDE').length;
  const checkedOut = rows.filter((v) => v.status === 'CHECKED_OUT').length;

  return {
    summary: {
      total_today: totalToday,
      currently_inside: currentlyInside,
      checked_out: checkedOut,
    },
    visitors: rows || [],
  };
}

/**
 * 3. Get Visitor Details by ID
 */
async function getVisitorById(id) {
  const sql = `
    SELECT 
      v.id,
      v.student_id,
      v.visitor_name,
      v.relationship,
      v.phone_number,
      v.id_proof_type,
      v.purpose,
      v.check_in_time,
      v.check_out_time,
      v.status,
      v.approved_by,
      v.remarks,
      v.created_at,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.room_number,
      approver.full_name AS approved_by_name,
      approver.role AS approved_by_role
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    LEFT JOIN users approver ON v.approved_by = approver.id
    WHERE v.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Visitor log not found');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
}

/**
 * 4. Register a new Visitor (Check-in)
 */
async function registerVisitor({
  studentId,
  visitorName,
  relationship,
  phoneNumber,
  idProofType = 'AADHAAR',
  idProofNumber,
  purpose,
  remarks = null,
  approvedBy = null,
}) {
  if (!visitorName || visitorName.trim() === '') {
    const error = new Error('Visitor name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!relationship || relationship.trim() === '') {
    const error = new Error('Relationship to student is required');
    error.statusCode = 400;
    throw error;
  }

  if (!phoneNumber || phoneNumber.trim() === '') {
    const error = new Error('Visitor phone number is required');
    error.statusCode = 400;
    throw error;
  }

  if (!idProofNumber || idProofNumber.trim() === '') {
    const error = new Error('ID proof number is required');
    error.statusCode = 400;
    throw error;
  }

  if (!purpose || purpose.trim() === '') {
    const error = new Error('Purpose of visit is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanProofType = (idProofType || 'AADHAAR').trim().toUpperCase();
  if (!VALID_ID_PROOF_TYPES.includes(cleanProofType)) {
    const error = new Error(`Invalid ID proof type "${cleanProofType}". Allowed: ${VALID_ID_PROOF_TYPES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Validate student exists
  const [students] = await query('SELECT id FROM students WHERE id = ?', [studentId]);
  if (!students || students.length === 0) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }

  const [insertResult] = await query(
    `INSERT INTO visitors (
       student_id, visitor_name, relationship, phone_number, id_proof_type, id_proof_number,
       purpose, check_in_time, status, approved_by, remarks
     ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'INSIDE', ?, ?)`,
    [
      studentId,
      visitorName.trim(),
      relationship.trim(),
      phoneNumber.trim(),
      cleanProofType,
      idProofNumber.trim(),
      purpose.trim(),
      approvedBy,
      remarks ? remarks.trim() : null,
    ]
  );

  return await getVisitorById(insertResult.insertId);
}

/**
 * 5. Check out Visitor
 */
async function checkoutVisitor(id, { remarks = null, checkOutTime = null } = {}) {
  const [existing] = await query('SELECT * FROM visitors WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Visitor record not found');
    error.statusCode = 404;
    throw error;
  }

  const current = existing[0];
  if (current.status === 'CHECKED_OUT') {
    const error = new Error('Visitor has already been checked out');
    error.statusCode = 400;
    throw error;
  }

  const exitTime = checkOutTime ? new Date(checkOutTime) : new Date();
  const updatedRemarks = remarks
    ? (current.remarks ? `${current.remarks} | Exit: ${remarks}` : `Exit: ${remarks}`)
    : current.remarks;

  await query(
    `UPDATE visitors 
     SET status = 'CHECKED_OUT', check_out_time = ?, remarks = ? 
     WHERE id = ?`,
    [exitTime, updatedRemarks, id]
  );

  return await getVisitorById(id);
}

/**
 * 6. Update Visitor record
 */
async function updateVisitor(id, {
  status,
  remarks,
  approvedBy,
  checkOutTime,
}) {
  const [existing] = await query('SELECT * FROM visitors WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Visitor record not found');
    error.statusCode = 404;
    throw error;
  }

  const updates = [];
  const params = [];

  if (status) {
    const cleanStatus = status.trim().toUpperCase();
    if (!VALID_VISITOR_STATUSES.includes(cleanStatus)) {
      const error = new Error(`Invalid visitor status "${cleanStatus}". Allowed: ${VALID_VISITOR_STATUSES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    updates.push('status = ?');
    params.push(cleanStatus);

    if (cleanStatus === 'CHECKED_OUT' && !existing[0].check_out_time && !checkOutTime) {
      updates.push('check_out_time = NOW()');
    }
  }

  if (checkOutTime) {
    updates.push('check_out_time = ?');
    params.push(new Date(checkOutTime));
  }

  if (remarks !== undefined) {
    updates.push('remarks = ?');
    params.push(remarks);
  }

  if (approvedBy) {
    updates.push('approved_by = ?');
    params.push(approvedBy);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE visitors SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return await getVisitorById(id);
}

/**
 * 7. Delete Visitor Log (Admin only)
 */
async function deleteVisitor(id) {
  const [existing] = await query('SELECT id FROM visitors WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Visitor record not found');
    error.statusCode = 404;
    throw error;
  }

  await query('DELETE FROM visitors WHERE id = ?', [id]);
  return { id, deleted: true };
}

/**
 * 8. Visitor Statistics via SQL Aggregations
 */
async function getVisitorStatistics() {
  // 1. Overview counts
  const [overviewRows] = await query(`
    SELECT 
      COUNT(id) AS total_visitors,
      COUNT(CASE WHEN status = 'INSIDE' THEN 1 END) AS currently_inside,
      COUNT(CASE WHEN status = 'CHECKED_OUT' THEN 1 END) AS checked_out,
      COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END) AS blocked,
      COUNT(CASE WHEN DATE(check_in_time) = CURDATE() THEN 1 END) AS today_total,
      COUNT(CASE WHEN DATE(check_in_time) = CURDATE() AND status = 'INSIDE' THEN 1 END) AS today_inside
    FROM visitors
  `);

  // 2. Proof Type Distribution
  const [proofRows] = await query(`
    SELECT 
      id_proof_type,
      COUNT(id) AS count
    FROM visitors
    GROUP BY id_proof_type
    ORDER BY count DESC
  `);

  // 3. Monthly Trends (Past 6 Months)
  const [monthlyRows] = await query(`
    SELECT 
      DATE_FORMAT(check_in_time, '%b %Y') AS month_label,
      DATE_FORMAT(check_in_time, '%Y-%m') AS month_key,
      COUNT(id) AS total_visitors
    FROM visitors
    WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(check_in_time, '%Y-%m'), DATE_FORMAT(check_in_time, '%b %Y')
    ORDER BY month_key ASC
  `);

  const overview = overviewRows[0] || {};

  return {
    overview: {
      total_visitors: parseInt(overview.total_visitors || 0, 10),
      currently_inside: parseInt(overview.currently_inside || 0, 10),
      checked_out: parseInt(overview.checked_out || 0, 10),
      blocked: parseInt(overview.blocked || 0, 10),
      today_total: parseInt(overview.today_total || 0, 10),
      today_inside: parseInt(overview.today_inside || 0, 10),
    },
    id_proof_distribution: proofRows.map((p) => ({
      type: p.id_proof_type,
      count: parseInt(p.count || 0, 10),
    })),
    monthly_trends: monthlyRows.map((m) => ({
      month: m.month_label,
      key: m.month_key,
      total: parseInt(m.total_visitors || 0, 10),
    })),
  };
}

module.exports = {
  getAllVisitors,
  getTodayVisitors,
  getVisitorById,
  registerVisitor,
  checkoutVisitor,
  updateVisitor,
  deleteVisitor,
  getVisitorStatistics,
  VALID_ID_PROOF_TYPES,
  VALID_VISITOR_STATUSES,
};
