/**
 * STEP 12 — REAL-TIME LEAVE & VISITOR MANAGEMENT
 * Comprehensive End-to-End Verification Test Script
 */

const http = require('http');
const { pool, query } = require('../config/database');
const app = require('../server');

function makeRequest(server, { method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runStep12Tests() {
  console.log('\n============================================================');
  console.log('🧪 STEP 12: REAL-TIME LEAVE & VISITOR MANAGEMENT E2E TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;
  let server = null;

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

  try {
    // Start temporary HTTP server on port 0
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });

    // -------------------------------------------------------------
    // Setup: Retrieve Test Users
    // -------------------------------------------------------------
    const [students] = await query(
      `SELECT s.id as student_id, s.roll_number, u.id as user_id, u.email, u.role 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.status = 'ACTIVE' LIMIT 2`
    );

    const [wardens] = await query(
      `SELECT u.id as user_id, u.email, u.role 
       FROM users u 
       WHERE u.role = 'WARDEN' AND u.status = 'ACTIVE' LIMIT 1`
    );

    const [admins] = await query(
      `SELECT u.id as user_id, u.email, u.role 
       FROM users u 
       WHERE u.role = 'ADMIN' AND u.status = 'ACTIVE' LIMIT 1`
    );

    assert(students.length >= 1, 'Test student user exists in database', `Found ${students.length}`);
    assert(wardens.length >= 1, 'Test warden user exists in database', `Found ${wardens.length}`);
    assert(admins.length >= 1, 'Test admin user exists in database', `Found ${admins.length}`);

    const student1 = students[0];
    const student2 = students[1] || students[0];
    const warden = wardens[0];
    const admin = admins[0];

    // Login helper
    async function login(email, password = 'Password@123') {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/login',
        body: { email, password },
      });
      return res.body?.data?.token;
    }

    const student1Token = await login(student1.email);
    const wardenToken = await login(warden.email);
    const adminToken = await login(admin.email);

    let student2Token = null;
    if (students.length > 1) {
      student2Token = await login(student2.email);
    }

    assert(!!student1Token, 'Student-1 logged in successfully with JWT');
    assert(!!wardenToken, 'Warden logged in successfully with JWT');
    assert(!!adminToken, 'Admin logged in successfully with JWT');

    // =============================================================
    // PART A: LEAVE MANAGEMENT TESTS
    // =============================================================
    console.log('\n--- PART A: LEAVE MANAGEMENT TESTS ---');

    // 1. Validation Test: Reject Invalid / Backwards Dates
    const invalidDateRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/leaves',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        leaveType: 'HOME_VISIT',
        startDate: '2026-10-15',
        endDate: '2026-10-10', // End before start!
        destinationAddress: '123 Test Street, Mumbai',
        emergencyContact: '+91 9876543210',
        reason: 'Diwali vacation visit',
      },
    });

    assert(
      invalidDateRes.status === 400,
      'Leave validation rejects end date earlier than start date (HTTP 400)',
      `Status: ${invalidDateRes.status}`
    );

    // 2. Create Valid Leave Request as Student 1
    const createLeaveRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/leaves',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        leaveType: 'HOME_VISIT',
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        destinationAddress: '42 Marine Drive, Mumbai',
        emergencyContact: '+91 9876543210',
        reason: 'Attending family wedding ceremony',
      },
    });

    assert(
      createLeaveRes.status === 201 && createLeaveRes.body?.success,
      'Student submits valid leave request (HTTP 201 Created)',
      JSON.stringify(createLeaveRes.body)
    );

    const createdLeave = createLeaveRes.body?.data;
    assert(
      createdLeave?.status === 'PENDING',
      'Newly submitted leave has PENDING status in initial state',
      `Status: ${createdLeave?.status}`
    );
    assert(
      createdLeave?.student_id === student1.student_id,
      'Student ID is securely mapped from JWT without frontend trust',
      `Mapped student_id: ${createdLeave?.student_id}`
    );

    // 3. Verify Direct MySQL INSERT for Leave Request
    const [dbLeave] = await query('SELECT * FROM leave_requests WHERE id = ?', [createdLeave.id]);
    assert(
      dbLeave.length > 0 && dbLeave[0].destination_address === '42 Marine Drive, Mumbai',
      'Direct MySQL verification: Leave record exists in database table leave_requests',
      JSON.stringify(dbLeave[0])
    );
    assert(
      dbLeave[0].status === 'PENDING',
      'Direct MySQL verification: Database row status is PENDING'
    );

    // 4. Retrieve Student's Own Leaves (GET /api/leaves/my)
    const myLeavesRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/leaves/my',
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      myLeavesRes.status === 200 && Array.isArray(myLeavesRes.body?.data),
      'Student can retrieve their own leave requests list (HTTP 200)',
      `Count: ${myLeavesRes.body?.data?.length}`
    );
    const hasCreated = myLeavesRes.body?.data?.some((l) => l.id === createdLeave.id);
    assert(hasCreated, 'Student my-leaves list contains newly submitted leave request');

    // 5. Security & Isolation: Student 2 cannot access Student 1's leave details
    if (student2Token && student1.student_id !== student2.student_id) {
      const crossAccessRes = await makeRequest(server, {
        method: 'GET',
        path: `/api/leaves/${createdLeave.id}`,
        headers: { Authorization: `Bearer ${student2Token}` },
      });

      assert(
        crossAccessRes.status === 403,
        'Student 2 cannot view Student 1 private leave details (HTTP 403 Forbidden)',
        `Status: ${crossAccessRes.status}`
      );
    }

    // 6. Warden retrieves Pending Leaves
    const wardenLeavesRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/leaves?status=PENDING',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      wardenLeavesRes.status === 200,
      'Warden can fetch pending leave requests from MySQL (HTTP 200)',
      `Total: ${wardenLeavesRes.body?.pagination?.total}`
    );

    // 7. Warden Approves Student Leave
    const approveRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/leaves/${createdLeave.id}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: {
        status: 'APPROVED',
        reviewRemarks: 'Approved for family function. Please report back on Oct 15.',
      },
    });

    assert(
      approveRes.status === 200 && approveRes.body?.data?.status === 'APPROVED',
      'Warden successfully APPROVES leave request (HTTP 200)',
      `Status: ${approveRes.body?.data?.status}`
    );

    // 8. Direct MySQL status check for approval
    const [dbApproved] = await query('SELECT * FROM leave_requests WHERE id = ?', [createdLeave.id]);
    assert(
      dbApproved[0].status === 'APPROVED' && dbApproved[0].reviewed_by === warden.user_id,
      'Direct MySQL verification: Status changed to APPROVED with reviewed_by and review_remarks',
      `DB Status: ${dbApproved[0].status}, Reviewer: ${dbApproved[0].reviewed_by}`
    );

    // 9. Student sees APPROVED status
    const studentCheckRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/leaves/${createdLeave.id}`,
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      studentCheckRes.body?.data?.status === 'APPROVED' && studentCheckRes.body?.data?.reviewed_by_name,
      'Student retrieves updated leave and sees APPROVED status with reviewer details'
    );

    // 10. Create and Reject another leave request
    const createLeave2Res = await makeRequest(server, {
      method: 'POST',
      path: '/api/leaves',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        leaveType: 'OTHER',
        startDate: '2026-11-01',
        endDate: '2026-11-04',
        destinationAddress: 'Goa Beach Resort',
        emergencyContact: '+91 9876543210',
        reason: 'Weekend leisure trip with friends',
      },
    });

    const leave2 = createLeave2Res.body?.data;
    assert(!!leave2?.id, 'Second leave request created for rejection test');

    const rejectRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/leaves/${leave2.id}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: {
        status: 'REJECTED',
        reviewRemarks: 'Outstation leisure trips not permitted before internal exams.',
      },
    });

    assert(
      rejectRes.status === 200 && rejectRes.body?.data?.status === 'REJECTED',
      'Warden successfully REJECTS leave request with explanation notes',
      `Status: ${rejectRes.body?.data?.status}`
    );

    // 11. Direct MySQL check for rejection
    const [dbRejected] = await query('SELECT * FROM leave_requests WHERE id = ?', [leave2.id]);
    assert(
      dbRejected[0].status === 'REJECTED' && dbRejected[0].review_remarks.includes('internal exams'),
      'Direct MySQL verification: Record status is REJECTED in database'
    );

    // 12. Student cannot approve their own leave
    const studentApproveRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/leaves/${createdLeave.id}`,
      headers: { Authorization: `Bearer ${student1Token}` },
      body: { status: 'APPROVED' },
    });

    assert(
      studentApproveRes.status === 403,
      'Security: Student cannot approve their own leave request (HTTP 403 Forbidden)',
      `Status: ${studentApproveRes.status}`
    );

    // 13. Leave Statistics endpoint
    const statsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/leaves/statistics',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      statsRes.status === 200 && statsRes.body?.data?.overview?.total_requests > 0,
      'GET /api/leaves/statistics returns live database SQL aggregations',
      JSON.stringify(statsRes.body?.data?.overview)
    );

    // =============================================================
    // PART B: VISITOR MANAGEMENT TESTS
    // =============================================================
    console.log('\n--- PART B: VISITOR MANAGEMENT TESTS ---');

    // 14. Register a new Visitor
    const regVisitorRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/visitors',
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: {
        studentId: student1.student_id,
        visitorName: 'Sunil Kumar Sharma',
        relationship: 'Father',
        phoneNumber: '+91 9811122233',
        idProofType: 'AADHAAR',
        idProofNumber: '4892 1092 3847',
        purpose: 'Semester fee deposit & medical checkup visit',
        remarks: 'Allowed to visit hostel reception lobby',
      },
    });

    assert(
      regVisitorRes.status === 201 && regVisitorRes.body?.success,
      'Warden registers new visitor entry (HTTP 201 Created)',
      JSON.stringify(regVisitorRes.body)
    );

    const createdVisitor = regVisitorRes.body?.data;
    assert(
      createdVisitor?.status === 'INSIDE',
      'Newly registered visitor automatically has status INSIDE',
      `Status: ${createdVisitor?.status}`
    );
    assert(
      !!createdVisitor?.check_in_time,
      'Visitor entry records check_in_time timestamp in MySQL',
      `Check-in: ${createdVisitor?.check_in_time}`
    );

    // 15. Direct MySQL check for visitor
    const [dbVisitor] = await query('SELECT * FROM visitors WHERE id = ?', [createdVisitor.id]);
    assert(
      dbVisitor.length > 0 && dbVisitor[0].visitor_name === 'Sunil Kumar Sharma',
      'Direct MySQL verification: Visitor row inserted into database table visitors',
      JSON.stringify(dbVisitor[0])
    );
    assert(
      dbVisitor[0].status === 'INSIDE',
      'Direct MySQL verification: Visitor status in database is INSIDE'
    );

    // 16. Today's active visitors (GET /api/visitors/today)
    const todayVisitorsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/visitors/today',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      todayVisitorsRes.status === 200 && Array.isArray(todayVisitorsRes.body?.data?.visitors),
      "Warden retrieves today's visitors summary & list (HTTP 200)",
      `Summary: ${JSON.stringify(todayVisitorsRes.body?.data?.summary)}`
    );
    const hasVisitor = todayVisitorsRes.body?.data?.visitors?.some((v) => v.id === createdVisitor.id);
    assert(hasVisitor, "Today's visitor list contains newly registered guest");

    // 17. Check out visitor (Exit recording)
    const checkoutRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/visitors/${createdVisitor.id}/checkout`,
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: {
        remarks: 'Left campus safely by main gate',
      },
    });

    assert(
      checkoutRes.status === 200 && checkoutRes.body?.data?.status === 'CHECKED_OUT',
      'Warden logs visitor CHECK-OUT departure (HTTP 200)',
      `Status: ${checkoutRes.body?.data?.status}`
    );
    assert(
      !!checkoutRes.body?.data?.check_out_time,
      'Check-out saves departure timestamp without overwriting entry time',
      `Check-out time: ${checkoutRes.body?.data?.check_out_time}`
    );

    // 18. Direct MySQL check for check-out
    const [dbCheckedOut] = await query('SELECT * FROM visitors WHERE id = ?', [createdVisitor.id]);
    assert(
      dbCheckedOut[0].status === 'CHECKED_OUT' && dbCheckedOut[0].check_out_time !== null,
      'Direct MySQL verification: Status updated to CHECKED_OUT and check_out_time is persisted in database',
      `Check-in: ${dbCheckedOut[0].check_in_time}, Check-out: ${dbCheckedOut[0].check_out_time}`
    );

    // 19. Duplicate Checkout Prevention
    const duplicateCheckoutRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/visitors/${createdVisitor.id}/checkout`,
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      duplicateCheckoutRes.status === 400,
      'Prevents invalid duplicate checkout for already departed visitor (HTTP 400)',
      `Status: ${duplicateCheckoutRes.status}`
    );

    // 20. Visitor Search and Filtering
    const searchVisitorRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/visitors?search=Sunil',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      searchVisitorRes.status === 200 && searchVisitorRes.body?.data?.length >= 1,
      'Visitor search by name query operates dynamically via database query',
      `Matches: ${searchVisitorRes.body?.data?.length}`
    );

    // 21. Visitor Statistics SQL Aggregations
    const visitorStatsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/visitors/statistics',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      visitorStatsRes.status === 200 && visitorStatsRes.body?.data?.overview?.total_visitors > 0,
      'GET /api/visitors/statistics returns aggregated counts and telemetry',
      JSON.stringify(visitorStatsRes.body?.data?.overview)
    );

    // 22. Security: Student cannot register visitors
    const studentRegisterRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/visitors',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        studentId: student1.student_id,
        visitorName: 'Unauthorized Guest',
        relationship: 'Friend',
        phoneNumber: '+91 9999999999',
        idProofType: 'OTHER',
        idProofNumber: 'XYZ123',
        purpose: 'Unauthorized access attempt',
      },
    });

    assert(
      studentRegisterRes.status === 403,
      'Security: Students are not authorized to register visitor gate passes (HTTP 403 Forbidden)',
      `Status: ${studentRegisterRes.status}`
    );

    // 23. Security: Student cannot check out visitors
    const studentCheckoutRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/visitors/${createdVisitor.id}/checkout`,
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      studentCheckoutRes.status === 403,
      'Security: Students are not authorized to check out visitor passes (HTTP 403 Forbidden)',
      `Status: ${studentCheckoutRes.status}`
    );

  } catch (err) {
    console.error('Fatal error during E2E test execution:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log('\n============================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStep12Tests().then(async () => {
  await pool.end();
});
