const { pool, query } = require('../config/database');
const notificationService = require('./notificationService');

/**
 * Get comprehensive Food & Mess Dashboard Statistics
 */
async function getFoodDashboardStats() {
  // 1. Subscription Metrics
  const [subStats] = await query(`
    SELECT 
      COUNT(DISTINCT student_id) AS total_students_subscribed,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_subscriptions,
      SUM(CASE WHEN status = 'PAUSED' THEN 1 ELSE 0 END) AS paused_subscriptions,
      SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) AS expired_subscriptions,
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_subscriptions,
      COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN monthly_price ELSE 0 END), 0) AS monthly_revenue
    FROM food_subscriptions
  `);

  // 2. Today's Meal Consumption Counts from meal_attendance
  const [mealStats] = await query(`
    SELECT 
      COALESCE(SUM(CASE WHEN mt.name = 'BREAKFAST' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS today_breakfast_count,
      COALESCE(SUM(CASE WHEN mt.name = 'LUNCH' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS today_lunch_count,
      COALESCE(SUM(CASE WHEN mt.name = 'SNACKS' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS today_snacks_count,
      COALESCE(SUM(CASE WHEN mt.name = 'DINNER' AND ma.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS today_dinner_count,
      COALESCE(SUM(CASE WHEN ma.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS today_total_meals
    FROM meal_attendance ma
    JOIN meal_types mt ON ma.meal_type_id = mt.id
    WHERE ma.meal_date = CURDATE()
  `);

  // 3. Plan Popularity Breakdown
  const [planBreakdown] = await query(`
    SELECT 
      fp.id,
      fp.name,
      fp.code,
      fp.monthly_price,
      COUNT(fs.id) AS subscriber_count
    FROM food_plans fp
    LEFT JOIN food_subscriptions fs ON fp.id = fs.plan_id AND fs.status = 'ACTIVE'
    WHERE fp.status = 'ACTIVE'
    GROUP BY fp.id, fp.name, fp.code, fp.monthly_price
    ORDER BY subscriber_count DESC
  `);

  const s = subStats[0] || {};
  const m = mealStats[0] || {};

  const totalSubscribed = Number(s.total_students_subscribed) || 0;
  const activeSubs = Number(s.active_subscriptions) || 0;
  const pausedSubs = Number(s.paused_subscriptions) || 0;
  const expiredSubs = Number(s.expired_subscriptions) || 0;
  const cancelledSubs = Number(s.cancelled_subscriptions) || 0;
  const inactiveSubs = pausedSubs + expiredSubs + cancelledSubs;

  return {
    totalSubscribedStudents: totalSubscribed,
    totalStudentsSubscribed: totalSubscribed,
    activeSubscriptions: activeSubs,
    inactiveSubscriptions: inactiveSubs,
    pausedSubscriptions: pausedSubs,
    expiredSubscriptions: expiredSubs,
    cancelledSubscriptions: cancelledSubs,
    todayBreakfastCount: Number(m.today_breakfast_count) || 0,
    todayLunchCount: Number(m.today_lunch_count) || 0,
    todaySnacksCount: Number(m.today_snacks_count) || 0,
    todayDinnerCount: Number(m.today_dinner_count) || 0,
    todayTotalMeals: Number(m.today_total_meals) || 0,
    monthlyFoodRevenue: Number(s.monthly_revenue) || 0,
    plans: planBreakdown || [],
  };
}

/**
 * =========================================================================
 * 1. FOOD PLANS CRUD
 * =========================================================================
 */
async function getAllFoodPlans({ status = '' } = {}) {
  const whereClauses = [];
  const params = [];

  if (status && status.trim() !== '') {
    whereClauses.push('fp.status = ?');
    params.push(status.trim().toUpperCase());
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      fp.id,
      fp.name,
      fp.code,
      fp.description,
      fp.has_breakfast,
      fp.has_lunch,
      fp.has_snacks,
      fp.has_dinner,
      fp.monthly_price,
      fp.status,
      fp.created_at,
      fp.updated_at,
      COALESCE(sub_count.active_subscribers, 0) AS subscriber_count
    FROM food_plans fp
    LEFT JOIN (
      SELECT plan_id, COUNT(*) AS active_subscribers
      FROM food_subscriptions
      WHERE status = 'ACTIVE'
      GROUP BY plan_id
    ) sub_count ON fp.id = sub_count.plan_id
    ${whereSQL}
    ORDER BY fp.monthly_price ASC
  `;

  const [rows] = await query(sql, params);
  return rows || [];
}

async function getFoodPlanById(id) {
  const sql = `
    SELECT 
      fp.id,
      fp.name,
      fp.code,
      fp.description,
      fp.has_breakfast,
      fp.has_lunch,
      fp.has_snacks,
      fp.has_dinner,
      fp.monthly_price,
      fp.status,
      fp.created_at,
      fp.updated_at,
      COALESCE(sub_count.active_subscribers, 0) AS subscriber_count
    FROM food_plans fp
    LEFT JOIN (
      SELECT plan_id, COUNT(*) AS active_subscribers
      FROM food_subscriptions
      WHERE status = 'ACTIVE'
      GROUP BY plan_id
    ) sub_count ON fp.id = sub_count.plan_id
    WHERE fp.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Food plan not found');
    error.statusCode = 404;
    throw error;
  }
  return rows[0];
}

async function createFoodPlan(planData) {
  const name = planData.name;
  const code = planData.code;
  const description = planData.description || '';
  const status = planData.status || 'ACTIVE';

  const hasBreakfast = planData.hasBreakfast ?? planData.has_breakfast ?? true;
  const hasLunch = planData.hasLunch ?? planData.has_lunch ?? true;
  const hasSnacks = planData.hasSnacks ?? planData.has_snacks ?? false;
  const hasDinner = planData.hasDinner ?? planData.has_dinner ?? true;
  const monthlyPrice = planData.monthlyPrice ?? planData.monthly_price ?? 3500.00;

  const [existing] = await query(
    'SELECT id FROM food_plans WHERE LOWER(name) = LOWER(?) OR LOWER(code) = LOWER(?)',
    [name.trim(), code.trim()]
  );

  if (existing.length > 0) {
    const error = new Error('A food plan with this name or code already exists');
    error.statusCode = 409;
    throw error;
  }

  const [result] = await query(
    `INSERT INTO food_plans (name, code, description, has_breakfast, has_lunch, has_snacks, has_dinner, monthly_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name.trim(),
      code.trim().toUpperCase(),
      description ? description.trim() : null,
      hasBreakfast ? 1 : 0,
      hasLunch ? 1 : 0,
      hasSnacks ? 1 : 0,
      hasDinner ? 1 : 0,
      parseFloat(monthlyPrice) || 0.0,
      status || 'ACTIVE',
    ]
  );

  return await getFoodPlanById(result.insertId);
}

async function updateFoodPlan(id, updateData) {
  const currentPlan = await getFoodPlanById(id);

  const updates = [];
  const params = [];

  if (updateData.name !== undefined) {
    updates.push('name = ?');
    params.push(updateData.name.trim());
  }
  if (updateData.code !== undefined) {
    updates.push('code = ?');
    params.push(updateData.code.trim().toUpperCase());
  }
  if (updateData.description !== undefined) {
    updates.push('description = ?');
    params.push(updateData.description ? updateData.description.trim() : null);
  }
  if (updateData.hasBreakfast !== undefined || updateData.has_breakfast !== undefined) {
    updates.push('has_breakfast = ?');
    params.push(updateData.hasBreakfast ?? updateData.has_breakfast ? 1 : 0);
  }
  if (updateData.hasLunch !== undefined || updateData.has_lunch !== undefined) {
    updates.push('has_lunch = ?');
    params.push(updateData.hasLunch ?? updateData.has_lunch ? 1 : 0);
  }
  if (updateData.hasSnacks !== undefined || updateData.has_snacks !== undefined) {
    updates.push('has_snacks = ?');
    params.push(updateData.hasSnacks ?? updateData.has_snacks ? 1 : 0);
  }
  if (updateData.hasDinner !== undefined || updateData.has_dinner !== undefined) {
    updates.push('has_dinner = ?');
    params.push(updateData.hasDinner ?? updateData.has_dinner ? 1 : 0);
  }
  if (updateData.monthlyPrice !== undefined || updateData.monthly_price !== undefined) {
    updates.push('monthly_price = ?');
    params.push(parseFloat(updateData.monthlyPrice ?? updateData.monthly_price) || 0.0);
  }
  if (updateData.status !== undefined) {
    updates.push('status = ?');
    params.push(updateData.status.toUpperCase());
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE food_plans SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return await getFoodPlanById(id);
}

async function toggleFoodPlanStatus(id) {
  const plan = await getFoodPlanById(id);
  const newStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await query('UPDATE food_plans SET status = ? WHERE id = ?', [newStatus, id]);
  return await getFoodPlanById(id);
}

/**
 * =========================================================================
 * 2. FOOD SUBSCRIPTIONS MANAGEMENT
 * =========================================================================
 */
async function getAllFoodSubscriptions({
  page = 1,
  limit = 10,
  search = '',
  hostelId = '',
  planId = '',
  department = '',
  status = '',
  studentId = '',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (search && search.trim() !== '') {
    const sTerm = `%${search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(u.full_name) LIKE ? OR LOWER(s.roll_number) LIKE ? OR LOWER(fp.name) LIKE ?)');
    params.push(sTerm, sTerm, sTerm);
  }

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('s.current_hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  if (planId && planId.toString().trim() !== '') {
    whereClauses.push('fs.plan_id = ?');
    params.push(parseInt(planId, 10));
  }

  if (department && department.trim() !== '') {
    whereClauses.push('s.department = ?');
    params.push(department.trim());
  }

  if (status && status.trim() !== '' && status.trim().toUpperCase() !== 'ALL') {
    whereClauses.push('fs.status = ?');
    params.push(status.trim().toUpperCase());
  }

  if (studentId && studentId.toString().trim() !== '') {
    whereClauses.push('fs.student_id = ?');
    params.push(parseInt(studentId, 10));
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Total Count
  const countSQL = `
    SELECT COUNT(*) AS total
    FROM food_subscriptions fs
    JOIN students s ON fs.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN food_plans fp ON fs.plan_id = fp.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    ${whereSQL}
  `;
  const [countResult] = await query(countSQL, params);
  const total = countResult[0]?.total || 0;

  // 2. Paginated Data
  const dataSQL = `
    SELECT 
      fs.id,
      fs.student_id,
      s.roll_number,
      s.department,
      s.course,
      s.year_of_study,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      s.current_hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.room_number,
      fs.plan_id,
      fp.name AS plan_name,
      fp.code AS plan_code,
      fp.has_breakfast,
      fp.has_lunch,
      fp.has_snacks,
      fp.has_dinner,
      fs.start_date,
      fs.end_date,
      fs.monthly_price,
      fs.status,
      fs.paused_at,
      fs.cancelled_at,
      fs.remarks,
      fs.created_by,
      cb.full_name AS created_by_name,
      fs.created_at,
      fs.updated_at
    FROM food_subscriptions fs
    JOIN students s ON fs.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN food_plans fp ON fs.plan_id = fp.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    LEFT JOIN users cb ON fs.created_by = cb.id
    ${whereSQL}
    ORDER BY fs.id DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSQL, queryParams);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    subscriptions: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    },
  };
}

async function getSubscriptionById(id) {
  const sql = `
    SELECT 
      fs.id,
      fs.student_id,
      s.roll_number,
      s.department,
      s.course,
      s.year_of_study,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      s.current_hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.room_number,
      fs.plan_id,
      fp.name AS plan_name,
      fp.code AS plan_code,
      fp.has_breakfast,
      fp.has_lunch,
      fp.has_snacks,
      fp.has_dinner,
      fs.start_date,
      fs.end_date,
      fs.monthly_price,
      fs.status,
      fs.paused_at,
      fs.cancelled_at,
      fs.remarks,
      fs.created_by,
      cb.full_name AS created_by_name,
      fs.created_at,
      fs.updated_at
    FROM food_subscriptions fs
    JOIN students s ON fs.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN food_plans fp ON fs.plan_id = fp.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    LEFT JOIN users cb ON fs.created_by = cb.id
    WHERE fs.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Food subscription record not found');
    error.statusCode = 404;
    throw error;
  }
  return rows[0];
}

/**
 * Get single student's active food subscription
 */
async function getStudentActiveSubscription(studentId) {
  const sql = `
    SELECT 
      fs.id,
      fs.student_id,
      fs.plan_id,
      fp.name AS plan_name,
      fp.code AS plan_code,
      fp.description AS plan_description,
      fp.has_breakfast,
      fp.has_lunch,
      fp.has_snacks,
      fp.has_dinner,
      fs.start_date,
      fs.end_date,
      fs.monthly_price,
      fs.status,
      fs.paused_at,
      fs.remarks,
      fs.created_at
    FROM food_subscriptions fs
    JOIN food_plans fp ON fs.plan_id = fp.id
    WHERE fs.student_id = ? AND fs.status = 'ACTIVE'
    ORDER BY fs.id DESC
    LIMIT 1
  `;

  const [rows] = await query(sql, [studentId]);
  return rows[0] || null;
}

/**
 * Create a new Food Subscription using ACID Database Transaction and prevent duplicate active subscriptions
 */
async function createSubscription(subData) {
  const studentId = subData.studentId ?? subData.student_id;
  const planId = subData.planId ?? subData.plan_id;
  const startDate = subData.startDate ?? subData.start_date;
  const endDate = subData.endDate ?? subData.end_date;
  const monthlyPrice = subData.monthlyPrice ?? subData.monthly_price;
  const remarks = subData.remarks || '';
  const createdBy = subData.createdBy ?? subData.created_by ?? null;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock & Verify Student
    const [studentRows] = await connection.query(
      'SELECT s.id, s.user_id, s.roll_number, s.status, u.full_name FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ? FOR UPDATE',
      [studentId]
    );

    if (studentRows.length === 0) {
      const error = new Error('Student record not found');
      error.statusCode = 404;
      throw error;
    }

    const student = studentRows[0];
    if (student.status !== 'ACTIVE') {
      const error = new Error(`Cannot create food subscription for student with status "${student.status}"`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Prevent Duplicate Active Subscription
    const [activeSubs] = await connection.query(
      'SELECT id, plan_id, status FROM food_subscriptions WHERE student_id = ? AND status = "ACTIVE" FOR UPDATE',
      [studentId]
    );

    if (activeSubs.length > 0) {
      const error = new Error('Student already has an active food subscription. Upgrade, change or cancel current plan first.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Verify Food Plan
    const [planRows] = await connection.query(
      'SELECT id, name, monthly_price, status FROM food_plans WHERE id = ? FOR UPDATE',
      [planId]
    );

    if (planRows.length === 0) {
      const error = new Error('Food plan not found');
      error.statusCode = 404;
      throw error;
    }

    const plan = planRows[0];
    if (plan.status !== 'ACTIVE') {
      const error = new Error(`Food plan "${plan.name}" is currently inactive.`);
      error.statusCode = 400;
      throw error;
    }

    const finalPrice = monthlyPrice !== undefined && monthlyPrice !== null ? parseFloat(monthlyPrice) : parseFloat(plan.monthly_price);
    const cleanStartDate = startDate || new Date().toISOString().split('T')[0];
    const cleanEndDate = endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    // 4. Insert into food_subscriptions
    const [insertResult] = await connection.query(
      `INSERT INTO food_subscriptions 
       (student_id, plan_id, start_date, end_date, monthly_price, status, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [studentId, planId, cleanStartDate, cleanEndDate, finalPrice, remarks ? remarks.trim() : null, createdBy]
    );

    const subscriptionId = insertResult.insertId;

    // 5. Integrate with Student Fee Ledger (fee_type_id = 2 for MESS_CHARGES)
    try {
      const billNumber = `MESS-${student.roll_number}-${Date.now().toString().slice(-5)}`;
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      const dueDate = cleanStartDate;

      await connection.query(
        `INSERT INTO student_fees 
         (student_id, fee_type_id, bill_number, academic_year, term_name, amount_due, amount_paid, due_date, status)
         VALUES (?, 2, ?, ?, ?, ?, 0.00, ?, 'PENDING')`,
        [
          studentId,
          billNumber,
          academicYear,
          `Food Plan: ${plan.name} (${cleanStartDate} to ${cleanEndDate})`,
          finalPrice,
          dueDate,
        ]
      );
    } catch (feeErr) {
      console.warn('Could not auto-generate student fee due record for mess:', feeErr.message);
    }

    // 6. Notify Student
    try {
      await notificationService.createNotification({
        userId: student.user_id,
        title: 'Food Subscription Activated',
        message: `Your food plan "${plan.name}" (₹${finalPrice}/mo) has been activated successfully.`,
        type: 'MESS',
        relatedEntityType: 'FOOD_SUBSCRIPTION',
        relatedEntityId: subscriptionId,
        link: '/menu',
        connection,
      });
    } catch (nErr) {
      console.warn('Notification error:', nErr.message);
    }

    await connection.commit();
    connection.release();

    return await getSubscriptionById(subscriptionId);
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

/**
 * Change Food Plan for an active subscription
 */
async function changeSubscriptionPlan(id, changeData) {
  const newPlanId = changeData.newPlanId ?? changeData.new_plan_id;
  const remarks = changeData.remarks || '';
  const updatedBy = changeData.updatedBy ?? changeData.updated_by ?? null;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT fs.*, s.user_id, s.roll_number FROM food_subscriptions fs JOIN students s ON fs.student_id = s.id WHERE fs.id = ? FOR UPDATE',
      [id]
    );

    if (existing.length === 0) {
      const error = new Error('Subscription not found');
      error.statusCode = 404;
      throw error;
    }

    const currentSub = existing[0];
    if (currentSub.status !== 'ACTIVE') {
      const error = new Error(`Cannot change food plan for a subscription with status "${currentSub.status}"`);
      error.statusCode = 400;
      throw error;
    }

    const [newPlanRows] = await connection.query(
      'SELECT id, name, monthly_price, status FROM food_plans WHERE id = ? FOR UPDATE',
      [newPlanId]
    );

    if (newPlanRows.length === 0) {
      const error = new Error('Selected destination food plan not found');
      error.statusCode = 404;
      throw error;
    }

    const newPlan = newPlanRows[0];
    const newPrice = parseFloat(newPlan.monthly_price);

    await connection.query(
      `UPDATE food_subscriptions 
       SET plan_id = ?, monthly_price = ?, remarks = CONCAT(COALESCE(remarks, ''), ' | Plan changed to ', ?) 
       WHERE id = ?`,
      [newPlan.id, newPrice, newPlan.name, id]
    );

    try {
      await notificationService.createNotification({
        userId: currentSub.user_id,
        title: 'Food Plan Changed',
        message: `Your food subscription has been changed to "${newPlan.name}" (₹${newPrice}/mo).`,
        type: 'MESS',
        relatedEntityType: 'FOOD_SUBSCRIPTION',
        relatedEntityId: id,
        link: '/my-food',
        connection,
      });
    } catch (nErr) {
      console.warn('Could not dispatch plan change notification:', nErr.message);
    }

    await connection.commit();
    connection.release();

    return await getSubscriptionById(id);
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

/**
 * Pause Food Subscription
 */
async function pauseSubscription(id, { remarks = '' } = {}) {
  const [existing] = await query(
    'SELECT fs.id, fs.status, s.user_id FROM food_subscriptions fs JOIN students s ON fs.student_id = s.id WHERE fs.id = ?',
    [id]
  );
  if (existing.length === 0) {
    const error = new Error('Subscription not found');
    error.statusCode = 404;
    throw error;
  }

  if (existing[0].status !== 'ACTIVE') {
    const error = new Error(`Subscription cannot be paused because its current status is "${existing[0].status}"`);
    error.statusCode = 400;
    throw error;
  }

  await query(
    `UPDATE food_subscriptions 
     SET status = 'PAUSED', paused_at = NOW(), remarks = CONCAT(COALESCE(remarks, ''), ' | Paused: ', ?)
     WHERE id = ?`,
    [remarks ? remarks.trim() : 'Temporary pause requested', id]
  );

  try {
    await notificationService.createNotification({
      userId: existing[0].user_id,
      title: 'Food Subscription Paused',
      message: 'Your food subscription has been temporarily paused.',
      type: 'MESS',
      relatedEntityType: 'FOOD_SUBSCRIPTION',
      relatedEntityId: id,
      link: '/my-food',
    });
  } catch (nErr) {
    console.warn('Could not dispatch pause notification:', nErr.message);
  }

  return await getSubscriptionById(id);
}

/**
 * Resume Food Subscription
 */
async function resumeSubscription(id, { remarks = '' } = {}) {
  const [existing] = await query(
    'SELECT fs.id, fs.status, s.user_id FROM food_subscriptions fs JOIN students s ON fs.student_id = s.id WHERE fs.id = ?',
    [id]
  );
  if (existing.length === 0) {
    const error = new Error('Subscription not found');
    error.statusCode = 404;
    throw error;
  }

  if (existing[0].status !== 'PAUSED') {
    const error = new Error(`Subscription cannot be resumed because its current status is "${existing[0].status}"`);
    error.statusCode = 400;
    throw error;
  }

  await query(
    `UPDATE food_subscriptions 
     SET status = 'ACTIVE', paused_at = NULL, remarks = CONCAT(COALESCE(remarks, ''), ' | Resumed: ', ?)
     WHERE id = ?`,
    [remarks ? remarks.trim() : 'Subscription resumed', id]
  );

  try {
    await notificationService.createNotification({
      userId: existing[0].user_id,
      title: 'Food Subscription Resumed',
      message: 'Your food subscription has been reactivated successfully.',
      type: 'MESS',
      relatedEntityType: 'FOOD_SUBSCRIPTION',
      relatedEntityId: id,
      link: '/my-food',
    });
  } catch (nErr) {
    console.warn('Could not dispatch resume notification:', nErr.message);
  }

  return await getSubscriptionById(id);
}

/**
 * Cancel Food Subscription
 */
async function cancelSubscription(id, { remarks = '' } = {}) {
  const [existing] = await query(
    'SELECT fs.id, fs.status, s.user_id FROM food_subscriptions fs JOIN students s ON fs.student_id = s.id WHERE fs.id = ?',
    [id]
  );
  if (existing.length === 0) {
    const error = new Error('Subscription not found');
    error.statusCode = 404;
    throw error;
  }

  await query(
    `UPDATE food_subscriptions 
     SET status = 'CANCELLED', cancelled_at = NOW(), remarks = CONCAT(COALESCE(remarks, ''), ' | Cancelled: ', ?)
     WHERE id = ?`,
    [remarks ? remarks.trim() : 'Subscription cancelled', id]
  );

  try {
    await notificationService.createNotification({
      userId: existing[0].user_id,
      title: 'Food Subscription Cancelled',
      message: 'Your food subscription has been cancelled.',
      type: 'MESS',
      relatedEntityType: 'FOOD_SUBSCRIPTION',
      relatedEntityId: id,
      link: '/my-food',
    });
  } catch (nErr) {
    console.warn('Could not dispatch cancellation notification:', nErr.message);
  }

  return await getSubscriptionById(id);
}

/**
 * Renew Food Subscription (extending period)
 */
async function renewSubscription(id, { newEndDate, remarks = '' } = {}) {
  const [existing] = await query(
    'SELECT fs.id, fs.end_date, s.user_id FROM food_subscriptions fs JOIN students s ON fs.student_id = s.id WHERE fs.id = ?',
    [id]
  );
  if (existing.length === 0) {
    const error = new Error('Subscription not found');
    error.statusCode = 404;
    throw error;
  }

  const currentEnd = new Date(existing[0].end_date);
  const calculatedEnd = newEndDate || new Date(currentEnd.setFullYear(currentEnd.getFullYear() + 1)).toISOString().split('T')[0];

  await query(
    `UPDATE food_subscriptions 
     SET end_date = ?, status = 'ACTIVE', remarks = CONCAT(COALESCE(remarks, ''), ' | Renewed until: ', ?)
     WHERE id = ?`,
    [calculatedEnd, calculatedEnd, id]
  );

  try {
    await notificationService.createNotification({
      userId: existing[0].user_id,
      title: 'Food Subscription Renewed',
      message: `Your food subscription has been renewed until ${calculatedEnd}.`,
      type: 'MESS',
      relatedEntityType: 'FOOD_SUBSCRIPTION',
      relatedEntityId: id,
      link: '/my-food',
    });
  } catch (nErr) {
    console.warn('Could not dispatch renewal notification:', nErr.message);
  }

  return await getSubscriptionById(id);
}

/**
 * Get complete Student Food & Mess History (subscriptions, attendance logs, and fee records)
 */
async function getStudentFoodHistory(studentId) {
  // 1. All historical subscriptions
  const [subscriptions] = await query(
    `SELECT fs.*, fp.name AS plan_name, fp.code AS plan_code 
     FROM food_subscriptions fs 
     JOIN food_plans fp ON fs.plan_id = fp.id 
     WHERE fs.student_id = ? 
     ORDER BY fs.id DESC`,
    [studentId]
  );

  // 2. Recent meal attendance consumption logs
  const [consumptions] = await query(
    `SELECT ma.*, mt.name AS meal_type, fm.items_description AS menu_items 
     FROM meal_attendance ma 
     JOIN meal_types mt ON ma.meal_type_id = mt.id 
     LEFT JOIN food_menu fm ON ma.food_menu_id = fm.id 
     WHERE ma.student_id = ? 
     ORDER BY ma.meal_date DESC, mt.start_time DESC 
     LIMIT 50`,
    [studentId]
  );

  // 3. Linked Mess billing fee records (fee_type_id = 2 for MESS_CHARGES)
  const [billingDues] = await query(
    `SELECT sf.*, ft.name AS fee_type_name 
     FROM student_fees sf 
     JOIN fee_types ft ON sf.fee_type_id = ft.id 
     WHERE sf.student_id = ? AND sf.fee_type_id = 2 
     ORDER BY sf.due_date DESC`,
    [studentId]
  );

  return {
    subscriptions: subscriptions || [],
    consumptions: consumptions || [],
    mealAttendance: consumptions || [],
    billingDues: billingDues || [],
    billingCharges: billingDues || [],
  };
}

module.exports = {
  getFoodDashboardStats,
  getAllFoodPlans,
  getFoodPlanById,
  createFoodPlan,
  updateFoodPlan,
  toggleFoodPlanStatus,
  getAllFoodSubscriptions,
  getSubscriptionById,
  getStudentActiveSubscription,
  createSubscription,
  changeSubscriptionPlan,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  renewSubscription,
  getStudentFoodHistory,
};
