const { pool, query } = require('../config/database');
const notificationService = require('./notificationService');

/**
 * Generate unique Receipt Number (REC-YYYY-XXXXXX)
 */
function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const timeSlice = Date.now().toString().slice(-4);
  return `REC-${year}-${timeSlice}${randomSuffix.toString().slice(0, 3)}`;
}

/**
 * 1. Record Payment using MySQL Transaction (ACID Guaranteed)
 */
async function recordPayment({
  studentFeeId,
  amount,
  paymentMethod = 'UPI',
  transactionId = null,
  paymentDate = null,
  collectedBy = null,
  notes = '',
}) {
  const cleanAmount = parseFloat(amount);
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    const error = new Error('Payment amount must be a positive number greater than 0');
    error.statusCode = 400;
    throw error;
  }

  const validMethods = ['UPI', 'CARD', 'NET_BANKING', 'CASH', 'CHEQUE', 'DEMAND_DRAFT'];
  const cleanMethod = paymentMethod.toString().trim().toUpperCase();
  if (!validMethods.includes(cleanMethod)) {
    const error = new Error(`Invalid payment method "${cleanMethod}". Allowed: ${validMethods.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock and fetch student fee record
    const [feeRows] = await connection.query(
      'SELECT * FROM student_fees WHERE id = ? FOR UPDATE',
      [studentFeeId]
    );

    if (!feeRows || feeRows.length === 0) {
      const error = new Error('Student fee bill not found');
      error.statusCode = 404;
      throw error;
    }

    const fee = feeRows[0];
    if (fee.status === 'CANCELLED' || fee.status === 'WAIVED') {
      const error = new Error(`Cannot record payment for a ${fee.status} fee bill.`);
      error.statusCode = 400;
      throw error;
    }

    const amountDue = parseFloat(fee.amount_due);
    const discount = parseFloat(fee.discount || 0);
    const currentPaid = parseFloat(fee.amount_paid || 0);
    const netDue = Math.max(0, amountDue - discount);
    const remainingBalance = Math.max(0, netDue - currentPaid);

    // 2. Overpayment Protection
    if (cleanAmount > (remainingBalance + 0.001)) {
      const error = new Error(
        `Payment amount (₹${cleanAmount.toFixed(2)}) exceeds outstanding balance (₹${remainingBalance.toFixed(2)})`
      );
      error.statusCode = 409;
      throw error;
    }

    // 2.5 Duplicate Transaction Reference Prevention
    if (transactionId && transactionId.toString().trim() !== '') {
      const [dupTxn] = await connection.query(
        'SELECT id FROM payments WHERE transaction_id = ? AND payment_status = "SUCCESS"',
        [transactionId.toString().trim()]
      );
      if (dupTxn && dupTxn.length > 0) {
        const error = new Error(`Transaction reference "${transactionId.toString().trim()}" has already been used.`);
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Generate unique receipt number
    let receiptNumber = generateReceiptNumber();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const [existing] = await connection.query(
        'SELECT id FROM payments WHERE receipt_number = ?',
        [receiptNumber]
      );
      if (existing.length === 0) {
        isUnique = true;
      } else {
        receiptNumber = generateReceiptNumber();
        attempts++;
      }
    }

    // Determine target payment date
    let targetDate = paymentDate ? new Date(paymentDate) : new Date();
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date();
    }
    const formattedDate = targetDate.toISOString().slice(0, 19).replace('T', ' ');

    // 4. Insert payment record
    const [payResult] = await connection.query(
      `INSERT INTO payments (
         student_fee_id, student_id, receipt_number, transaction_id,
         payment_method, amount, payment_date, payment_status, collected_by, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?)`,
      [
        fee.id,
        fee.student_id,
        receiptNumber,
        transactionId ? transactionId.trim() : null,
        cleanMethod,
        cleanAmount.toFixed(2),
        formattedDate,
        collectedBy ? parseInt(collectedBy, 10) : null,
        notes ? notes.trim() : null,
      ]
    );

    const newPaymentId = payResult.insertId;

    // 5. Recalculate fee status and amount_paid
    const newPaidTotal = currentPaid + cleanAmount;
    const newRemainingBalance = Math.max(0, netDue - newPaidTotal);
    const todayStr = new Date().toISOString().split('T')[0];

    let newStatus = 'PENDING';
    if (newPaidTotal >= netDue) {
      newStatus = 'PAID';
    } else if (newPaidTotal > 0) {
      newStatus = 'PARTIAL';
    } else if (fee.due_date < todayStr) {
      newStatus = 'OVERDUE';
    }

    await connection.query(
      'UPDATE student_fees SET amount_paid = ?, status = ? WHERE id = ?',
      [newPaidTotal.toFixed(2), newStatus, fee.id]
    );

    // AUTOMATIC NOTIFICATION: Notify student of recorded fee payment
    try {
      const [studentRows] = await connection.query(
        'SELECT user_id FROM students WHERE id = ?',
        [fee.student_id]
      );
      if (studentRows && studentRows.length > 0) {
        await notificationService.createNotification({
          userId: studentRows[0].user_id,
          title: 'Payment Successful',
          message: `Your payment of ₹${cleanAmount.toFixed(2)} (${cleanMethod}) for ${fee.term_name || 'hostel fee'} has been recorded successfully. Receipt #${receiptNumber}.`,
          type: 'FEES',
          relatedEntityType: 'PAYMENT',
          relatedEntityId: newPaymentId,
          link: '/my-fees',
          connection,
        });
      }
    } catch (notifErr) {
      console.warn('Could not dispatch payment notification:', notifErr.message);
    }

    await connection.commit();

    // 6. Return complete payment and receipt details
    const payment = await getPaymentById(newPaymentId);
    return payment;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 2. Get Paginated Payment History with Filters
 */
async function getAllPayments({
  page = 1,
  limit = 15,
  search = '',
  studentId = '',
  feeId = '',
  paymentMethod = '',
  dateFrom = '',
  dateTo = '',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (studentId && studentId.toString().trim() !== '') {
    whereClauses.push('p.student_id = ?');
    params.push(parseInt(studentId, 10));
  }

  if (feeId && feeId.toString().trim() !== '') {
    whereClauses.push('p.student_fee_id = ?');
    params.push(parseInt(feeId, 10));
  }

  if (paymentMethod && paymentMethod.trim() !== '') {
    whereClauses.push('p.payment_method = ?');
    params.push(paymentMethod.trim().toUpperCase());
  }

  if (dateFrom && dateFrom.trim() !== '') {
    whereClauses.push('p.payment_date >= ?');
    params.push(dateFrom.trim());
  }

  if (dateTo && dateTo.trim() !== '') {
    whereClauses.push('p.payment_date <= ?');
    params.push(`${dateTo.trim()} 23:59:59`);
  }

  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`;
    whereClauses.push('(u.full_name LIKE ? OR s.roll_number LIKE ? OR p.receipt_number LIKE ? OR sf.bill_number LIKE ? OR p.transaction_id LIKE ?)');
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN student_fees sf ON p.student_fee_id = sf.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    ${whereSQL}
  `;
  const [countResult] = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  const dataSql = `
    SELECT 
      p.id,
      p.receipt_number,
      p.student_fee_id,
      p.student_id,
      p.transaction_id,
      p.payment_method,
      CAST(p.amount AS DOUBLE) AS amount,
      p.payment_date,
      p.payment_status,
      p.notes,
      p.created_at,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      sf.bill_number,
      ft.name AS fee_type_name,
      collector.full_name AS collected_by_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN student_fees sf ON p.student_fee_id = sf.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    LEFT JOIN users collector ON p.collected_by = collector.id
    ${whereSQL}
    ORDER BY p.payment_date DESC, p.id DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSql, queryParams);

  return {
    payments: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * 3. Get Single Payment & Receipt Details
 */
async function getPaymentById(id) {
  const sql = `
    SELECT 
      p.id,
      p.receipt_number,
      p.student_fee_id,
      p.student_id,
      p.transaction_id,
      p.payment_method,
      CAST(p.amount AS DOUBLE) AS amount,
      p.payment_date,
      p.payment_status,
      p.notes,
      p.created_at,
      s.roll_number,
      s.department,
      s.course,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      h.name AS hostel_name,
      r.room_number,
      sf.bill_number,
      sf.academic_year,
      sf.term_name,
      CAST(sf.amount_due AS DOUBLE) AS fee_amount_due,
      CAST(sf.discount AS DOUBLE) AS fee_discount,
      CAST(sf.amount_paid AS DOUBLE) AS fee_amount_paid,
      CAST(GREATEST(0, (sf.amount_due - sf.discount) - sf.amount_paid) AS DOUBLE) AS fee_remaining_balance,
      sf.due_date AS fee_due_date,
      sf.status AS fee_status,
      ft.name AS fee_type_name,
      collector.full_name AS collected_by_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN student_fees sf ON p.student_fee_id = sf.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    LEFT JOIN users collector ON p.collected_by = collector.id
    WHERE p.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Payment record not found');
    error.statusCode = 404;
    throw error;
  }

  const payment = rows[0];
  const netDue = payment.fee_amount_due - payment.fee_discount;
  const previousPaid = Math.max(0, payment.fee_amount_paid - payment.amount);
  payment.previous_balance = Math.max(0, netDue - previousPaid);
  payment.remaining_balance = payment.fee_remaining_balance;

  return payment;
}

/**
 * 4. Real Financial Statistics via MySQL Aggregation
 */
async function getFinancialStatistics() {
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  // 1. Overall Fee Totals
  const [feeTotalsRows] = await query(`
    SELECT 
      COALESCE(SUM(amount_due - discount), 0) AS total_amount_due,
      COALESCE(SUM(amount_paid), 0) AS total_amount_collected,
      COALESCE(SUM(GREATEST(0, (amount_due - discount) - amount_paid)), 0) AS total_outstanding,
      COUNT(CASE WHEN status = 'PAID' THEN 1 END) AS paid_bills,
      COUNT(CASE WHEN status = 'PARTIAL' THEN 1 END) AS partial_bills,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_bills,
      COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) AS overdue_bills,
      COUNT(CASE WHEN status = 'WAIVED' THEN 1 END) AS waived_bills,
      COUNT(id) AS total_bills
    FROM student_fees
  `);

  // 2. Today and Month Collections
  const [collectionRows] = await query(`
    SELECT 
      COALESCE(SUM(CASE WHEN DATE(payment_date) = ? THEN amount ELSE 0 END), 0) AS today_collection,
      COALESCE(SUM(CASE WHEN DATE(payment_date) >= ? THEN amount ELSE 0 END), 0) AS this_month_collection,
      COUNT(CASE WHEN DATE(payment_date) = ? THEN 1 END) AS today_payments_count,
      COUNT(id) AS total_payments_count
    FROM payments
    WHERE payment_status = 'SUCCESS'
  `, [today, startOfMonth, today]);

  // 3. Monthly Collection (Past 6 months)
  const [monthlyRows] = await query(`
    SELECT 
      DATE_FORMAT(payment_date, '%b %Y') AS month_label,
      DATE_FORMAT(payment_date, '%Y-%m') AS month_key,
      COALESCE(SUM(amount), 0) AS total_collected,
      COUNT(id) AS payment_count
    FROM payments
    WHERE payment_status = 'SUCCESS' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b %Y')
    ORDER BY month_key ASC
  `);

  // 4. Fee-Type Collection Breakdown
  const [feeTypeBreakdown] = await query(`
    SELECT 
      ft.name AS fee_type_name,
      COALESCE(SUM(p.amount), 0) AS total_collected,
      COUNT(p.id) AS payment_count
    FROM fee_types ft
    LEFT JOIN student_fees sf ON ft.id = sf.fee_type_id
    LEFT JOIN payments p ON sf.id = p.student_fee_id AND p.payment_status = 'SUCCESS'
    GROUP BY ft.id, ft.name
    ORDER BY total_collected DESC
  `);

  // 5. Payment Method Distribution
  const [methodDistribution] = await query(`
    SELECT 
      payment_method,
      COUNT(id) AS count,
      COALESCE(SUM(amount), 0) AS total_amount
    FROM payments
    WHERE payment_status = 'SUCCESS'
    GROUP BY payment_method
    ORDER BY total_amount DESC
  `);

  // 6. Fee Status Distribution
  const [statusDistribution] = await query(`
    SELECT 
      status,
      COUNT(id) AS count,
      COALESCE(SUM(amount_due - discount), 0) AS total_due,
      COALESCE(SUM(amount_paid), 0) AS total_paid
    FROM student_fees
    GROUP BY status
    ORDER BY count DESC
  `);

  // 7. Categorized Revenue Breakdown
  const [catRows] = await query(`
    SELECT 
      COALESCE(SUM(CASE WHEN LOWER(ft.name) LIKE '%mess%' OR LOWER(ft.name) LIKE '%food%' THEN p.amount ELSE 0 END), 0) AS food_revenue,
      COALESCE(SUM(CASE WHEN LOWER(ft.name) LIKE '%hostel%' OR LOWER(ft.name) LIKE '%accommodation%' OR LOWER(ft.name) LIKE '%room%' THEN p.amount ELSE 0 END), 0) AS accommodation_revenue,
      COALESCE(SUM(CASE WHEN LOWER(ft.name) NOT LIKE '%mess%' AND LOWER(ft.name) NOT LIKE '%food%' AND LOWER(ft.name) NOT LIKE '%hostel%' AND LOWER(ft.name) NOT LIKE '%accommodation%' AND LOWER(ft.name) NOT LIKE '%room%' THEN p.amount ELSE 0 END), 0) AS other_revenue
    FROM payments p
    JOIN student_fees sf ON p.student_fee_id = sf.id
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    WHERE p.payment_status = 'SUCCESS'
  `);

  // 8. Paid & Pending Students Counts
  const [studentCounts] = await query(`
    SELECT 
      COUNT(DISTINCT CASE WHEN sf.status IN ('PENDING', 'PARTIAL', 'OVERDUE') THEN sf.student_id END) AS students_with_pending_dues,
      COUNT(DISTINCT sf.student_id) AS total_students_billed
    FROM student_fees sf
  `);

  const feeStats = feeTotalsRows[0] || {};
  const collStats = collectionRows[0] || {};
  const catStats = catRows[0] || {};
  const stuStats = studentCounts[0] || {};

  const totalBilledStudents = parseInt(stuStats.total_students_billed || 0, 10);
  const pendingStudents = parseInt(stuStats.students_with_pending_dues || 0, 10);
  const paidStudents = Math.max(0, totalBilledStudents - pendingStudents);

  const totalAmountDue = parseFloat(feeStats.total_amount_due || 0);
  const totalCollected = parseFloat(feeStats.total_amount_collected || 0);
  const totalOutstanding = parseFloat(feeStats.total_outstanding || 0);
  const todayColl = parseFloat(collStats.today_collection || 0);
  const monthColl = parseFloat(collStats.this_month_collection || 0);
  const foodRev = parseFloat(catStats.food_revenue || 0);
  const accomRev = parseFloat(catStats.accommodation_revenue || 0);
  const otherRev = parseFloat(catStats.other_revenue || 0);

  return {
    totalRevenue: totalCollected,
    total_revenue: totalCollected,
    totalAmountDue: totalAmountDue,
    total_amount_due: totalAmountDue,
    todayCollection: todayColl,
    today_collection: todayColl,
    thisMonthCollection: monthColl,
    this_month_collection: monthColl,
    pendingFees: totalOutstanding,
    pending_fees: totalOutstanding,
    overdueFees: parseFloat(feeStats.total_outstanding || 0),
    overdue_fees: parseFloat(feeStats.total_outstanding || 0),
    foodRevenue: foodRev,
    food_revenue: foodRev,
    accommodationRevenue: accomRev,
    accommodation_revenue: accomRev,
    otherFeesRevenue: otherRev,
    other_revenue: otherRev,
    paidStudentsCount: paidStudents,
    paid_students: paidStudents,
    pendingStudentsCount: pendingStudents,
    pending_students: pendingStudents,
    overview: {
      total_amount_due: totalAmountDue,
      total_amount_collected: totalCollected,
      total_outstanding: totalOutstanding,
      paid_bills: parseInt(feeStats.paid_bills || 0, 10),
      partial_bills: parseInt(feeStats.partial_bills || 0, 10),
      pending_bills: parseInt(feeStats.pending_bills || 0, 10),
      overdue_bills: parseInt(feeStats.overdue_bills || 0, 10),
      waived_bills: parseInt(feeStats.waived_bills || 0, 10),
      total_bills: parseInt(feeStats.total_bills || 0, 10),
      today_collection: todayColl,
      this_month_collection: monthColl,
      today_payments_count: parseInt(collStats.today_payments_count || 0, 10),
      total_payments_count: parseInt(collStats.total_payments_count || 0, 10),
      food_revenue: foodRev,
      accommodation_revenue: accomRev,
      other_revenue: otherRev,
      paid_students: paidStudents,
      pending_students: pendingStudents,
    },
    monthly_collection: monthlyRows.map(m => ({
      month: m.month_label,
      key: m.month_key,
      collected: parseFloat(m.total_collected || 0),
      count: parseInt(m.payment_count || 0, 10),
    })),
    fee_type_breakdown: feeTypeBreakdown.map(f => ({
      fee_type: f.fee_type_name,
      collected: parseFloat(f.total_collected || 0),
      count: parseInt(f.payment_count || 0, 10),
    })),
    payment_method_distribution: methodDistribution.map(m => ({
      method: m.payment_method,
      count: parseInt(m.count || 0, 10),
      amount: parseFloat(m.total_amount || 0),
    })),
    status_distribution: statusDistribution.map(s => ({
      status: s.status,
      count: parseInt(s.count || 0, 10),
      due: parseFloat(s.total_due || 0),
      paid: parseFloat(s.total_paid || 0),
    })),
  };
}

module.exports = {
  recordPayment,
  getAllPayments,
  getPaymentById,
  getFinancialStatistics,
  generateReceiptNumber,
};
