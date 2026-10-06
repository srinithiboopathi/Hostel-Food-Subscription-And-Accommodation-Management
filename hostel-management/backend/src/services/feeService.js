const { pool, query } = require('../config/database');

/**
 * Helper to generate a unique Bill Number
 */
function generateBillNumber(academicYear = '') {
  const yearPrefix = (academicYear || new Date().getFullYear().toString()).replace(/[^0-9]/g, '').slice(0, 4) || '2026';
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const timestampPart = Date.now().toString().slice(-4);
  return `BILL-${yearPrefix}-${timestampPart}${randomSuffix.toString().slice(0, 3)}`;
}

/**
 * 1. Get all active fee types
 */
async function getFeeTypes() {
  const [rows] = await query(
    'SELECT id, name, frequency, description, is_active, created_at FROM fee_types WHERE is_active = TRUE ORDER BY name ASC'
  );
  return rows || [];
}

/**
 * Create a new fee type (ADMIN and ACCOUNTANT)
 */
async function createFeeType({ name, frequency = 'SEMESTER', description = '', isActive = true }) {
  const cleanName = name.trim();
  const validFrequencies = ['MONTHLY', 'SEMESTER', 'ANNUAL', 'ONE_TIME'];
  const cleanFreq = frequency.toUpperCase();

  if (!validFrequencies.includes(cleanFreq)) {
    const error = new Error(`Invalid frequency "${cleanFreq}". Allowed: ${validFrequencies.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Check unique name
  const [existing] = await query('SELECT id FROM fee_types WHERE name = ?', [cleanName]);
  if (existing.length > 0) {
    const error = new Error(`Fee type with name "${cleanName}" already exists`);
    error.statusCode = 409;
    throw error;
  }

  const [result] = await query(
    'INSERT INTO fee_types (name, frequency, description, is_active) VALUES (?, ?, ?, ?)',
    [cleanName, cleanFreq, description ? description.trim() : null, isActive ? 1 : 0]
  );

  const [rows] = await query('SELECT * FROM fee_types WHERE id = ?', [result.insertId]);
  return rows[0];
}

/**
 * Update fee type
 */
async function updateFeeType(id, { name, frequency, description, isActive }) {
  const [existing] = await query('SELECT id FROM fee_types WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Fee type not found');
    error.statusCode = 404;
    throw error;
  }

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (frequency !== undefined) {
    const cleanFreq = frequency.toUpperCase();
    const validFrequencies = ['MONTHLY', 'SEMESTER', 'ANNUAL', 'ONE_TIME'];
    if (!validFrequencies.includes(cleanFreq)) {
      const error = new Error(`Invalid frequency. Allowed: ${validFrequencies.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    updates.push('frequency = ?');
    params.push(cleanFreq);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description ? description.trim() : null);
  }
  if (isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE fee_types SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const [rows] = await query('SELECT * FROM fee_types WHERE id = ?', [id]);
  return rows[0];
}

/**
 * 2. Get paginated student fee bills with comprehensive filters
 */
async function getAllStudentFees({
  page = 1,
  limit = 15,
  search = '',
  studentId = '',
  feeTypeId = '',
  status = '',
  academicYear = '',
  dueBefore = '',
  dueAfter = '',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (studentId && studentId.toString().trim() !== '') {
    whereClauses.push('sf.student_id = ?');
    params.push(parseInt(studentId, 10));
  }

  if (feeTypeId && feeTypeId.toString().trim() !== '') {
    whereClauses.push('sf.fee_type_id = ?');
    params.push(parseInt(feeTypeId, 10));
  }

  if (status && status.trim() !== '') {
    whereClauses.push('sf.status = ?');
    params.push(status.trim().toUpperCase());
  }

  if (academicYear && academicYear.trim() !== '') {
    whereClauses.push('sf.academic_year = ?');
    params.push(academicYear.trim());
  }

  if (dueBefore && dueBefore.trim() !== '') {
    whereClauses.push('sf.due_date <= ?');
    params.push(dueBefore.trim());
  }

  if (dueAfter && dueAfter.trim() !== '') {
    whereClauses.push('sf.due_date >= ?');
    params.push(dueAfter.trim());
  }

  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`;
    whereClauses.push('(u.full_name LIKE ? OR s.roll_number LIKE ? OR sf.bill_number LIKE ?)');
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total matching records
  const countSql = `
    SELECT COUNT(*) AS total
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    ${whereSQL}
  `;
  const [countResult] = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  // Fetch paginated records with dynamic outstanding balance
  const dataSql = `
    SELECT 
      sf.id,
      sf.student_id,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      r.room_number,
      sf.fee_type_id,
      ft.name AS fee_type_name,
      ft.frequency,
      sf.bill_number,
      sf.academic_year,
      sf.term_name,
      CAST(sf.amount_due AS DOUBLE) AS amount_due,
      CAST(sf.amount_paid AS DOUBLE) AS amount_paid,
      CAST(sf.discount AS DOUBLE) AS discount,
      CAST(GREATEST(0, (sf.amount_due - sf.discount) - sf.amount_paid) AS DOUBLE) AS outstanding_balance,
      sf.due_date,
      sf.status,
      sf.created_at,
      sf.updated_at
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    ${whereSQL}
    ORDER BY sf.due_date ASC, sf.id DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSql, queryParams);

  return {
    fees: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * 3. Get single fee bill by ID
 */
async function getStudentFeeById(id) {
  const sql = `
    SELECT 
      sf.id,
      sf.student_id,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      r.room_number,
      sf.fee_type_id,
      ft.name AS fee_type_name,
      ft.frequency,
      sf.bill_number,
      sf.academic_year,
      sf.term_name,
      CAST(sf.amount_due AS DOUBLE) AS amount_due,
      CAST(sf.amount_paid AS DOUBLE) AS amount_paid,
      CAST(sf.discount AS DOUBLE) AS discount,
      CAST(GREATEST(0, (sf.amount_due - sf.discount) - sf.amount_paid) AS DOUBLE) AS outstanding_balance,
      sf.due_date,
      sf.status,
      sf.created_at,
      sf.updated_at
    FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    WHERE sf.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Student fee bill not found');
    error.statusCode = 404;
    throw error;
  }

  // Also fetch all payments made against this fee bill
  const [payments] = await query(
    `SELECT 
       p.id,
       p.receipt_number,
       p.transaction_id,
       p.payment_method,
       CAST(p.amount AS DOUBLE) AS amount,
       p.payment_date,
       p.payment_status,
       p.notes,
       u.full_name AS collected_by_name
     FROM payments p
     LEFT JOIN users u ON p.collected_by = u.id
     WHERE p.student_fee_id = ?
     ORDER BY p.payment_date DESC, p.id DESC`,
    [id]
  );

  const feeRecord = rows[0];
  feeRecord.payments = payments || [];
  return feeRecord;
}

/**
 * 4. Create Fee Bill (ADMIN & ACCOUNTANT)
 */
async function createStudentFee({
  studentId,
  feeTypeId,
  academicYear,
  termName,
  amountDue,
  discount = 0.00,
  dueDate,
  billNumber = null,
}) {
  const cleanAmountDue = parseFloat(amountDue);
  const cleanDiscount = parseFloat(discount || 0);

  if (isNaN(cleanAmountDue) || cleanAmountDue < 0) {
    const error = new Error('Amount due must be a valid non-negative number');
    error.statusCode = 400;
    throw error;
  }

  if (isNaN(cleanDiscount) || cleanDiscount < 0) {
    const error = new Error('Discount must be a valid non-negative number');
    error.statusCode = 400;
    throw error;
  }

  if (cleanDiscount > cleanAmountDue) {
    const error = new Error('Discount cannot be greater than the amount due');
    error.statusCode = 400;
    throw error;
  }

  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    const error = new Error('Valid due date is required (YYYY-MM-DD)');
    error.statusCode = 400;
    throw error;
  }

  // Verify student exists
  const [students] = await query('SELECT id, status FROM students WHERE id = ?', [studentId]);
  if (!students || students.length === 0) {
    const error = new Error('Student resident not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify fee type exists
  const [feeTypes] = await query('SELECT id, name FROM fee_types WHERE id = ? AND is_active = TRUE', [feeTypeId]);
  if (!feeTypes || feeTypes.length === 0) {
    const error = new Error('Active fee type not found');
    error.statusCode = 404;
    throw error;
  }

  // Generate unique bill number if not provided
  let targetBillNumber = billNumber ? billNumber.trim() : null;
  if (!targetBillNumber) {
    targetBillNumber = generateBillNumber(academicYear);
  }

  // Check unique bill number
  const [existingBill] = await query('SELECT id FROM student_fees WHERE bill_number = ?', [targetBillNumber]);
  if (existingBill.length > 0) {
    const error = new Error(`Bill number "${targetBillNumber}" already exists in MySQL`);
    error.statusCode = 409;
    throw error;
  }

  // Determine initial status based on due date
  const todayStr = new Date().toISOString().split('T')[0];
  let initialStatus = 'PENDING';
  if (dueDate < todayStr && (cleanAmountDue - cleanDiscount) > 0) {
    initialStatus = 'OVERDUE';
  } else if ((cleanAmountDue - cleanDiscount) === 0) {
    initialStatus = 'PAID';
  }

  const cleanYear = (academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`).trim();
  const cleanTerm = (termName || 'Academic Year').trim();

  const [result] = await query(
    `INSERT INTO student_fees (
       student_id, fee_type_id, bill_number, academic_year, term_name,
       amount_due, amount_paid, discount, due_date, status
     ) VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?)`,
    [
      parseInt(studentId, 10),
      parseInt(feeTypeId, 10),
      targetBillNumber,
      cleanYear,
      cleanTerm,
      cleanAmountDue.toFixed(2),
      cleanDiscount.toFixed(2),
      dueDate,
      initialStatus,
    ]
  );

  return await getStudentFeeById(result.insertId);
}

/**
 * 5. Update Fee Bill (dates, discount, status, term)
 */
async function updateStudentFee(id, updateData) {
  const existing = await getStudentFeeById(id);

  const updates = [];
  const params = [];

  if (updateData.academicYear !== undefined) {
    updates.push('academic_year = ?');
    params.push(updateData.academicYear.trim());
  }

  if (updateData.termName !== undefined) {
    updates.push('term_name = ?');
    params.push(updateData.termName.trim());
  }

  if (updateData.dueDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(updateData.dueDate)) {
      const error = new Error('Invalid due date format (YYYY-MM-DD)');
      error.statusCode = 400;
      throw error;
    }
    updates.push('due_date = ?');
    params.push(updateData.dueDate);
  }

  let newAmountDue = existing.amount_due;
  if (updateData.amountDue !== undefined) {
    const val = parseFloat(updateData.amountDue);
    if (isNaN(val) || val < 0) {
      const error = new Error('Amount due must be non-negative');
      error.statusCode = 400;
      throw error;
    }
    if (val < existing.amount_paid) {
      const error = new Error(`Amount due cannot be less than already paid amount (₹${existing.amount_paid})`);
      error.statusCode = 400;
      throw error;
    }
    newAmountDue = val;
    updates.push('amount_due = ?');
    params.push(val.toFixed(2));
  }

  let newDiscount = existing.discount;
  if (updateData.discount !== undefined) {
    const val = parseFloat(updateData.discount);
    if (isNaN(val) || val < 0) {
      const error = new Error('Discount must be non-negative');
      error.statusCode = 400;
      throw error;
    }
    newDiscount = val;
    updates.push('discount = ?');
    params.push(val.toFixed(2));
  }

  // Recalculate status based on amount_paid, new net due, and due_date
  const netDue = Math.max(0, newAmountDue - newDiscount);
  const targetDueDate = updateData.dueDate || existing.due_date;
  const todayStr = new Date().toISOString().split('T')[0];

  let calculatedStatus = existing.status;
  if (updateData.status && ['WAIVED'].includes(updateData.status.toUpperCase())) {
    calculatedStatus = 'WAIVED';
  } else {
    if (existing.amount_paid >= netDue) {
      calculatedStatus = 'PAID';
    } else if (existing.amount_paid > 0) {
      calculatedStatus = 'PARTIAL';
    } else if (targetDueDate < todayStr) {
      calculatedStatus = 'OVERDUE';
    } else {
      calculatedStatus = 'PENDING';
    }
  }

  updates.push('status = ?');
  params.push(calculatedStatus);

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE student_fees SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return await getStudentFeeById(id);
}

/**
 * 6. Get Student Fee Summary (Total Fees, Total Paid, Outstanding, Bills counts)
 */
async function getStudentFeeSummary(studentId) {
  // Validate student exists
  const [students] = await query(
    `SELECT s.id, s.roll_number, s.department, s.course, u.full_name AS student_name, u.email
     FROM students s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.id = ?`,
    [studentId]
  );

  if (!students || students.length === 0) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const student = students[0];

  const [feeSummaryRows] = await query(
    `SELECT 
       COALESCE(SUM(sf.amount_due - sf.discount), 0) AS total_fees,
       COALESCE(SUM(sf.amount_paid), 0) AS total_paid,
       COALESCE(SUM(GREATEST(0, (sf.amount_due - sf.discount) - sf.amount_paid)), 0) AS total_outstanding,
       COUNT(CASE WHEN sf.status = 'PENDING' THEN 1 END) AS pending_bills,
       COUNT(CASE WHEN sf.status = 'PARTIAL' THEN 1 END) AS partial_bills,
       COUNT(CASE WHEN sf.status = 'OVERDUE' THEN 1 END) AS overdue_bills,
       COUNT(CASE WHEN sf.status = 'PAID' THEN 1 END) AS paid_bills,
       COUNT(CASE WHEN sf.status = 'WAIVED' THEN 1 END) AS waived_bills,
       COUNT(sf.id) AS total_bills
     FROM student_fees sf
     WHERE sf.student_id = ?`,
    [studentId]
  );

  const [paymentSummaryRows] = await query(
    `SELECT COUNT(p.id) AS number_of_payments, COALESCE(SUM(p.amount), 0) AS total_payments_amount
     FROM payments p
     WHERE p.student_id = ? AND p.payment_status = 'SUCCESS'`,
    [studentId]
  );

  const feeSum = feeSummaryRows[0] || {};
  const paySum = paymentSummaryRows[0] || {};

  return {
    student,
    total_fees: parseFloat(feeSum.total_fees || 0),
    total_paid: parseFloat(feeSum.total_paid || 0),
    total_outstanding: parseFloat(feeSum.total_outstanding || 0),
    pending_bills: parseInt(feeSum.pending_bills || 0, 10),
    partial_bills: parseInt(feeSum.partial_bills || 0, 10),
    overdue_bills: parseInt(feeSum.overdue_bills || 0, 10),
    paid_bills: parseInt(feeSum.paid_bills || 0, 10),
    waived_bills: parseInt(feeSum.waived_bills || 0, 10),
    total_bills: parseInt(feeSum.total_bills || 0, 10),
    number_of_payments: parseInt(paySum.number_of_payments || 0, 10),
  };
}

module.exports = {
  getFeeTypes,
  createFeeType,
  updateFeeType,
  getAllStudentFees,
  getStudentFeeById,
  createStudentFee,
  updateStudentFee,
  getStudentFeeSummary,
  generateBillNumber,
};
