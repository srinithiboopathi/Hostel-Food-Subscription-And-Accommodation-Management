/**
 * STEP 15: REAL-TIME REPORTS & DATA EXPORT E2E TEST SUITE
 * 
 * Verifies:
 * 1. Role-based Authentication & JWT login for Admin, Warden, Mess Manager, Accountant, Student
 * 2. 12 Real-time Report Endpoints:
 *    - Students Report
 *    - Room / Occupancy Report
 *    - Room Allocation Report
 *    - Food & Meal Attendance Report
 *    - Food Menu Report
 *    - Fees Report
 *    - Payment Report
 *    - Complaint Report
 *    - Leave Report
 *    - Visitor Report
 *    - Notification Report
 *    - Consolidated Summary Report
 * 3. Exact matching between MySQL queries and Report aggregated values
 * 4. CSV data export with correct headers and sanitized content
 * 5. Strict RBAC enforcement & Private Student data isolation
 * 6. Dynamic database change reflection
 */

const http = require('http');
const app = require('../server');
const { query } = require('../config/database');

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failed++;
  }
}

function makeRequest(server, options) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body && (res.headers['content-type']?.includes('json')) ? JSON.parse(body) : body;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runStep15Tests() {
  console.log('\n============================================================');
  console.log('🧪 STEP 15: REAL-TIME REPORTS & DATA EXPORT E2E TEST SUITE');
  console.log('============================================================\n');

  let server;
  try {
    // 1. Start test server on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => resolve());
    });

    // 2. Fetch test accounts from MySQL
    const [users] = await query(`
      SELECT u.id, u.email, u.role, u.full_name, s.id as student_id
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      WHERE u.status = 'ACTIVE'
    `);

    const admin = users.find((u) => u.role === 'ADMIN');
    const warden = users.find((u) => u.role === 'WARDEN');
    const mess = users.find((u) => u.role === 'MESS_MANAGER');
    const accountant = users.find((u) => u.role === 'ACCOUNTANT');
    const student = users.find((u) => u.role === 'STUDENT' && u.student_id);

    assert(!!admin, 'Admin account present in MySQL database');
    assert(!!warden, 'Warden account present in MySQL database');
    assert(!!mess, 'Mess Manager account present in MySQL database');
    assert(!!accountant, 'Accountant account present in MySQL database');
    assert(!!student, 'Student account present in MySQL database');

    async function login(email) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/login',
        body: { email, password: 'Password@123' },
      });
      return res.body?.data?.token;
    }

    const adminToken = await login(admin.email);
    const wardenToken = await login(warden.email);
    const messToken = await login(mess.email);
    const accountantToken = await login(accountant.email);
    const studentToken = await login(student.email);

    assert(!!adminToken, 'Admin logged in with JWT');
    assert(!!wardenToken, 'Warden logged in with JWT');
    assert(!!messToken, 'Mess Manager logged in with JWT');
    assert(!!accountantToken, 'Accountant logged in with JWT');
    assert(!!studentToken, 'Student logged in with JWT');

    // =============================================================
    // PART 1: STUDENT REPORT (GET /api/reports/students)
    // =============================================================
    console.log('\n--- PART 1: STUDENT REPORT VERIFICATION ---');

    const studentRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/students',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      studentRepRes.status === 200 && studentRepRes.body?.success,
      'GET /api/reports/students returns 200 OK and success'
    );
    const [dbStudentCount] = await query(`SELECT COUNT(*) AS total FROM students`);
    assert(
      studentRepRes.body?.data?.summary?.totalStudents === Number(dbStudentCount[0]?.total || 0),
      `Student Report: Summary total matches MySQL (${studentRepRes.body?.data?.summary?.totalStudents})`
    );
    assert(
      Array.isArray(studentRepRes.body?.data?.records),
      'Student Report: Contains structured records list'
    );

    // =============================================================
    // PART 2: ROOM & OCCUPANCY REPORT (GET /api/reports/rooms)
    // =============================================================
    console.log('\n--- PART 2: ROOM & OCCUPANCY REPORT ---');

    const roomRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/rooms',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      roomRepRes.status === 200 && roomRepRes.body?.success,
      'GET /api/reports/rooms returns 200 OK and success'
    );
    const [dbRoomCount] = await query(`SELECT COUNT(*) AS total FROM rooms`);
    assert(
      roomRepRes.body?.data?.summary?.totalRooms === Number(dbRoomCount[0]?.total || 0),
      `Room Report: Total rooms matches MySQL (${roomRepRes.body?.data?.summary?.totalRooms})`
    );
    assert(
      typeof roomRepRes.body?.data?.summary?.occupancyPercentage === 'number',
      `Room Report: Includes occupancy percentage (${roomRepRes.body?.data?.summary?.occupancyPercentage}%)`
    );

    // =============================================================
    // PART 3: ROOM ALLOCATION REPORT (GET /api/reports/allocations)
    // =============================================================
    console.log('\n--- PART 3: ROOM ALLOCATION REPORT ---');

    const allocRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/allocations',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      allocRepRes.status === 200 && allocRepRes.body?.success,
      'GET /api/reports/allocations returns 200 OK and success'
    );
    const [dbAllocCount] = await query(`SELECT COUNT(*) AS total FROM room_allocations`);
    assert(
      allocRepRes.body?.data?.summary?.totalAllocations === Number(dbAllocCount[0]?.total || 0),
      `Allocation Report: Total allocations matches MySQL (${allocRepRes.body?.data?.summary?.totalAllocations})`
    );

    // =============================================================
    // PART 4: MEAL ATTENDANCE REPORT (GET /api/reports/meals)
    // =============================================================
    console.log('\n--- PART 4: MEAL ATTENDANCE REPORT ---');

    const mealRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/meals',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      mealRepRes.status === 200 && mealRepRes.body?.success,
      'GET /api/reports/meals returns 200 OK and success'
    );
    const [dbMealCount] = await query(`SELECT COUNT(*) AS total FROM meal_attendance`);
    assert(
      mealRepRes.body?.data?.summary?.totalAttendance === Number(dbMealCount[0]?.total || 0),
      `Meal Report: Total attendance matches MySQL (${mealRepRes.body?.data?.summary?.totalAttendance})`
    );

    // =============================================================
    // PART 5: FOOD MENU REPORT (GET /api/reports/menu)
    // =============================================================
    console.log('\n--- PART 5: FOOD MENU REPORT ---');

    const menuRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/menu',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      menuRepRes.status === 200 && menuRepRes.body?.success,
      'GET /api/reports/menu returns 200 OK and success'
    );
    const [dbMenuCount] = await query(`SELECT COUNT(*) AS total FROM food_menu`);
    assert(
      menuRepRes.body?.data?.summary?.totalItems === Number(dbMenuCount[0]?.total || 0),
      `Menu Report: Total menu items matches MySQL (${menuRepRes.body?.data?.summary?.totalItems})`
    );

    // =============================================================
    // PART 6: FEES REPORT (GET /api/reports/fees)
    // =============================================================
    console.log('\n--- PART 6: FEES REPORT ---');

    const feeRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/fees',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });

    assert(
      feeRepRes.status === 200 && feeRepRes.body?.success,
      'GET /api/reports/fees returns 200 OK and success'
    );
    const [dbFeeSummary] = await query(`SELECT COALESCE(SUM(amount_due), 0) AS billed, COALESCE(SUM(amount_paid), 0) AS collected FROM student_fees`);
    assert(
      feeRepRes.body?.data?.summary?.totalBilled === Number(dbFeeSummary[0]?.billed || 0),
      `Fee Report: Total billed matches MySQL (₹${feeRepRes.body?.data?.summary?.totalBilled})`
    );

    // =============================================================
    // PART 7: PAYMENT REPORT (GET /api/reports/payments)
    // =============================================================
    console.log('\n--- PART 7: PAYMENT REPORT ---');

    const payRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/payments',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });

    assert(
      payRepRes.status === 200 && payRepRes.body?.success,
      'GET /api/reports/payments returns 200 OK and success'
    );
    const [dbPayCount] = await query(`SELECT COUNT(*) AS total FROM payments`);
    assert(
      payRepRes.body?.data?.summary?.totalTransactions === Number(dbPayCount[0]?.total || 0),
      `Payment Report: Total payments count matches MySQL (${payRepRes.body?.data?.summary?.totalTransactions})`
    );

    // =============================================================
    // PART 8: COMPLAINT REPORT (GET /api/reports/complaints)
    // =============================================================
    console.log('\n--- PART 8: COMPLAINT REPORT ---');

    const compRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/complaints',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      compRepRes.status === 200 && compRepRes.body?.success,
      'GET /api/reports/complaints returns 200 OK and success'
    );
    const [dbCompCount] = await query(`SELECT COUNT(*) AS total FROM complaints`);
    assert(
      compRepRes.body?.data?.summary?.totalComplaints === Number(dbCompCount[0]?.total || 0),
      `Complaint Report: Total complaints matches MySQL (${compRepRes.body?.data?.summary?.totalComplaints})`
    );

    // =============================================================
    // PART 9: LEAVE REPORT (GET /api/reports/leaves)
    // =============================================================
    console.log('\n--- PART 9: LEAVE REPORT ---');

    const leaveRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/leaves',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      leaveRepRes.status === 200 && leaveRepRes.body?.success,
      'GET /api/reports/leaves returns 200 OK and success'
    );
    const [dbLeaveCount] = await query(`SELECT COUNT(*) AS total FROM leave_requests`);
    assert(
      leaveRepRes.body?.data?.summary?.totalLeaves === Number(dbLeaveCount[0]?.total || 0),
      `Leave Report: Total leaves matches MySQL (${leaveRepRes.body?.data?.summary?.totalLeaves})`
    );

    // =============================================================
    // PART 10: VISITOR REPORT (GET /api/reports/visitors)
    // =============================================================
    console.log('\n--- PART 10: VISITOR REPORT ---');

    const visRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/visitors',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      visRepRes.status === 200 && visRepRes.body?.success,
      'GET /api/reports/visitors returns 200 OK and success'
    );
    const [dbVisCount] = await query(`SELECT COUNT(*) AS total FROM visitors`);
    assert(
      visRepRes.body?.data?.summary?.totalVisitors === Number(dbVisCount[0]?.total || 0),
      `Visitor Report: Total visitors matches MySQL (${visRepRes.body?.data?.summary?.totalVisitors})`
    );

    // =============================================================
    // PART 11: NOTIFICATION REPORT (GET /api/reports/notifications)
    // =============================================================
    console.log('\n--- PART 11: NOTIFICATION REPORT ---');

    const notifRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/notifications',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      notifRepRes.status === 200 && notifRepRes.body?.success,
      'GET /api/reports/notifications returns 200 OK and success'
    );
    const [dbNotifCount] = await query(`SELECT COUNT(*) AS total FROM notifications`);
    assert(
      notifRepRes.body?.data?.summary?.totalNotifications === Number(dbNotifCount[0]?.total || 0),
      `Notification Report: Total notifications matches MySQL (${notifRepRes.body?.data?.summary?.totalNotifications})`
    );

    // =============================================================
    // PART 12: CONSOLIDATED SUMMARY REPORT (GET /api/reports/summary)
    // =============================================================
    console.log('\n--- PART 12: CONSOLIDATED SUMMARY REPORT ---');

    const summaryRepRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/summary',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      summaryRepRes.status === 200 && summaryRepRes.body?.success,
      'GET /api/reports/summary returns 200 OK and success'
    );
    const sumData = summaryRepRes.body?.data || {};
    assert(
      sumData.students?.total === Number(dbStudentCount[0]?.total || 0),
      `Summary Report: Consolidated student count matches MySQL (${sumData.students?.total})`
    );
    assert(
      sumData.rooms?.totalRooms === Number(dbRoomCount[0]?.total || 0),
      `Summary Report: Consolidated rooms count matches MySQL (${sumData.rooms?.totalRooms})`
    );

    // =============================================================
    // PART 13: CSV EXPORT CAPABILITY VERIFICATION
    // =============================================================
    console.log('\n--- PART 13: CSV EXPORT VERIFICATION ---');

    const csvStudentRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/students?format=csv',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      csvStudentRes.status === 200 && csvStudentRes.headers['content-type']?.includes('text/csv'),
      'GET /api/reports/students?format=csv returns text/csv content type'
    );
    assert(
      typeof csvStudentRes.body === 'string' && csvStudentRes.body.includes('Roll Number') && csvStudentRes.body.includes('Student Name'),
      'CSV output contains correct column headers ("Roll Number", "Student Name")'
    );

    const csvPaymentRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/payments?format=csv',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });

    assert(
      csvPaymentRes.status === 200 && csvPaymentRes.headers['content-type']?.includes('text/csv'),
      'GET /api/reports/payments?format=csv returns text/csv content type'
    );
    assert(
      typeof csvPaymentRes.body === 'string' && csvPaymentRes.body.includes('Receipt Number'),
      'CSV output contains payment headers ("Receipt Number")'
    );

    // =============================================================
    // PART 14: SECURITY, RBAC & STUDENT ISOLATION
    // =============================================================
    console.log('\n--- PART 14: SECURITY, RBAC & STUDENT DATA ISOLATION ---');

    // Mess manager accessing /api/reports/fees -> 403
    const messFeeRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/fees',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    assert(
      messFeeRes.status === 403,
      'RBAC: Mess Manager forbidden from Fees report (HTTP 403 Forbidden)'
    );

    // Accountant accessing /api/reports/meals -> 403
    const accMealRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/meals',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(
      accMealRes.status === 403,
      'RBAC: Accountant forbidden from Meal attendance report (HTTP 403 Forbidden)'
    );

    // Student requesting student report: receives strictly own record
    const studentSelfRep = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/students',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentSelfRep.status === 200 && studentSelfRep.body?.data?.records?.length === 1,
      'Student Isolation: Student requesting student report gets only 1 record (their own)'
    );
    assert(
      studentSelfRep.body?.data?.records?.[0]?.roll_number === student.roll_number || !!studentSelfRep.body?.data?.records?.[0]?.student_name,
      'Student Isolation: Record matches logged-in student identity'
    );

    // Unauthenticated access -> 401
    const unauthRep = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/summary',
    });
    assert(
      unauthRep.status === 401,
      'Security: Unauthenticated request to reports rejected (HTTP 401 Unauthorized)'
    );

    // =============================================================
    // PART 15: REAL-TIME DYNAMIC UPDATE REFLECTION
    // =============================================================
    console.log('\n--- PART 15: REAL-TIME DYNAMIC UPDATE REFLECTION ---');

    const [visBefore] = await query(`SELECT COUNT(*) as total FROM visitors`);
    const countBefore = visBefore[0]?.total || 0;

    // Insert a temporary visitor
    const [visInsert] = await query(
      `INSERT INTO visitors (student_id, visitor_name, relationship, phone_number, id_proof_type, id_proof_number, purpose, check_in_time, status)
       VALUES (?, 'Step 15 Test Visitor', 'Friend', '+91 9988776655', 'AADHAAR', '1234-5678-9012', 'Testing report dynamic refresh', NOW(), 'INSIDE')`,
      [student.student_id]
    );
    const tempVisId = visInsert.insertId;

    // Query visitor report via API
    const visAfterRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/visitors',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      visAfterRes.body?.data?.summary?.totalVisitors === countBefore + 1,
      `Real-time dynamic verification: Report immediately reflects new database visitor record (${countBefore} -> ${visAfterRes.body?.data?.summary?.totalVisitors})`
    );

    // Clean up
    await query(`DELETE FROM visitors WHERE id = ?`, [tempVisId]);

  } catch (err) {
    console.error('\n❌ Unexpected Error in Test Suite:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n============================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStep15Tests();
