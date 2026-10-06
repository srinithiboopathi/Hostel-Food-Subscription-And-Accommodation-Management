/**
 * STEP 22: ADMIN DASHBOARD & REPORTING SYSTEM E2E TEST SUITE
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
  console.log('================================================================');
  console.log('  STARTING STEP 22: ADMIN DASHBOARD & REPORTING SYSTEM TESTS    ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // -------------------------------------------------------------
    // 1. JWT AUTHENTICATION
    // -------------------------------------------------------------
    console.log('--- 1. ACTOR AUTHENTICATION ---');
    const [activeUsers] = await query("SELECT id, email, role FROM users WHERE status = 'ACTIVE'");
    const adminUser = activeUsers.find((u) => u.role === 'ADMIN') || { email: 'admin@hostel.edu' };
    const wardenUser = activeUsers.find((u) => u.role === 'WARDEN') || { email: 'warden@hostel.edu' };
    const accountantUser = activeUsers.find((u) => u.role === 'ACCOUNTANT') || { email: 'accountant@hostel.edu' };
    const messManagerUser = activeUsers.find((u) => u.role === 'MESS_MANAGER') || { email: 'mess@hostel.edu' };
    const studentUser = activeUsers.find((u) => u.role === 'STUDENT') || { email: 'aarav.patel@student.edu' };

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
    const accountantToken = await login(accountantUser.email);
    const messToken = await login(messManagerUser.email);
    const studentToken = await login(studentUser.email);

    assert(adminToken, 'Admin user authenticated with valid JWT token');
    assert(wardenToken, 'Warden user authenticated with valid JWT token');
    assert(accountantToken, 'Accountant user authenticated with valid JWT token');
    assert(messToken, 'Mess Manager authenticated with valid JWT token');
    assert(studentToken, 'Student user authenticated with valid JWT token');

    // -------------------------------------------------------------
    // 2. ADMIN DASHBOARD ACCESS & DATA STRUCTURE
    // -------------------------------------------------------------
    console.log('\n--- 2. ADMIN DASHBOARD ACCESS & LIVE AGGREGATIONS ---');
    const adminDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(adminDashRes.statusCode === 200, 'GET /api/dashboard/admin returns HTTP 200 OK');
    const adminData = adminDashRes.body?.data;
    assert(Boolean(adminData), 'Dashboard payload exists');

    // -------------------------------------------------------------
    // 3. STUDENT METRICS & DEMOGRAPHICS AGGREGATIONS
    // -------------------------------------------------------------
    console.log('\n--- 3. LIVE STUDENT STATISTICS ---');
    assert(adminData.students?.total !== undefined, `Total students: ${adminData.students?.total}`);
    assert(adminData.students?.active !== undefined, `Active students: ${adminData.students?.active}`);
    assert(Array.isArray(adminData.students?.byDepartment), 'Department-wise student distribution array present');
    assert(Array.isArray(adminData.students?.byYear), 'Year-wise student distribution array present');
    assert(Array.isArray(adminData.students?.recent), 'Recent students table records present');

    // -------------------------------------------------------------
    // 4. ACCOMMODATION & ROOM OCCUPANCY AGGREGATIONS
    // -------------------------------------------------------------
    console.log('\n--- 4. LIVE ACCOMMODATION & OCCUPANCY ---');
    assert(adminData.hostel?.totalHostels !== undefined, `Total hostels: ${adminData.hostel?.totalHostels}`);
    assert(adminData.hostel?.totalRooms !== undefined, `Total rooms: ${adminData.hostel?.totalRooms}`);
    assert(adminData.hostel?.totalCapacity !== undefined, `Total bed capacity: ${adminData.hostel?.totalCapacity}`);
    assert(adminData.hostel?.occupiedBeds !== undefined, `Occupied beds: ${adminData.hostel?.occupiedBeds}`);
    assert(adminData.hostel?.availableBeds !== undefined, `Available beds: ${adminData.hostel?.availableBeds}`);
    assert(adminData.hostel?.occupancyPercentage !== undefined, `Occupancy percentage: ${adminData.hostel?.occupancyPercentage}%`);
    assert(Array.isArray(adminData.hostel?.hostelOccupancy), 'Hostel-wise occupancy breakdown array present');
    assert(adminData.hostel?.roomStatus?.available !== undefined, `Room status available: ${adminData.hostel?.roomStatus?.available}`);

    // -------------------------------------------------------------
    // 5. FOOD & DINING METRICS AGGREGATIONS
    // -------------------------------------------------------------
    console.log('\n--- 5. LIVE FOOD & MESS STATISTICS ---');
    assert(adminData.food?.activeSubscribers !== undefined, `Active subscribers: ${adminData.food?.activeSubscribers}`);
    assert(adminData.food?.monthlyFoodRevenue !== undefined, `Monthly food revenue: ₹${adminData.food?.monthlyFoodRevenue}`);
    assert(adminData.food?.todayAttendance?.breakfast !== undefined, `Today breakfast count: ${adminData.food?.todayAttendance?.breakfast}`);
    assert(adminData.food?.todayAttendance?.lunch !== undefined, `Today lunch count: ${adminData.food?.todayAttendance?.lunch}`);
    assert(adminData.food?.todayAttendance?.dinner !== undefined, `Today dinner count: ${adminData.food?.todayAttendance?.dinner}`);
    assert(Array.isArray(adminData.food?.planDistribution), 'Food plan distribution array present');

    // -------------------------------------------------------------
    // 6. FINANCIAL REALIZATION & REVENUE AGGREGATIONS
    // -------------------------------------------------------------
    console.log('\n--- 6. LIVE FINANCIAL & REVENUE STATISTICS ---');
    assert(adminData.fees?.totalRevenue !== undefined, `Total revenue collected: ₹${adminData.fees?.totalRevenue}`);
    assert(adminData.fees?.todayCollection !== undefined, `Today collection: ₹${adminData.fees?.todayCollection}`);
    assert(adminData.fees?.thisMonthCollection !== undefined, `This month collection: ₹${adminData.fees?.thisMonthCollection}`);
    assert(adminData.fees?.totalPending !== undefined, `Pending fees: ₹${adminData.fees?.totalPending}`);
    assert(adminData.fees?.overdueInvoices !== undefined, `Overdue invoices: ${adminData.fees?.overdueInvoices}`);
    assert(Array.isArray(adminData.fees?.monthlyRevenueTrend), '6-month monthly revenue trend array present');
    assert(Array.isArray(adminData.fees?.feeCategoryRevenue), 'Fee category revenue breakdown array present');

    // -------------------------------------------------------------
    // 7. ROLE-BASED DASHBOARD ROUTE PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- 7. RBAC ROUTE ISOLATION ---');
    // Student blocked from Admin Dashboard
    const studentAdminDash = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAdminDash.statusCode === 403, 'Student blocked from GET /api/dashboard/admin (HTTP 403 Forbidden)');

    // Warden Dashboard Access
    const wardenDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/warden',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(wardenDashRes.statusCode === 200, 'Warden can access GET /api/dashboard/warden (HTTP 200 OK)');

    // Accountant Dashboard Access
    const accountantDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/accountant',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(accountantDashRes.statusCode === 200, 'Accountant can access GET /api/dashboard/accountant (HTTP 200 OK)');

    // Mess Manager Dashboard Access
    const messDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/mess',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    assert(messDashRes.statusCode === 200, 'Mess Manager can access GET /api/dashboard/mess (HTTP 200 OK)');

    // Student Dashboard Access
    const studentDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/student',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentDashRes.statusCode === 200, 'Student can access their personal GET /api/dashboard/student (HTTP 200 OK)');

    // Unauthenticated Dashboard Request
    const unauthDashRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
    });
    assert(unauthDashRes.statusCode === 401, 'Unauthenticated request blocked with HTTP 401 Unauthorized');

    // -------------------------------------------------------------
    // 8. REPORTS CENTER & FILTERS
    // -------------------------------------------------------------
    console.log('\n--- 8. REPORTS CENTER & FILTERS ---');
    // 8.1 Student Report
    const studentReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/students?limit=10',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(studentReport.statusCode === 200, 'GET /api/reports/students returns HTTP 200');
    assert(Array.isArray(studentReport.body?.data?.records || studentReport.body?.data), 'Student report contains array of data');

    // 8.2 Room & Occupancy Report
    const roomReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/rooms',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(roomReport.statusCode === 200, 'GET /api/reports/rooms returns HTTP 200');

    // 8.3 Meal Attendance Report
    const mealReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/meals',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(mealReport.statusCode === 200, 'GET /api/reports/meals returns HTTP 200');

    // 8.4 Fees & Payment Reports
    const feeReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/fees',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(feeReport.statusCode === 200, 'GET /api/reports/fees returns HTTP 200');

    const paymentReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/payments',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(paymentReport.statusCode === 200, 'GET /api/reports/payments returns HTTP 200');

    // 8.5 Summary Consolidated Report
    const summaryReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/summary',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(summaryReport.statusCode === 200, 'GET /api/reports/summary returns HTTP 200');
    assert((summaryReport.body?.data?.students?.total !== undefined || summaryReport.body?.data?.totalStudents !== undefined), 'Summary report contains consolidated telemetry');

    // -------------------------------------------------------------
    // 9. STUDENT REPORT ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- 9. STUDENT REPORT ISOLATION ---');
    const studentSelfReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/students',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentSelfReport.statusCode === 200, 'Student can access personal student report');
    const studentRecords = studentSelfReport.body?.data?.records || studentSelfReport.body?.data || [];
    assert(studentRecords.length <= 1, 'Student isolated to their own record in report');

    const studentBlockedFeeReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/summary',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentBlockedFeeReport.statusCode === 403, 'Student blocked from Executive Summary report (HTTP 403)');

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('\n================================================================');
    console.log(`  STEP 22 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)  `);
    console.log('================================================================\n');
    process.exit(total > 0 && passed === total ? 0 : 1);
  }
}

runTests();
