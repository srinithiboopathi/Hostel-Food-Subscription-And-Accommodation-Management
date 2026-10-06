const jwt = require('jsonwebtoken');
const express = require('express');
const routes = require('../routes');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'hostel_jwt_secret_key_production_2026';

function getToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runE2ETests() {
  console.log('================================================================');
  console.log('STEP 14: REAL-TIME DASHBOARD & ANALYTICS E2E VERIFICATION SUITE');
  console.log('================================================================');

  const app = express();
  app.use(express.json());
  app.use('/api', routes);

  const server = app.listen(5002);
  const BASE_URL = 'http://localhost:5002/api';

  let totalTests = 0;
  let passedTests = 0;

  function assertTest(name, condition, extraInfo = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log('✓ PASS:', name);
    } else {
      console.error('✗ FAIL:', name, extraInfo);
    }
  }

  try {
    // 1. Database Direct Baseline Queries
    console.log('\n--- 1. DATABASE BASELINE VERIFICATION ---');
    const [sqlStudents] = await db.query('SELECT COUNT(*) as c FROM students');
    const [sqlRooms] = await db.query('SELECT COUNT(*) as c FROM rooms');
    const [sqlAllocations] = await db.query('SELECT COUNT(*) as c FROM room_allocations WHERE status="ACTIVE"');
    const [sqlComplaints] = await db.query('SELECT COUNT(*) as c FROM complaints');
    const [sqlLeaves] = await db.query('SELECT COUNT(*) as c FROM leave_requests');
    const [sqlVisitors] = await db.query('SELECT COUNT(*) as c FROM visitors');
    const [sqlDues] = await db.query('SELECT COALESCE(SUM(amount_due), 0) as due, COALESCE(SUM(amount_paid), 0) as paid FROM student_fee_dues');
    const [sqlMenu] = await db.query('SELECT COUNT(*) as c FROM mess_menu WHERE is_active = 1');

    console.log('Direct MySQL Data:');
    console.log('  Students:', sqlStudents[0].c);
    console.log('  Rooms:', sqlRooms[0].c);
    console.log('  Active Allocations:', sqlAllocations[0].c);
    console.log('  Complaints:', sqlComplaints[0].c);
    console.log('  Leaves:', sqlLeaves[0].c);
    console.log('  Visitors:', sqlVisitors[0].c);
    console.log('  Fee Due/Paid:', sqlDues[0].due, '/', sqlDues[0].paid);
    console.log('  Active Menu Slots:', sqlMenu[0].c);

    // 2. Tokens for All Roles
    const adminToken = getToken({ id: 1, email: 'admin@hostel.edu', role: 'ADMIN' });
    const wardenToken = getToken({ id: 2, email: 'warden@hostel.edu', role: 'WARDEN' });
    const messToken = getToken({ id: 3, email: 'mess@hostel.edu', role: 'MESS_MANAGER' });
    const accountantToken = getToken({ id: 4, email: 'accounts@hostel.edu', role: 'ACCOUNTANT' });
    const student1Token = getToken({ id: 5, email: 'aarav.patel@student.edu', role: 'STUDENT', studentId: 1 });
    const student2Token = getToken({ id: 6, email: 'priya.nair@student.edu', role: 'STUDENT', studentId: 2 });

    // 3. Test Admin Dashboard
    console.log('\n--- 2. ADMIN DASHBOARD API ---');
    const adminRes = await fetch(BASE_URL + '/dashboard/admin', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    const adminJson = await adminRes.json();
    assertTest('Admin API returns HTTP 200', adminRes.status === 200);
    assertTest('Admin students count matches MySQL', adminJson.data?.students?.total === sqlStudents[0].c);
    assertTest('Admin rooms count matches MySQL', adminJson.data?.hostel?.totalRooms === sqlRooms[0].c);
    assertTest('Admin fee billed matches MySQL', Number(adminJson.data?.fees?.totalBilled) === Number(sqlDues[0].due));
    assertTest('Admin fee collected matches MySQL', Number(adminJson.data?.fees?.totalCollected) === Number(sqlDues[0].paid));
    assertTest('Admin complaints count matches MySQL', adminJson.data?.complaints?.total === sqlComplaints[0].c);
    assertTest('Admin leaves count matches MySQL', adminJson.data?.leaves?.total === sqlLeaves[0].c);
    assertTest('Admin visitors count matches MySQL', adminJson.data?.visitors?.total === sqlVisitors[0].c);
    assertTest('Admin recent payments array present', Array.isArray(adminJson.data?.recentActivity?.payments));

    // 4. Test Warden Dashboard
    console.log('\n--- 3. WARDEN DASHBOARD API ---');
    const wardenRes = await fetch(BASE_URL + '/dashboard/warden', {
      headers: { Authorization: 'Bearer ' + wardenToken }
    });
    const wardenJson = await wardenRes.json();
    assertTest('Warden API returns HTTP 200', wardenRes.status === 200);
    assertTest('Warden rooms match MySQL', wardenJson.data?.occupancy?.totalRooms === sqlRooms[0].c);
    assertTest('Warden leaves match MySQL', wardenJson.data?.leaves?.total === sqlLeaves[0].c);
    assertTest('Warden complaints match MySQL', wardenJson.data?.complaints?.total === sqlComplaints[0].c);
    assertTest('Warden visitors match MySQL', wardenJson.data?.visitors?.total === sqlVisitors[0].c);

    // 5. Test Mess Manager Dashboard
    console.log('\n--- 4. MESS MANAGER DASHBOARD API ---');
    const messRes = await fetch(BASE_URL + '/dashboard/mess', {
      headers: { Authorization: 'Bearer ' + messToken }
    });
    const messJson = await messRes.json();
    assertTest('Mess Manager API returns HTTP 200', messRes.status === 200);
    assertTest('Mess active menu items count matches MySQL', messJson.data?.menuOverview?.activeItems === sqlMenu[0].c);
    assertTest('Mess today menu array populated', Array.isArray(messJson.data?.todayMenu));
    assertTest('Mess meal attendance breakdown object present', typeof messJson.data?.todayAttendance === 'object');

    // 6. Test Accountant Dashboard
    console.log('\n--- 5. ACCOUNTANT DASHBOARD API ---');
    const accRes = await fetch(BASE_URL + '/dashboard/accountant', {
      headers: { Authorization: 'Bearer ' + accountantToken }
    });
    const accJson = await accRes.json();
    assertTest('Accountant API returns HTTP 200', accRes.status === 200);
    assertTest('Accountant total billed matches MySQL', Number(accJson.data?.overview?.totalBilled) === Number(sqlDues[0].due));
    assertTest('Accountant total collected matches MySQL', Number(accJson.data?.overview?.totalCollected) === Number(sqlDues[0].paid));
    assertTest('Accountant recent payments ledger present', Array.isArray(accJson.data?.payments?.recent));

    // 7. Test Student Dashboard & Data Isolation
    console.log('\n--- 6. STUDENT DASHBOARD API & ISOLATION ---');
    const s1Res = await fetch(BASE_URL + '/dashboard/student', {
      headers: { Authorization: 'Bearer ' + student1Token }
    });
    const s1Json = await s1Res.json();
    assertTest('Student 1 API returns HTTP 200', s1Res.status === 200);
    assertTest('Student 1 profile correctly identified (Aarav Patel)', s1Json.data?.studentProfile?.fullName === 'Aarav Patel');
    assertTest('Student 1 assigned Room 101', s1Json.data?.accommodation?.room?.room_number === '101');

    const s2Res = await fetch(BASE_URL + '/dashboard/student', {
      headers: { Authorization: 'Bearer ' + student2Token }
    });
    const s2Json = await s2Res.json();
    assertTest('Student 2 API returns HTTP 200', s2Res.status === 200);
    assertTest('Student 2 profile correctly identified (Priya Nair)', s2Json.data?.studentProfile?.fullName === 'Priya Nair');
    assertTest('Student 2 assigned Room G-101', s2Json.data?.accommodation?.room?.room_number === 'G-101');
    assertTest('Student 1 and Student 2 data are isolated', s1Json.data?.studentProfile?.id !== s2Json.data?.studentProfile?.id);

    // 8. Test Summary API
    console.log('\n--- 7. DASHBOARD SUMMARY API ---');
    const sumRes = await fetch(BASE_URL + '/dashboard/summary', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    const sumJson = await sumRes.json();
    assertTest('Summary API returns HTTP 200', sumRes.status === 200);
    assertTest('Summary role is ADMIN', sumJson.data?.role === 'ADMIN');
    assertTest('Summary totalStudents matches MySQL', sumJson.data?.summary?.totalStudents === sqlStudents[0].c);

    // 9. Security & RBAC Enforcement
    console.log('\n--- 8. SECURITY & RBAC ENFORCEMENT ---');
    const sec1 = await fetch(BASE_URL + '/dashboard/admin', {
      headers: { Authorization: 'Bearer ' + student1Token }
    });
    assertTest('Student forbidden from /dashboard/admin (HTTP 403)', sec1.status === 403);

    const sec2 = await fetch(BASE_URL + '/dashboard/warden', {
      headers: { Authorization: 'Bearer ' + student1Token }
    });
    assertTest('Student forbidden from /dashboard/warden (HTTP 403)', sec2.status === 403);

    const sec3 = await fetch(BASE_URL + '/dashboard/accountant', {
      headers: { Authorization: 'Bearer ' + student1Token }
    });
    assertTest('Student forbidden from /dashboard/accountant (HTTP 403)', sec3.status === 403);

    const sec4 = await fetch(BASE_URL + '/dashboard/accountant', {
      headers: { Authorization: 'Bearer ' + messToken }
    });
    assertTest('Mess Manager forbidden from /dashboard/accountant (HTTP 403)', sec4.status === 403);

    const sec5 = await fetch(BASE_URL + '/dashboard/summary');
    assertTest('Unauthenticated request rejected (HTTP 401)', sec5.status === 401);

    // 10. Real-time Live MySQL Data Reflection
    console.log('\n--- 9. REAL-TIME DATA PROPAGATION TEST ---');
    const [initialComplaints] = await db.query('SELECT COUNT(*) as c FROM complaints WHERE student_id = 1');
    const initCount = initialComplaints[0].c;

    await db.query(
      'INSERT INTO complaints (ticket_number, student_id, room_id, category, title, description, priority, status) VALUES (?, 1, 1, "OTHER", "E2E Test Complaint", "Testing real-time reflect", "LOW", "PENDING")',
      ['TCK-E2E-' + Date.now()]
    );

    const refreshedStudRes = await fetch(BASE_URL + '/dashboard/student', {
      headers: { Authorization: 'Bearer ' + student1Token }
    });
    const refreshedStudJson = await refreshedStudRes.json();
    assertTest('Dashboard reflects new MySQL record immediately', refreshedStudJson.data?.complaints?.total === initCount + 1);

    await db.query('DELETE FROM complaints WHERE title = "E2E Test Complaint"');

    console.log('\n================================================================');
    console.log(`TOTAL E2E TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('================================================================');

    server.close(() => process.exit(totalTests === passedTests ? 0 : 1));
  } catch (err) {
    console.error('Fatal Test Exception:', err);
    server.close(() => process.exit(1));
  }
}

runE2ETests();
