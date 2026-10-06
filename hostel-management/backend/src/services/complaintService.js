const { pool, query } = require('../config/database');

/**
 * Helper to generate a unique Ticket Number (TCK-YYYY-XXXXXX)
 */
function generateTicketNumber() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const timeSlice = Date.now().toString().slice(-4);
  return `TCK-${year}-${timeSlice}${randomSuffix.toString().slice(0, 3)}`;
}

const VALID_CATEGORIES = [
  'ROOM_MAINTENANCE',
  'ELECTRICAL',
  'PLUMBING',
  'MESS_FOOD',
  'CLEANLINESS',
  'INTERNET',
  'SECURITY',
  'NOISE',
  'OTHER',
];

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

/**
 * 1. Get Paginated Complaints with Comprehensive Filters
 */
async function getAllComplaints({
  page = 1,
  limit = 15,
  search = '',
  studentId = '',
  hostelId = '',
  roomId = '',
  category = '',
  status = '',
  priority = '',
  assignedTo = '',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (studentId && studentId.toString().trim() !== '') {
    whereClauses.push('c.student_id = ?');
    params.push(parseInt(studentId, 10));
  }

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('s.current_hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  if (roomId && roomId.toString().trim() !== '') {
    whereClauses.push('c.room_id = ?');
    params.push(parseInt(roomId, 10));
  }

  if (category && category.trim() !== '') {
    const catUpper = category.trim().toUpperCase();
    if (VALID_CATEGORIES.includes(catUpper)) {
      whereClauses.push('c.category = ?');
      params.push(catUpper);
    }
  }

  if (status && status.trim() !== '') {
    const statusUpper = status.trim().toUpperCase();
    if (VALID_STATUSES.includes(statusUpper)) {
      whereClauses.push('c.status = ?');
      params.push(statusUpper);
    }
  }

  if (priority && priority.trim() !== '') {
    const prioUpper = priority.trim().toUpperCase();
    if (VALID_PRIORITIES.includes(prioUpper)) {
      whereClauses.push('c.priority = ?');
      params.push(prioUpper);
    }
  }

  if (assignedTo && assignedTo.toString().trim() !== '') {
    whereClauses.push('c.assigned_to = ?');
    params.push(parseInt(assignedTo, 10));
  }

  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`;
    whereClauses.push('(c.ticket_number LIKE ? OR c.title LIKE ? OR u.full_name LIKE ? OR s.roll_number LIKE ?)');
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN users assignee ON c.assigned_to = assignee.id
    ${whereSQL}
  `;
  const [countResult] = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  const dataSql = `
    SELECT 
      c.id,
      c.ticket_number,
      c.student_id,
      c.room_id,
      c.category,
      c.title,
      c.description,
      c.priority,
      c.status,
      c.assigned_to,
      c.created_at,
      c.updated_at,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.room_number,
      assignee.full_name AS assigned_to_name,
      assignee.role AS assigned_to_role
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN users assignee ON c.assigned_to = assignee.id
    ${whereSQL}
    ORDER BY 
      CASE c.priority 
        WHEN 'URGENT' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
        ELSE 5 
      END ASC,
      c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSql, queryParams);

  return {
    complaints: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * 2. Get Complaint by ID including full history timeline
 */
async function getComplaintById(id) {
  const sql = `
    SELECT 
      c.id,
      c.ticket_number,
      c.student_id,
      c.room_id,
      c.category,
      c.title,
      c.description,
      c.priority,
      c.status,
      c.assigned_to,
      c.created_at,
      c.updated_at,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.room_number,
      r.floor AS room_floor,
      assignee.full_name AS assigned_to_name,
      assignee.role AS assigned_to_role
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN users assignee ON c.assigned_to = assignee.id
    WHERE c.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Complaint ticket not found');
    error.statusCode = 404;
    throw error;
  }

  const complaint = rows[0];

  // Fetch full update history trail from complaint_updates table
  const [historyRows] = await query(
    `SELECT 
       cu.id,
       cu.complaint_id,
       cu.updated_by,
       cu.status_from,
       cu.status_to,
       cu.remarks,
       cu.created_at,
       u.full_name AS updated_by_name,
       u.role AS updated_by_role
     FROM complaint_updates cu
     JOIN users u ON cu.updated_by = u.id
     WHERE cu.complaint_id = ?
     ORDER BY cu.created_at ASC, cu.id ASC`,
    [id]
  );

  complaint.updates = historyRows || [];
  return complaint;
}

/**
 * 3. Create a new Complaint Ticket
 */
async function createComplaint({
  studentId,
  roomId = null,
  category,
  title,
  description,
  priority = 'MEDIUM',
  userId,
}) {
  if (!title || title.trim() === '') {
    const error = new Error('Complaint title is required');
    error.statusCode = 400;
    throw error;
  }

  if (!description || description.trim() === '') {
    const error = new Error('Complaint description is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanCategory = (category || '').trim().toUpperCase();
  if (!VALID_CATEGORIES.includes(cleanCategory)) {
    const error = new Error(`Invalid category "${cleanCategory}". Allowed: ${VALID_CATEGORIES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const cleanPriority = (priority || 'MEDIUM').trim().toUpperCase();
  if (!VALID_PRIORITIES.includes(cleanPriority)) {
    const error = new Error(`Invalid priority "${cleanPriority}". Allowed: ${VALID_PRIORITIES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Validate student exists
  const [students] = await query(
    `SELECT s.id, s.user_id, s.current_hostel_id, s.current_room_id 
     FROM students s 
     WHERE s.id = ?`,
    [studentId]
  );

  if (!students || students.length === 0) {
    const error = new Error('Student resident profile not found');
    error.statusCode = 404;
    throw error;
  }

  const student = students[0];
  const targetRoomId = roomId ? parseInt(roomId, 10) : (student.current_room_id || null);

  // Generate unique Ticket Number
  let ticketNumber = generateTicketNumber();
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 5) {
    const [existing] = await query('SELECT id FROM complaints WHERE ticket_number = ?', [ticketNumber]);
    if (existing.length === 0) {
      isUnique = true;
    } else {
      ticketNumber = generateTicketNumber();
      attempts++;
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insert complaint
    const [insertResult] = await connection.query(
      `INSERT INTO complaints (
         ticket_number, student_id, room_id, category, title, description, priority, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        ticketNumber,
        student.id,
        targetRoomId,
        cleanCategory,
        title.trim(),
        description.trim(),
        cleanPriority,
      ]
    );

    const newComplaintId = insertResult.insertId;

    // 2. Insert initial audit trail record in complaint_updates
    await connection.query(
      `INSERT INTO complaint_updates (
         complaint_id, updated_by, status_from, status_to, remarks
       ) VALUES (?, ?, NULL, 'PENDING', ?)`,
      [
        newComplaintId,
        userId || student.user_id,
        'Grievance ticket registered and pending staff assignment.',
      ]
    );

    await connection.commit();

    return await getComplaintById(newComplaintId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 4. Update Complaint (Status, Priority, Assign Staff, Remarks) with MySQL ACID Transaction
 */
async function updateComplaint(id, {
  status,
  priority,
  assignedTo,
  remarks,
  userId,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock and get current complaint
    const [rows] = await connection.query(
      'SELECT * FROM complaints WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!rows || rows.length === 0) {
      const error = new Error('Complaint ticket not found');
      error.statusCode = 404;
      throw error;
    }

    const current = rows[0];
    const updates = [];
    const params = [];
    let statusChanged = false;
    let newStatus = current.status;

    if (status !== undefined) {
      const cleanStatus = status.trim().toUpperCase();
      if (!VALID_STATUSES.includes(cleanStatus)) {
        const error = new Error(`Invalid status "${cleanStatus}". Allowed: ${VALID_STATUSES.join(', ')}`);
        error.statusCode = 400;
        throw error;
      }
      if (cleanStatus !== current.status) {
        statusChanged = true;
        newStatus = cleanStatus;
        updates.push('status = ?');
        params.push(cleanStatus);
      }
    }

    if (priority !== undefined) {
      const cleanPriority = priority.trim().toUpperCase();
      if (!VALID_PRIORITIES.includes(cleanPriority)) {
        const error = new Error(`Invalid priority "${cleanPriority}". Allowed: ${VALID_PRIORITIES.join(', ')}`);
        error.statusCode = 400;
        throw error;
      }
      updates.push('priority = ?');
      params.push(cleanPriority);
    }

    let assignmentChanged = false;
    let newAssigneeId = current.assigned_to;
    if (assignedTo !== undefined) {
      const targetAssignee = assignedTo ? parseInt(assignedTo, 10) : null;
      if (targetAssignee !== current.assigned_to) {
        assignmentChanged = true;
        newAssigneeId = targetAssignee;
        updates.push('assigned_to = ?');
        params.push(targetAssignee);

        // Auto transition status to IN_PROGRESS if assigning a pending complaint
        if (targetAssignee && current.status === 'PENDING' && !status) {
          statusChanged = true;
          newStatus = 'IN_PROGRESS';
          updates.push('status = ?');
          params.push('IN_PROGRESS');
        }
      }
    }

    if (updates.length > 0) {
      params.push(id);
      await connection.query(`UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Insert history record in complaint_updates if status/assignment changed or remarks provided
    const note = remarks && remarks.trim() !== ''
      ? remarks.trim()
      : (statusChanged
          ? `Status changed from ${current.status} to ${newStatus}.`
          : (assignmentChanged
              ? `Assigned to staff user ID ${newAssigneeId || 'Unassigned'}.`
              : 'Complaint details updated.'));

    await connection.query(
      `INSERT INTO complaint_updates (
         complaint_id, updated_by, status_from, status_to, remarks
       ) VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        current.status,
        newStatus,
        note,
      ]
    );

    await connection.commit();

    return await getComplaintById(id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 5. Delete Complaint (ADMIN Only)
 */
async function deleteComplaint(id) {
  const [existing] = await query('SELECT id, ticket_number FROM complaints WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Complaint ticket not found');
    error.statusCode = 404;
    throw error;
  }

  await query('DELETE FROM complaints WHERE id = ?', [id]);
  return { id, ticket_number: existing[0].ticket_number, deleted: true };
}

/**
 * 6. Real Complaint Analytics & Statistics via MySQL Aggregations
 */
async function getComplaintStatistics() {
  // 1. Status Counts
  const [statusStats] = await query(`
    SELECT 
      COUNT(id) AS total_complaints,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_count,
      COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) AS in_progress_count,
      COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS resolved_count,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) AS rejected_count,
      COUNT(CASE WHEN priority IN ('HIGH', 'URGENT') AND status IN ('PENDING', 'IN_PROGRESS') THEN 1 END) AS high_priority_open,
      COUNT(CASE WHEN assigned_to IS NULL AND status = 'PENDING' THEN 1 END) AS unassigned_count
    FROM complaints
  `);

  // 2. Category Distribution
  const [categoryStats] = await query(`
    SELECT 
      category,
      COUNT(id) AS count,
      COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS resolved_count
    FROM complaints
    GROUP BY category
    ORDER BY count DESC
  `);

  // 3. Priority Distribution
  const [priorityStats] = await query(`
    SELECT 
      priority,
      COUNT(id) AS count
    FROM complaints
    GROUP BY priority
    ORDER BY 
      CASE priority 
        WHEN 'URGENT' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
      END
  `);

  // 4. Monthly Trend (Past 6 Months)
  const [monthlyStats] = await query(`
    SELECT 
      DATE_FORMAT(created_at, '%b %Y') AS month_label,
      DATE_FORMAT(created_at, '%Y-%m') AS month_key,
      COUNT(id) AS total_raised,
      COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS total_resolved
    FROM complaints
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
    ORDER BY month_key ASC
  `);

  // 5. Staff assignees for dropdown list (Admins, Wardens, Staff)
  const [staffList] = await query(`
    SELECT u.id, u.full_name, u.role, u.email, s.designation, s.department
    FROM users u
    LEFT JOIN staff s ON u.id = s.user_id
    WHERE u.role IN ('ADMIN', 'WARDEN', 'MESS_MANAGER') AND u.status = 'ACTIVE'
    ORDER BY u.full_name ASC
  `);

  const overview = statusStats[0] || {};

  return {
    overview: {
      total_complaints: parseInt(overview.total_complaints || 0, 10),
      pending_count: parseInt(overview.pending_count || 0, 10),
      in_progress_count: parseInt(overview.in_progress_count || 0, 10),
      resolved_count: parseInt(overview.resolved_count || 0, 10),
      rejected_count: parseInt(overview.rejected_count || 0, 10),
      high_priority_open: parseInt(overview.high_priority_open || 0, 10),
      unassigned_count: parseInt(overview.unassigned_count || 0, 10),
    },
    category_distribution: categoryStats.map(c => ({
      category: c.category,
      count: parseInt(c.count || 0, 10),
      resolved: parseInt(c.resolved_count || 0, 10),
    })),
    priority_distribution: priorityStats.map(p => ({
      priority: p.priority,
      count: parseInt(p.count || 0, 10),
    })),
    monthly_trends: monthlyStats.map(m => ({
      month: m.month_label,
      key: m.month_key,
      raised: parseInt(m.total_raised || 0, 10),
      resolved: parseInt(m.total_resolved || 0, 10),
    })),
    staff_list: staffList || [],
  };
}

module.exports = {
  getAllComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  getComplaintStatistics,
  generateTicketNumber,
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  VALID_STATUSES,
};
