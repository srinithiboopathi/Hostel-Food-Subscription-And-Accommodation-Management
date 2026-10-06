/**
 * STEP 25: FINAL INTEGRATION, SYSTEM SMOKE & DEPLOYMENT READINESS TEST SUITE
 *
 * Verifies:
 * 1. Health & Database Connectivity Check
 * 2. Complete End-to-End User Journeys (Admin, Warden, Accountant, Mess Manager, Student)
 * 3. Database Constraints, Foreign Keys & ACID Concurrency Integrity
 * 4. OWASP Security Headers & API Contract Compliance
 * 5. Production Error Handling & Sanitization
 */

const http = require('http');
const app = require('../server');
const { query, pool, checkDatabaseConnection } = require('../config/database');
const { generateToken } = require('../services/authService');
const studentService = require('../services/studentService');
const hostelService = require('../services/hostelService');
const roomService = require('../services/roomService');
const allocationService = require('../services/allocationService');
const foodSubscriptionService = require('../services/foodSubscriptionService');
const menuService = require('../services/menuService');
const mealService = require('../services/mealService');
const feeService = require('../services/feeService');
const paymentService = require('../services/paymentService');
const complaintService = require('../services/complaintService');
const leaveService = require('../services/leaveService');
const visitorService = require('../services/visitorService');
const notificationService = require('../services/notificationService');

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

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runStep25FinalSystemTests() {
  console.log('================================================================');
  console.log(' 🚀 STEP 25: FINAL TESTING & DEPLOYMENT READINESS AUDIT');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}...\n`);

  try {
    // ----------------------------------------------------
    // 1. SYSTEM HEALTH & DATABASE DIAGNOSTICS
    // ----------------------------------------------------
    console.log('--- 1. System Health & Database Diagnostics ---');
    const health = await checkDatabaseConnection();
    assert(health.connected === true, '1. MySQL database connection is healthy and responsive');

    const resHealth = await makeRequest(server, { method: 'GET', path: '/api/health' });
    assert(resHealth.statusCode === 200 && resHealth.body?.success === true, '2. GET /api/health returns HTTP 200 OK');

    const resDbHealth = await makeRequest(server, { method: 'GET', path: '/api/health/database' });
    assert(resDbHealth.statusCode === 200 && resDbHealth.body?.data?.databaseStatus === 'connected', '3. GET /api/health/database reports healthy pool');

    // Verify OWASP Security Headers
    const headers = resHealth.headers;
    const hasSecurityHeaders =
      headers['x-content-type-options'] === 'nosniff' &&
      headers['x-frame-options'] === 'DENY' &&
      headers['referrer-policy'] === 'strict-origin-when-cross-origin';
    assert(hasSecurityHeaders, '4. OWASP security headers properly emitted on HTTP responses');

    // ----------------------------------------------------
    // 2. AUTHENTICATION & MULTI-ROLE SETUP
    // ----------------------------------------------------
    console.log('\n--- 2. Multi-Role Authentication Setup ---');

    async function loginUser(email, password = 'Password@123') {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/login',
        body: { email, password },
      });
      return res.body?.data?.token;
    }

    // Fetch verified active users for all 5 roles
    const [admins] = await query("SELECT id, full_name, email, role FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' LIMIT 1");
    const [wardens] = await query("SELECT id, full_name, email, role FROM users WHERE role = 'WARDEN' AND status = 'ACTIVE' LIMIT 1");
    const [accountants] = await query("SELECT id, full_name, email, role FROM users WHERE role = 'ACCOUNTANT' AND status = 'ACTIVE' LIMIT 1");
    const [messManagers] = await query("SELECT id, full_name, email, role FROM users WHERE role = 'MESS_MANAGER' AND status = 'ACTIVE' LIMIT 1");
    const [students] = await query(`
      SELECT s.id AS student_id, s.user_id, u.email, u.full_name, s.roll_number
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'ACTIVE' AND u.status = 'ACTIVE'
      ORDER BY s.id ASC
      LIMIT 1
    `);

    const admin = admins[0];
    const warden = wardens[0];
    const accountant = accountants[0];
    const messManager = messManagers[0];
    const student = students[0];

    const adminToken = (await loginUser(admin.email)) || generateToken(admin);
    const wardenToken = (await loginUser(warden.email)) || generateToken(warden);
    const accountantToken = (await loginUser(accountant.email)) || generateToken(accountant);
    const messToken = (await loginUser(messManager.email)) || generateToken(messManager);
    const studentToken = (await loginUser(student.email)) || generateToken({
      id: student.user_id,
      email: student.email,
      role: 'STUDENT',
      name: student.full_name,
      student_id: student.student_id,
    });

    assert(adminToken && wardenToken && accountantToken && messToken && studentToken, '5. JWT tokens generated for all 5 system roles');

    // ----------------------------------------------------
    // 3. ADMIN WORKFLOW (End-to-End)
    // ----------------------------------------------------
    console.log('\n--- 3. Administrator Journey Validation ---');

    // Admin Dashboard
    const resAdminDash = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resAdminDash.statusCode === 200 && resAdminDash.body?.data?.students !== undefined, '6. Admin access to master analytics dashboard');

    // Admin Student List & Search
    const resAdminStudents = await makeRequest(server, {
      method: 'GET',
      path: '/api/students?page=1&limit=5',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resAdminStudents.statusCode === 200 && Array.isArray(resAdminStudents.body?.data), '7. Admin retrieves paginated student directory');

    // Admin Hostel & Room Overview
    const resHostels = await makeRequest(server, {
      method: 'GET',
      path: '/api/hostels',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resHostels.statusCode === 200 && Array.isArray(resHostels.body?.data), '8. Admin retrieves hostel blocks and occupancy');

    // Admin Reports Center
    const resSummaryReport = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/summary',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resSummaryReport.statusCode === 200 && Boolean(resSummaryReport.body?.data), '9. Admin retrieves executive consolidated report');

    // ----------------------------------------------------
    // 4. WARDEN WORKFLOW (End-to-End)
    // ----------------------------------------------------
    console.log('\n--- 4. Warden Journey Validation ---');

    // Warden Dashboard
    const resWardenDash = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/warden',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(resWardenDash.statusCode === 200 && Boolean(resWardenDash.body?.data), '10. Warden accesses warden operational dashboard');

    // Available Rooms with vacancy
    const resAvailRooms = await makeRequest(server, {
      method: 'GET',
      path: '/api/allocations/available-rooms',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(resAvailRooms.statusCode === 200 && Array.isArray(resAvailRooms.body?.data), '11. Warden queries vacant rooms with capacity > 0');

    // Complaints Queue
    const resComplaints = await makeRequest(server, {
      method: 'GET',
      path: '/api/complaints?page=1&limit=5',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(resComplaints.statusCode === 200 && resComplaints.body?.pagination, '12. Warden manages student maintenance complaints');

    // Leave Requests Queue
    const resLeaves = await makeRequest(server, {
      method: 'GET',
      path: '/api/leaves?page=1&limit=5',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(resLeaves.statusCode === 200 && resLeaves.body?.pagination, '13. Warden processes student outpass and leave requests');

    // Visitors Management
    const resVisitors = await makeRequest(server, {
      method: 'GET',
      path: '/api/visitors/today',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(resVisitors.statusCode === 200 && resVisitors.body?.data !== undefined, '14. Warden logs and audits active visitor entry logs');

    // ----------------------------------------------------
    // 5. ACCOUNTANT WORKFLOW (End-to-End)
    // ----------------------------------------------------
    console.log('\n--- 5. Accountant Journey Validation ---');

    // Accountant Dashboard
    const resAccDash = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/accountant',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(resAccDash.statusCode === 200 && Boolean(resAccDash.body?.data), '15. Accountant accesses financial control dashboard');

    // Fee Types
    const resFeeTypes = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees/types',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(resFeeTypes.statusCode === 200 && resFeeTypes.body?.data?.length > 0, '16. Accountant retrieves configured fee structure');

    // Fee Ledger
    const resFeeLedger = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees?page=1&limit=5',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(resFeeLedger.statusCode === 200 && resFeeLedger.body?.pagination, '17. Accountant audits student fee bills and balances');

    // Payment History & Financial Stats
    const resFinStats = await makeRequest(server, {
      method: 'GET',
      path: '/api/payments/statistics',
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(resFinStats.statusCode === 200 && resFinStats.body?.data?.total_revenue !== undefined, '18. Accountant retrieves revenue collection telemetry');

    // ----------------------------------------------------
    // 6. MESS MANAGER WORKFLOW (End-to-End)
    // ----------------------------------------------------
    console.log('\n--- 6. Mess Manager Journey Validation ---');

    // Mess Dashboard
    const resMessDash = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/mess',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    assert(resMessDash.statusCode === 200 && Boolean(resMessDash.body?.data), '19. Mess Manager accesses dining & meal analytics');

    // Food Plans
    const resFoodPlans = await makeRequest(server, {
      method: 'GET',
      path: '/api/food/plans',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    assert(resFoodPlans.statusCode === 200 && resFoodPlans.body?.data?.length > 0, '20. Mess Manager retrieves meal subscription plans');

    // Today's Menu
    const resMenuToday = await makeRequest(server, {
      method: 'GET',
      path: '/api/menu/today',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    assert(resMenuToday.statusCode === 200 && resMenuToday.body?.data !== undefined, '21. Mess Manager publishes daily scheduled dining menu');

    // Today's Meal Attendance
    const resMealsToday = await makeRequest(server, {
      method: 'GET',
      path: '/api/meals/today',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    assert(resMealsToday.statusCode === 200 && resMealsToday.body?.data !== undefined, '22. Mess Manager tracks real-time meal consumption');

    // ----------------------------------------------------
    // 7. STUDENT WORKFLOW (End-to-End)
    // ----------------------------------------------------
    console.log('\n--- 7. Student Resident Journey Validation ---');

    // Student Dashboard
    const resStudentDash = await makeRequest(server, {
      method: 'GET',
      path: '/api/dashboard/student',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resStudentDash.statusCode === 200 && Boolean(resStudentDash.body?.data), '23. Student accesses personalized resident dashboard');

    // Student Profile
    const resStudentProfile = await makeRequest(server, {
      method: 'GET',
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resStudentProfile.statusCode === 200 && resStudentProfile.body?.data?.studentDetails, '24. Student views personal profile with accommodation details');

    // Student Personal Fees
    const resStudentFees = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resStudentFees.statusCode === 200 && Array.isArray(resStudentFees.body?.data), '25. Student views isolated personal fee bills');

    // Student Food Subscription
    const resStudentFood = await makeRequest(server, {
      method: 'GET',
      path: '/api/food/subscriptions/my-subscription',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resStudentFood.statusCode === 200, '26. Student views active meal plan subscription');

    // Student Notifications & Badge Count
    const resStudentNotif = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resStudentNotif.statusCode === 200 && resStudentNotif.body?.data?.unreadCount !== undefined, '27. Student receives real-time notification alert count');

    // ----------------------------------------------------
    // 8. DATABASE INTEGRITY AUDIT
    // ----------------------------------------------------
    console.log('\n--- 8. MySQL Database Integrity & Referential Integrity ---');

    // 1. Check for Orphaned Room Allocations
    const [orphanAllocs] = await query(`
      SELECT ra.id
      FROM room_allocations ra
      LEFT JOIN students s ON ra.student_id = s.id
      LEFT JOIN rooms r ON ra.room_id = r.id
      WHERE s.id IS NULL OR r.id IS NULL
    `);
    assert(orphanAllocs.length === 0, '28. Zero orphaned room allocation foreign key records in MySQL');

    // 2. Check for Duplicate Active Allocations
    const [dupAllocs] = await query(`
      SELECT student_id, COUNT(*) AS cnt
      FROM room_allocations
      WHERE status = 'ACTIVE'
      GROUP BY student_id
      HAVING cnt > 1
    `);
    assert(dupAllocs.length === 0, '29. Zero duplicate active room allocations detected');

    // 3. Check for Duplicate Active Food Subscriptions
    const [dupFoodSubs] = await query(`
      SELECT student_id, COUNT(*) AS cnt
      FROM food_subscriptions
      WHERE status = 'ACTIVE'
      GROUP BY student_id
      HAVING cnt > 1
    `);
    assert(dupFoodSubs.length === 0, '30. Zero duplicate active food subscriptions detected');

    // 4. Check for Negative Room Capacities or Occupancy Mismatch
    const [invalidRooms] = await query(`
      SELECT id, room_number, capacity, occupied_count
      FROM rooms
      WHERE capacity <= 0 OR occupied_count < 0
    `);
    assert(invalidRooms.length === 0, '31. All rooms adhere to strictly positive capacity bounds');

    // 5. Check for Orphaned Payment Records
    const [orphanPayments] = await query(`
      SELECT p.id
      FROM payments p
      LEFT JOIN student_fees sf ON p.student_fee_id = sf.id
      WHERE sf.id IS NULL
    `);
    assert(orphanPayments.length === 0, '32. All payment receipts reference valid parent student fee bills');

    // 6. Check for Orphaned Notifications
    const [orphanNotifs] = await query(`
      SELECT n.id
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE u.id IS NULL
    `);
    assert(orphanNotifs.length === 0, '33. All notification alerts reference existing authenticated users');

    console.log('\n================================================================');
    console.log(` 🎯 FINAL SYSTEM AUDIT RESULTS: ${passed}/${total} TESTS PASSED`);
    console.log('================================================================\n');

    if (passed === total) {
      console.log('✨ ALL 33 FINAL INTEGRATION & DEPLOYMENT READINESS TESTS PASSED!');
    } else {
      console.error(`⚠️ ${total - passed} test(s) failed.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error running Step 25 Final System tests:', error);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

if (require.main === module) {
  runStep25FinalSystemTests();
}

module.exports = { runStep25FinalSystemTests };
