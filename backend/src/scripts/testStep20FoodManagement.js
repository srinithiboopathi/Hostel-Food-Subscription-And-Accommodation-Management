/**
 * STEP 20: FOOD SUBSCRIPTION & MEAL MANAGEMENT E2E TEST SUITE
 */

const http = require('http');
const app = require('../server');
const { query } = require('../config/database');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function makeRequest(server, { method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqHeaders = { ...headers };
    let postData = null;

    if (body) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch {
          parsed = rawData;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  STARTING STEP 20: FOOD SUBSCRIPTION & MEAL MANAGEMENT TESTS  ');
  console.log('===============================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATION & RBAC
    // -------------------------------------------------------------
    console.log('--- 1. AUTHENTICATION & RBAC TOKENS ---');
    const [activeUsers] = await query("SELECT id, email, role FROM users WHERE status = 'ACTIVE'");
    const adminUser = activeUsers.find((u) => u.role === 'ADMIN');
    const wardenUser = activeUsers.find((u) => u.role === 'WARDEN');
    const studentUser = activeUsers.find((u) => u.role === 'STUDENT');

    assert(adminUser && wardenUser && studentUser, 'Active database users found for Admin, Warden, and Student');

    async function login(email) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/login',
        body: { email, password: 'Password@123' },
      });
      return res.body?.data?.token;
    }

    const adminToken = await login(adminUser.email);
    const wardenToken = await login(wardenUser.email);
    const studentToken = await login(studentUser.email);

    assert(!!adminToken, `Admin authenticated (${adminUser.email})`);
    assert(!!wardenToken, `Warden authenticated (${wardenUser.email})`);
    assert(!!studentToken, `Student authenticated (${studentUser.email})`);

    const adminAuth = { Authorization: `Bearer ${adminToken}` };
    const wardenAuth = { Authorization: `Bearer ${wardenToken}` };
    const studentAuth = { Authorization: `Bearer ${studentToken}` };

    // Student Unauthorized Plan Creation
    console.log('\n--- 2. RBAC ACCESS CONTROL & RESTRICTIONS ---');
    const unauthCreate = await makeRequest(server, {
      method: 'POST',
      path: '/api/food/plans',
      headers: studentAuth,
      body: { name: 'Hacked Plan', code: 'HACK', monthly_price: 100 },
    });
    assert(unauthCreate.statusCode === 403, 'Student blocked from creating food plans (403 Forbidden)');

    // -------------------------------------------------------------
    // 2. FOOD PLAN CRUD
    // -------------------------------------------------------------
    console.log('\n--- 3. FOOD PLAN CRUD OPERATIONS ---');
    const ts = Date.now();
    const planName = `Step 20 Special Plan ${ts}`;
    const planCode = `PLAN_${ts}`;
    const createPlanRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/food/plans',
      headers: adminAuth,
      body: {
        name: planName,
        code: planCode,
        description: 'Automated dining plan with 4 meals',
        has_breakfast: true,
        has_lunch: true,
        has_snacks: true,
        has_dinner: true,
        monthly_price: 4800.00,
      },
    });
    assert(createPlanRes.statusCode === 201 && createPlanRes.body.success, 'Food plan created successfully (201)');
    const testPlanId = createPlanRes.body.data?.id;

    // List Plans (Student role)
    const listPlansRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/food/plans',
      headers: studentAuth,
    });
    assert(listPlansRes.statusCode === 200 && Array.isArray(listPlansRes.body.data), 'Food plans retrieved for student (200)');
    const foundPlan = listPlansRes.body.data?.find((p) => p.id === testPlanId);
    assert(!!foundPlan, 'Newly created plan is visible in food plans list');

    // Update Plan
    const updatePlanRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/food/plans/${testPlanId}`,
      headers: adminAuth,
      body: {
        name: `Step 20 Automated Special Plan (Updated ${Date.now()})`,
        monthly_price: 5100.00,
      },
    });
    assert(updatePlanRes.statusCode === 200 && parseFloat(updatePlanRes.body.data?.monthly_price) === 5100.00, 'Food plan updated successfully with new price');

    // Toggle Plan Status (Deactivate then Reactivate)
    const deactRes = await makeRequest(server, {
      method: 'PATCH',
      path: `/api/food/plans/${testPlanId}/toggle-status`,
      headers: adminAuth,
    });
    assert(deactRes.statusCode === 200 && deactRes.body.data?.status === 'INACTIVE', 'Food plan deactivated to INACTIVE');

    const reactRes = await makeRequest(server, {
      method: 'PATCH',
      path: `/api/food/plans/${testPlanId}/toggle-status`,
      headers: adminAuth,
    });
    assert(reactRes.statusCode === 200 && reactRes.body.data?.status === 'ACTIVE', 'Food plan reactivated to ACTIVE');

    // -------------------------------------------------------------
    // 3. DAILY MENU MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- 4. DAILY MENU OPERATIONS ---');
    const testDay = 'THURSDAY';
    const createMenuRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/menu',
      headers: adminAuth,
      body: {
        dayOfWeek: testDay,
        mealTypeId: 1, // BREAKFAST
        itemsDescription: 'Idli, Medu Vada, Sambar, Coconut Chutney, Tea/Coffee',
        specialItem: 'Filter Coffee Special',
        caloriesEst: 460,
        isActive: true,
      },
    });
    assert(createMenuRes.statusCode === 201 && createMenuRes.body.success, 'Daily menu item created (201)');
    const testMenuId = createMenuRes.body.data?.id;

    // Retrieve today's menu
    const todayMenuRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/menu/today',
      headers: studentAuth,
    });
    assert(todayMenuRes.statusCode === 200 && todayMenuRes.body.success, "Today's daily menu retrieved for student");

    // Update menu item
    if (testMenuId) {
      const updateMenuRes = await makeRequest(server, {
        method: 'PUT',
        path: `/api/menu/${testMenuId}`,
        headers: adminAuth,
        body: {
          itemsDescription: 'Poha, Upma, Mint Chutney, Masala Chai',
          specialItem: 'Fresh Kesari',
        },
      });
      assert(updateMenuRes.statusCode === 200 && updateMenuRes.body.success, 'Daily menu item updated successfully');
    }

    // -------------------------------------------------------------
    // 4. STUDENT FOOD SUBSCRIPTION LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- 5. STUDENT FOOD SUBSCRIPTION & LIFECYCLE ---');
    const [students] = await query("SELECT id, user_id FROM students WHERE status = 'ACTIVE' LIMIT 2");
    const testStudentId = students[0]?.id;
    assert(!!testStudentId, `Candidate student identified (ID: ${testStudentId})`);

    // Ensure clean slate for test student active subscriptions
    await query("UPDATE food_subscriptions SET status = 'EXPIRED' WHERE student_id = ? AND status = 'ACTIVE'", [testStudentId]);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    // Create Subscription
    const createSubRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/food/subscriptions',
      headers: adminAuth,
      body: {
        student_id: testStudentId,
        plan_id: testPlanId,
        start_date: startDate,
        end_date: endDate,
        monthly_price: 5100.00,
      },
    });
    assert(createSubRes.statusCode === 201 && createSubRes.body.success, 'Student food subscription created (201)');
    const testSubId = createSubRes.body.data?.id;

    // Prevent Duplicate Active Subscription
    const dupSubRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/food/subscriptions',
      headers: adminAuth,
      body: {
        student_id: testStudentId,
        plan_id: testPlanId,
        start_date: startDate,
        end_date: endDate,
        monthly_price: 5100.00,
      },
    });
    assert(dupSubRes.statusCode === 400, 'Duplicate active food subscription prevented (400 Bad Request)');

    // Change Plan
    const [altPlans] = await query("SELECT id FROM food_plans WHERE id != ? AND status = 'ACTIVE' LIMIT 1", [testPlanId]);
    const altPlanId = altPlans[0]?.id || testPlanId;

    const changePlanRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/food/subscriptions/${testSubId}/change-plan`,
      headers: adminAuth,
      body: {
        new_plan_id: altPlanId,
        effective_date: startDate,
      },
    });
    assert(changePlanRes.statusCode === 200 && changePlanRes.body.success, 'Student food plan changed successfully');

    // Pause Subscription
    const pauseRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/food/subscriptions/${testSubId}/pause`,
      headers: adminAuth,
      body: {
        pause_date: startDate,
        reason: 'Temporary leave',
      },
    });
    assert(pauseRes.statusCode === 200 && pauseRes.body.data?.status === 'PAUSED', 'Food subscription paused to PAUSED status');

    // Resume Subscription
    const resumeRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/food/subscriptions/${testSubId}/resume`,
      headers: adminAuth,
    });
    assert(resumeRes.statusCode === 200 && resumeRes.body.data?.status === 'ACTIVE', 'Food subscription resumed back to ACTIVE status');

    // -------------------------------------------------------------
    // 5. MEAL ATTENDANCE & VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 6. MEAL ATTENDANCE & CONSUMPTION RULES ---');
    const todayStr = new Date().toISOString().split('T')[0];

    // Clean any prior attendance record for today
    await query('DELETE FROM meal_attendance WHERE student_id = ? AND meal_date = ? AND meal_type_id = 1', [testStudentId, todayStr]);

    // Record Attendance
    const attRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/meals/attendance',
      headers: adminAuth,
      body: {
        studentId: testStudentId,
        mealTypeId: 1,
        mealDate: todayStr,
        status: 'PRESENT',
        remarks: 'Step 20 Verified Breakfast Check-in',
      },
    });
    assert(attRes.statusCode === 201 && attRes.body.success, 'Meal attendance recorded for active subscriber (201)');

    // Prevent Duplicate Meal Attendance
    const dupAttRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/meals/attendance',
      headers: adminAuth,
      body: {
        studentId: testStudentId,
        mealTypeId: 1,
        mealDate: todayStr,
        status: 'PRESENT',
      },
    });
    assert(dupAttRes.statusCode === 400, 'Duplicate meal attendance prevented (400 Bad Request)');

    // -------------------------------------------------------------
    // 6. CANCELLATION & EXPIRED SUBSCRIPTION MEAL PREVENTION
    // -------------------------------------------------------------
    console.log('\n--- 7. CANCELLATION & NON-ACTIVE MEAL PREVENTION ---');
    const cancelRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/food/subscriptions/${testSubId}/cancel`,
      headers: adminAuth,
      body: {
        cancellation_date: todayStr,
        reason: 'Hostel vacated',
      },
    });
    assert(cancelRes.statusCode === 200 && cancelRes.body.data?.status === 'CANCELLED', 'Food subscription cancelled successfully');

    // Attempt Meal Attendance for Cancelled Subscription
    const blockedAttRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/meals/attendance',
      headers: adminAuth,
      body: {
        studentId: testStudentId,
        mealTypeId: 2, // Lunch
        mealDate: todayStr,
        status: 'PRESENT',
      },
    });
    assert(blockedAttRes.statusCode === 400, 'Meal consumption prevented for non-active subscription (400)');

    // Renew Subscription
    const renewRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/food/subscriptions/${testSubId}/renew`,
      headers: adminAuth,
      body: {
        plan_id: testPlanId,
        duration_months: 1,
        start_date: todayStr,
      },
    });
    assert(renewRes.statusCode === 200 && renewRes.body.data?.status === 'ACTIVE', 'Food subscription renewed to new period');

    // -------------------------------------------------------------
    // 7. BILLING & FEE LEDGER INTEGRATION
    // -------------------------------------------------------------
    console.log('\n--- 8. FOOD BILLING & STUDENT FEE LEDGER ---');
    const [feeCharges] = await query(
      'SELECT * FROM student_fees WHERE student_id = ? AND fee_type_id = 2 ORDER BY id DESC LIMIT 1',
      [testStudentId]
    );
    assert(feeCharges.length > 0, `Food billing charge verified in student fee ledger (ID: ${feeCharges[0]?.id}, Amount: ₹${feeCharges[0]?.amount_due})`);

    // -------------------------------------------------------------
    // 8. STUDENT FOOD HISTORY & LIVE STATS
    // -------------------------------------------------------------
    console.log('\n--- 9. STUDENT FOOD HISTORY & LIVE STATS ---');
    const historyRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/food/students/${testStudentId}/history`,
      headers: adminAuth,
    });
    assert(historyRes.statusCode === 200 && historyRes.body.success, 'Student food history retrieved (200)');
    assert(Array.isArray(historyRes.body.data?.subscriptions), 'Student history contains subscription timeline');
    assert(Array.isArray(historyRes.body.data?.mealAttendance), 'Student history contains meal attendance logs');
    assert(Array.isArray(historyRes.body.data?.billingCharges), 'Student history contains linked billing charges');

    // Dashboard Stats
    const statsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/food/stats',
      headers: adminAuth,
    });
    assert(statsRes.statusCode === 200 && statsRes.body.success, 'Food management live statistics calculated from MySQL');
    assert(statsRes.body.data?.totalSubscribedStudents >= 0, 'Total Subscribed Students stat present');
    assert(statsRes.body.data?.activeSubscriptions >= 0, 'Active Subscriptions stat present');
    assert(statsRes.body.data?.todayTotalMeals >= 0, "Today's Total Meals stat present");

  } catch (err) {
    console.error('Fatal test runner error:', err);
  } finally {
    server.close();
  }

  console.log('\n===============================================================');
  console.log(`  STEP 20 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)  `);
  console.log('===============================================================\n');

  if (passed === total && total > 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
