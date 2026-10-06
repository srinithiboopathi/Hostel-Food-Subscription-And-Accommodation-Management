/**
 * STEP 14: REAL-TIME DASHBOARD & ANALYTICS E2E TEST SUITE
 * 
 * Verifies:
 * 1. Role-based Authentication & JWT login for Admin, Warden, Mess Manager, Accountant, Student
 * 2. Role-based Dashboard APIs:
 *    - GET /api/dashboard/admin
 *    - GET /api/dashboard/warden
 *    - GET /api/dashboard/mess
 *    - GET /api/dashboard/accountant
 *    - GET /api/dashboard/student
 *    - GET /api/dashboard/summary
 * 3. Exact matching between MySQL queries and Dashboard aggregated values
 * 4. Strict RBAC enforcement & Private Student data isolation
 * 5. Dynamic database change reflection (real-time metrics)
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
          const parsed = body ? JSON.parse(body) : {};
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

async function runStep14Tests() {
  console.log('\n============================================================');
  console.log('🧪 STEP 14: REAL-TIME DASHBOARD & ANALYTICS E2E TEST SUITE');
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

    // Helper for login
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
    // PART 1: ADMIN DASHBOARD (GET /api/dashboard/admin)
    // =============================================================
    console.log('\n--- PART 1: ADMIN DASHBOARD VERIFICATION ---');

    const adminDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      adminDashRes.status === 200 && adminDashRes.body?.success,
      'GET /api/dashboard/admin returns 200 OK and success',
      JSON.stringify(adminDashRes.body)
    );

    const adminData = adminDashRes.body?.data || {};

    // Compare with direct MySQL queries
    const [dbStudents] = await query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active FROM students`);
    const [dbRooms] = await query(`SELECT COUNT(*) AS total, SUM(CASE WHEN occupied_count > 0 THEN 1 ELSE 0 END) AS occupied, SUM(CASE WHEN status = 'AVAILABLE' AND occupied_count = 0 THEN 1 ELSE 0 END) AS available FROM rooms`);
    const [dbComplaints] = await query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending FROM complaints`);
    const [dbLeaves] = await query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending FROM leave_requests`);
    const [dbVisitors] = await query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'INSIDE' THEN 1 ELSE 0 END) AS inside FROM visitors`);
    const [dbFees] = await query(`SELECT COALESCE(SUM(amount_due), 0) AS billed, COALESCE(SUM(amount_paid), 0) AS paid FROM student_fees`);

    assert(
      adminData.students?.total === Number(dbStudents[0]?.total || 0),
      `Admin Dashboard: Students total matches MySQL (API: ${adminData.students?.total}, DB: ${dbStudents[0]?.total})`
    );
    assert(
      adminData.hostel?.totalRooms === Number(dbRooms[0]?.total || 0),
      `Admin Dashboard: Total rooms matches MySQL (API: ${adminData.hostel?.totalRooms}, DB: ${dbRooms[0]?.total})`
    );
    assert(
      adminData.hostel?.occupiedRooms === Number(dbRooms[0]?.occupied || 0),
      `Admin Dashboard: Occupied rooms matches MySQL (API: ${adminData.hostel?.occupiedRooms}, DB: ${dbRooms[0]?.occupied})`
    );
    assert(
      adminData.complaints?.total === Number(dbComplaints[0]?.total || 0),
      `Admin Dashboard: Complaints total matches MySQL (API: ${adminData.complaints?.total}, DB: ${dbComplaints[0]?.total})`
    );
    assert(
      adminData.leaves?.total === Number(dbLeaves[0]?.total || 0),
      `Admin Dashboard: Leaves total matches MySQL (API: ${adminData.leaves?.total}, DB: ${dbLeaves[0]?.total})`
    );
    assert(
      adminData.visitors?.total === Number(dbVisitors[0]?.total || 0),
      `Admin Dashboard: Visitors total matches MySQL (API: ${adminData.visitors?.total}, DB: ${dbVisitors[0]?.total})`
    );
    assert(
      adminData.fees?.totalBilled === Number(dbFees[0]?.billed || 0),
      `Admin Dashboard: Fee total billed matches MySQL (API: ${adminData.fees?.totalBilled}, DB: ${dbFees[0]?.billed})`
    );
    assert(
      Array.isArray(adminData.recentActivity?.payments) && Array.isArray(adminData.recentActivity?.complaints),
      'Admin Dashboard: Contains structured recentActivity lists'
    );

    // =============================================================
    // PART 2: WARDEN DASHBOARD (GET /api/dashboard/warden)
    // =============================================================
    console.log('\n--- PART 2: WARDEN DASHBOARD VERIFICATION ---');

    const wardenDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/warden',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      wardenDashRes.status === 200 && wardenDashRes.body?.success,
      'GET /api/dashboard/warden returns 200 OK and success',
      JSON.stringify(wardenDashRes.body)
    );

    const wardenData = wardenDashRes.body?.data || {};

    assert(
      wardenData.occupancy?.totalRooms === Number(dbRooms[0]?.total || 0),
      `Warden Dashboard: Room occupancy analytics match MySQL (Total: ${wardenData.occupancy?.totalRooms})`
    );
    assert(
      typeof wardenData.leaves?.pending === 'number' && typeof wardenData.leaves?.approved === 'number',
      `Warden Dashboard: Leave analytics provided (Pending: ${wardenData.leaves?.pending}, Approved: ${wardenData.leaves?.approved})`
    );
    assert(
      typeof wardenData.complaints?.pending === 'number' && typeof wardenData.complaints?.resolved === 'number',
      `Warden Dashboard: Complaint analytics provided (Pending: ${wardenData.complaints?.pending}, Resolved: ${wardenData.complaints?.resolved})`
    );
    assert(
      typeof wardenData.visitors?.todayVisitors === 'number' && typeof wardenData.visitors?.currentlyInside === 'number',
      `Warden Dashboard: Visitor analytics provided (Inside: ${wardenData.visitors?.currentlyInside})`
    );
    assert(
      Array.isArray(wardenData.recentActivity?.complaints) && Array.isArray(wardenData.recentActivity?.leaves),
      'Warden Dashboard: Contains recent complaints and leaves streams'
    );

    // =============================================================
    // PART 3: MESS MANAGER DASHBOARD (GET /api/dashboard/mess)
    // =============================================================
    console.log('\n--- PART 3: MESS MANAGER DASHBOARD VERIFICATION ---');

    const messDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/mess',
      headers: { Authorization: `Bearer ${messToken}` },
    });

    assert(
      messDashRes.status === 200 && messDashRes.body?.success,
      'GET /api/dashboard/mess returns 200 OK and success',
      JSON.stringify(messDashRes.body)
    );

    const messData = messDashRes.body?.data || {};

    assert(
      Array.isArray(messData.todayMenu),
      `Mess Dashboard: Returns today's active menu items (Count: ${messData.todayMenu?.length})`
    );
    assert(
      typeof messData.todayAttendance?.total === 'number' && typeof messData.todayAttendance?.breakfast === 'number',
      `Mess Dashboard: Returns live meal attendance breakdown (Total: ${messData.todayAttendance?.total})`
    );
    assert(
      Array.isArray(messData.attendanceTrends),
      `Mess Dashboard: Returns 7-day attendance trend records (Days: ${messData.attendanceTrends?.length})`
    );
    assert(
      typeof messData.complaints?.total === 'number',
      `Mess Dashboard: Mess-specific food complaints tracked (Total: ${messData.complaints?.total})`
    );

    // =============================================================
    // PART 4: ACCOUNTANT DASHBOARD (GET /api/dashboard/accountant)
    // =============================================================
    console.log('\n--- PART 4: ACCOUNTANT DASHBOARD VERIFICATION ---');

    const accDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/accountant',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });

    assert(
      accDashRes.status === 200 && accDashRes.body?.success,
      'GET /api/dashboard/accountant returns 200 OK and success',
      JSON.stringify(accDashRes.body)
    );

    const accData = accDashRes.body?.data || {};

    assert(
      accData.overview?.totalBilled === Number(dbFees[0]?.billed || 0),
      `Accountant Dashboard: Total fee billed matches MySQL (₹${accData.overview?.totalBilled})`
    );
    assert(
      accData.overview?.totalCollected === Number(dbFees[0]?.paid || 0),
      `Accountant Dashboard: Total collected matches MySQL (₹${accData.overview?.totalCollected})`
    );
    assert(
      typeof accData.overview?.collectionPercentage === 'number',
      `Accountant Dashboard: Collection percentage computed (${accData.overview?.collectionPercentage}%)`
    );
    assert(
      Array.isArray(accData.payments?.byMethod) && Array.isArray(accData.payments?.recent),
      'Accountant Dashboard: Returns payment method breakdown and recent payment ledger'
    );

    // =============================================================
    // PART 5: STUDENT DASHBOARD (GET /api/dashboard/student)
    // =============================================================
    console.log('\n--- PART 5: STUDENT DASHBOARD VERIFICATION ---');

    const studentDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/student',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(
      studentDashRes.status === 200 && studentDashRes.body?.success,
      'GET /api/dashboard/student returns 200 OK and success',
      JSON.stringify(studentDashRes.body)
    );

    const studentData = studentDashRes.body?.data || {};

    assert(
      studentData.studentProfile?.userId === student.id,
      `Student Dashboard: Resolves profile strictly for authenticated user (User ID: ${studentData.studentProfile?.userId})`
    );
    assert(
      !!studentData.studentProfile?.rollNumber && !!studentData.studentProfile?.fullName,
      `Student Dashboard: Student profile details present (${studentData.studentProfile?.fullName}, Roll: ${studentData.studentProfile?.rollNumber})`
    );
    assert(
      typeof studentData.fees?.totalDue === 'number' && typeof studentData.fees?.totalPaid === 'number',
      `Student Dashboard: Personal fee summary isolated to student (Due: ₹${studentData.fees?.totalDue}, Paid: ₹${studentData.fees?.totalPaid})`
    );
    assert(
      Array.isArray(studentData.meals?.recentAttendance) && Array.isArray(studentData.meals?.todayMenu),
      'Student Dashboard: Personal meal attendance history and today menu present'
    );
    assert(
      typeof studentData.complaints?.total === 'number' && typeof studentData.leaves?.total === 'number',
      `Student Dashboard: Personal complaints (${studentData.complaints?.total}) and leaves (${studentData.leaves?.total}) tracked`
    );

    // =============================================================
    // PART 6: DASHBOARD SUMMARY API (GET /api/dashboard/summary)
    // =============================================================
    console.log('\n--- PART 6: DASHBOARD SUMMARY API ---');

    const summaryRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/summary',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      summaryRes.status === 200 && summaryRes.body?.success && summaryRes.body?.data?.role === 'ADMIN',
      'GET /api/dashboard/summary returns 200 and tailored role summary for Admin'
    );

    const studentSummaryRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/summary',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(
      studentSummaryRes.status === 200 && studentSummaryRes.body?.data?.role === 'STUDENT',
      'GET /api/dashboard/summary returns 200 and tailored role summary for Student'
    );

    // =============================================================
    // PART 7: RBAC & SECURITY ENFORCEMENT
    // =============================================================
    console.log('\n--- PART 7: SECURITY & RBAC ISOLATION ---');

    // Student trying to access Admin dashboard -> 403 Forbidden
    const studentAdminRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAdminRes.status === 403,
      'RBAC: Student forbidden from Admin dashboard (HTTP 403 Forbidden)',
      `Status: ${studentAdminRes.status}`
    );

    // Student trying to access Accountant dashboard -> 403 Forbidden
    const studentAccRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/accountant',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAccRes.status === 403,
      'RBAC: Student forbidden from Accountant dashboard (HTTP 403 Forbidden)',
      `Status: ${studentAccRes.status}`
    );

    // Mess Manager trying to access Accountant dashboard -> 403 Forbidden
    const messAccRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/accountant',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    assert(
      messAccRes.status === 403,
      'RBAC: Mess Manager forbidden from Accountant dashboard (HTTP 403 Forbidden)',
      `Status: ${messAccRes.status}`
    );

    // Unauthenticated access without JWT -> 401 Unauthorized
    const unauthRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
    });
    assert(
      unauthRes.status === 401,
      'Security: Unauthenticated request without JWT rejected (HTTP 401 Unauthorized)',
      `Status: ${unauthRes.status}`
    );

    // =============================================================
    // PART 8: REAL-TIME DYNAMIC METRIC REFLECTION
    // =============================================================
    console.log('\n--- PART 8: REAL-TIME METRIC REFLECTION ---');

    // Get complaints count before insert
    const beforeStats = (await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${adminToken}` },
    })).body?.data?.complaints?.total || 0;

    // Insert a temporary complaint record into MySQL
    const testTicket = `TCK-TEST-${Date.now().toString().slice(-6)}`;
    const [insertResult] = await query(
      `INSERT INTO complaints (ticket_number, student_id, category, title, description, priority, status, created_at)
       VALUES (?, ?, 'ROOM_MAINTENANCE', 'Step 14 Real-time Test', 'Checking dynamic count update in MySQL', 'LOW', 'PENDING', NOW())`,
      [testTicket, student.student_id]
    );
    const testComplaintId = insertResult.insertId;

    // Fetch dashboard again
    const afterStats = (await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${adminToken}` },
    })).body?.data?.complaints?.total || 0;

    assert(
      afterStats === beforeStats + 1,
      `Real-time dynamic verification: Dashboard immediately reflects new MySQL complaint record (Before: ${beforeStats}, After: ${afterStats})`
    );

    // Clean up temporary record
    await query(`DELETE FROM complaints WHERE id = ?`, [testComplaintId]);

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

runStep14Tests();
