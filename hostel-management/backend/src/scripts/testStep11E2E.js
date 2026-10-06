/**
 * STEP 11 — REAL-TIME COMPLAINT & MAINTENANCE MANAGEMENT
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

async function runStep11Tests() {
  console.log('\n============================================================');
  console.log('🧪 STEP 11: REAL-TIME COMPLAINT & MAINTENANCE E2E TEST SUITE');
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
       ORDER BY s.id ASC LIMIT 2`
    );

    const student1 = students[0];
    const student2 = students[1];

    const [wardens] = await query(
      `SELECT id, email, role FROM users WHERE role = 'WARDEN' LIMIT 1`
    );
    const warden = wardens[0];

    const [admins] = await query(
      `SELECT id, email, role FROM users WHERE role = 'ADMIN' LIMIT 1`
    );
    const admin = admins[0];

    const [staffMembers] = await query(
      `SELECT s.id as staff_id, u.full_name, u.id as user_id, u.email, u.role 
       FROM staff s 
       JOIN users u ON s.user_id = u.id 
       LIMIT 1`
    );
    const staff = staffMembers[0];

    // -------------------------------------------------------------
    // Authenticate Users
    // -------------------------------------------------------------
    console.log('📌 Authenticating Test Actors...');
    const loginStudent1Res = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: student1.email, password: 'Password@123' },
    });
    const student1Token = loginStudent1Res.body?.data?.token;

    const loginStudent2Res = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: student2.email, password: 'Password@123' },
    });
    const student2Token = loginStudent2Res.body?.data?.token;

    const loginWardenRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: warden.email, password: 'Password@123' },
    });
    const wardenToken = loginWardenRes.body?.data?.token;

    const loginAdminRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: admin.email, password: 'Password@123' },
    });
    const adminToken = loginAdminRes.body?.data?.token;

    assert(Boolean(student1Token), '1. Student 1 logged in with valid JWT token');
    assert(Boolean(student2Token), '2. Student 2 logged in with valid JWT token');
    assert(Boolean(wardenToken), '3. Warden logged in with valid JWT token');
    assert(Boolean(adminToken), '4. Admin logged in with valid JWT token');

    // -------------------------------------------------------------
    // Test 5 & 6: Student 1 raises a new complaint
    // -------------------------------------------------------------
    console.log('\n📌 Testing Student Complaint Creation...');
    const complaintPayload = {
      category: 'ELECTRICAL',
      title: 'Power Socket Sparking in Room',
      description: 'The desk power socket has loose contacts and sparks when plugging in the study lamp.',
      priority: 'HIGH',
    };

    const createRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/complaints',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: complaintPayload,
    });
    assert(
      createRes.status === 201 && createRes.body?.data?.ticket_number,
      '5. Student 1 successfully created a complaint (POST /api/complaints returned 201)',
      JSON.stringify(createRes.body)
    );

    const createdComplaint = createRes.body?.data;
    const ticketNumber = createdComplaint?.ticket_number;
    const complaintId = createdComplaint?.id;

    assert(
      ticketNumber && ticketNumber.startsWith('TCK-'),
      `6. Unique Ticket Number format validated (${ticketNumber})`
    );

    // -------------------------------------------------------------
    // Test 7: Verify MySQL DB State for the new complaint
    // -------------------------------------------------------------
    const [dbComplaints] = await query(
      `SELECT * FROM complaints WHERE id = ?`,
      [complaintId]
    );
    assert(
      dbComplaints.length === 1 &&
        dbComplaints[0].ticket_number === ticketNumber &&
        dbComplaints[0].student_id === student1.student_id &&
        dbComplaints[0].status === 'PENDING',
      '7. Direct MySQL query verified ticket persistence, student association, and initial PENDING status'
    );

    // -------------------------------------------------------------
    // Test 8: Verify initial complaint_updates audit entry
    // -------------------------------------------------------------
    const [dbUpdates1] = await query(
      `SELECT * FROM complaint_updates WHERE complaint_id = ?`,
      [complaintId]
    );
    assert(
      dbUpdates1.length >= 1 && dbUpdates1[0].status_to === 'PENDING',
      '8. Initial complaint creation audit entry verified in complaint_updates table'
    );

    // -------------------------------------------------------------
    // Test 9: Student 1 retrieves own complaints list (GET /api/complaints/my)
    // -------------------------------------------------------------
    console.log('\n📌 Testing Student Complaints Retrieval & Privacy Isolation...');
    const myComplaintsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/complaints/my',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(
      myComplaintsRes.status === 200 &&
        Array.isArray(myComplaintsRes.body?.data) &&
        myComplaintsRes.body?.data.some((c) => c.id === complaintId),
      '9. Student 1 can retrieve own complaints via GET /api/complaints/my'
    );

    // -------------------------------------------------------------
    // Test 10: Student 2 attempts to access Student 1's complaint (403 Forbidden)
    // -------------------------------------------------------------
    const unauthorizedAccessRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(
      unauthorizedAccessRes.status === 403,
      `10. Student 2 blocked with 403 Forbidden from accessing Student 1's complaint`,
      `Status: ${unauthorizedAccessRes.status}`
    );

    // -------------------------------------------------------------
    // Test 11: Student attempts to modify complaint status/assignment (403 Forbidden)
    // -------------------------------------------------------------
    const studentTamperRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${student1Token}` },
      body: { status: 'RESOLVED', remarks: 'Self-resolved' },
    });
    assert(
      studentTamperRes.status === 403,
      '11. Student blocked with 403 Forbidden when attempting to update complaint status/assignment'
    );

    // -------------------------------------------------------------
    // Test 12: Warden Views Complaints List with Filters & Search
    // -------------------------------------------------------------
    console.log('\n📌 Testing Warden Workflow & Assignment...');
    const wardenListRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/complaints?search=${encodeURIComponent(ticketNumber)}&category=ELECTRICAL`,
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(
      wardenListRes.status === 200 &&
        wardenListRes.body?.data?.length > 0 &&
        wardenListRes.body?.data[0].id === complaintId,
      '12. Warden retrieved complaint list with keyword and category filters'
    );

    // -------------------------------------------------------------
    // Test 13: Warden assigns complaint to staff and marks IN_PROGRESS
    // -------------------------------------------------------------
    const assignPayload = {
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      assignedTo: staff ? staff.user_id : warden.id,
      remarks: 'Technician dispatched to inspect desk socket and wiring.',
    };

    const assignRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: assignPayload,
    });
    assert(
      assignRes.status === 200 &&
        assignRes.body?.data?.status === 'IN_PROGRESS' &&
        assignRes.body?.data?.priority === 'URGENT',
      '13. Warden updated complaint to IN_PROGRESS and assigned technician (PUT /api/complaints/:id)'
    );

    // -------------------------------------------------------------
    // Test 14: Verify MySQL update and audit history for IN_PROGRESS
    // -------------------------------------------------------------
    const [dbUpdates2] = await query(
      `SELECT * FROM complaint_updates WHERE complaint_id = ? ORDER BY id ASC`,
      [complaintId]
    );
    assert(
      dbUpdates2.length >= 2 &&
        dbUpdates2[dbUpdates2.length - 1].status_to === 'IN_PROGRESS' &&
        dbUpdates2[dbUpdates2.length - 1].remarks.includes('Technician dispatched'),
      '14. Audit history record for IN_PROGRESS transaction verified in MySQL complaint_updates'
    );

    // -------------------------------------------------------------
    // Test 15: Warden Marks Complaint RESOLVED with Resolution Note
    // -------------------------------------------------------------
    console.log('\n📌 Testing Resolution & Final Audit Verification...');
    const resolvePayload = {
      status: 'RESOLVED',
      remarks: 'Socket module and internal wiring replaced. Tested with multimeter and load - operating normally.',
    };

    const resolveRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: resolvePayload,
    });
    assert(
      resolveRes.status === 200 && resolveRes.body?.data?.status === 'RESOLVED',
      '15. Warden marked complaint as RESOLVED with resolution note'
    );

    // -------------------------------------------------------------
    // Test 16: Verify complete timeline in GET /api/complaints/:id
    // -------------------------------------------------------------
    const detailsRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    const updates = detailsRes.body?.data?.updates;
    assert(
      detailsRes.status === 200 &&
        Array.isArray(updates) &&
        updates.length >= 3 &&
        updates.some((u) => u.status_to === 'RESOLVED'),
      '16. Complaint details API returns complete chronological audit timeline (GET /api/complaints/:id)'
    );

    // -------------------------------------------------------------
    // Test 17: Student 1 views updated RESOLVED complaint & timeline
    // -------------------------------------------------------------
    const studentViewRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(
      studentViewRes.status === 200 &&
        studentViewRes.body?.data?.status === 'RESOLVED' &&
        studentViewRes.body?.data?.updates?.length >= 3,
      '17. Student 1 successfully sees updated RESOLVED status and complete audit trail'
    );

    // -------------------------------------------------------------
    // Test 18: Validation - Invalid Category Rejection (400 Bad Request)
    // -------------------------------------------------------------
    console.log('\n📌 Testing Validation & Edge Cases...');
    const invalidCatRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/complaints',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        category: 'INVALID_CATEGORY_XYZ',
        title: 'Test Invalid',
        description: 'Test Invalid description',
      },
    });
    assert(
      invalidCatRes.status === 400,
      '18. Rejected complaint creation with invalid ENUM category (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // Test 19: Validation - Invalid Status Rejection on Update
    // -------------------------------------------------------------
    const invalidStatusRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: { status: 'NON_EXISTENT_STATUS' },
    });
    assert(
      invalidStatusRes.status === 400,
      '19. Rejected update with invalid ENUM status (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // Test 20: Missing Title/Description Validation (400 Bad Request)
    // -------------------------------------------------------------
    const missingFieldsRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/complaints',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: { category: 'PLUMBING', title: '' },
    });
    assert(
      missingFieldsRes.status === 400,
      '20. Rejected complaint with missing mandatory title/description (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // Test 21: Analytics & Statistics API (GET /api/complaints/statistics)
    // -------------------------------------------------------------
    console.log('\n📌 Testing Analytics & Dashboard Aggregation...');
    const statsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/complaints/statistics',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(
      statsRes.status === 200 &&
        statsRes.body?.data?.overview &&
        Array.isArray(statsRes.body?.data?.category_distribution) &&
        Array.isArray(statsRes.body?.data?.priority_distribution),
      '21. Analytics statistics endpoint returns live aggregated metrics & distribution data'
    );

    // -------------------------------------------------------------
    // Test 22: MySQL Transaction Rollback verification
    // -------------------------------------------------------------
    console.log('\n📌 Testing Transaction Safety & Rollback...');
    let rollbackSuccess = true;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE complaints SET status = 'IN_PROGRESS' WHERE id = ?`,
        [complaintId]
      );
      // Intentionally trigger a foreign key error
      await connection.query(
        `INSERT INTO complaint_updates (complaint_id, updated_by, status_from, status_to, remarks) 
         VALUES (?, 99999999, 'RESOLVED', 'IN_PROGRESS', 'Intentional invalid user fk')`,
        [complaintId]
      );
      await connection.commit();
      rollbackSuccess = false;
    } catch (err) {
      await connection.rollback();
      rollbackSuccess = true;
    } finally {
      connection.release();
    }

    const [postRollbackComplaint] = await query(
      `SELECT status FROM complaints WHERE id = ?`,
      [complaintId]
    );
    assert(
      rollbackSuccess && postRollbackComplaint[0].status === 'RESOLVED',
      '22. MySQL ACID transaction successfully rolled back on error without partial commit'
    );

    // -------------------------------------------------------------
    // Test 23: Deletion Authorization (Student cannot delete, Admin can delete)
    // -------------------------------------------------------------
    console.log('\n📌 Testing Deletion & Clean-Up Policy...');
    const studentDeleteRes = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(
      studentDeleteRes.status === 403,
      '23. Student blocked with 403 Forbidden from deleting complaint records'
    );

    // Admin creates and deletes a temporary test complaint
    const tempCreateRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/complaints',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        studentId: student1.student_id,
        category: 'CLEANLINESS',
        title: 'Temporary Test Complaint',
        description: 'Temporary complaint to verify admin deletion capability.',
      },
    });
    const tempId = tempCreateRes.body?.data?.id;

    const adminDeleteRes = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/complaints/${tempId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminDeleteRes.status === 200,
      '24. Admin successfully deleted temporary complaint and associated audit records'
    );
  } catch (err) {
    console.error('Fatal error during Step 11 E2E tests:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
  }

  console.log('\n============================================================');
  console.log(`📊 STEP 11 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStep11Tests();
