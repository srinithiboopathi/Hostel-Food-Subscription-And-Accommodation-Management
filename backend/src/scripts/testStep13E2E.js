/**
 * STEP 13 — REAL-TIME NOTIFICATION MANAGEMENT
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

async function runStep13Tests() {
  console.log('\n============================================================');
  console.log('🧪 STEP 13: REAL-TIME NOTIFICATION MANAGEMENT E2E TEST SUITE');
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
    // Start temporary HTTP server on random port
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
      `SELECT s.id as student_id, s.roll_number, u.id as user_id, u.email, u.role, u.full_name 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.status = 'ACTIVE' LIMIT 2`
    );

    const [wardens] = await query(
      `SELECT u.id as user_id, u.email, u.role, u.full_name 
       FROM users u 
       WHERE u.role = 'WARDEN' AND u.status = 'ACTIVE' LIMIT 1`
    );

    const [admins] = await query(
      `SELECT u.id as user_id, u.email, u.role, u.full_name 
       FROM users u 
       WHERE u.role = 'ADMIN' AND u.status = 'ACTIVE' LIMIT 1`
    );

    const [accountants] = await query(
      `SELECT u.id as user_id, u.email, u.role, u.full_name 
       FROM users u 
       WHERE u.role = 'ACCOUNTANT' AND u.status = 'ACTIVE' LIMIT 1`
    );

    assert(students.length >= 1, 'Test student user exists in database', `Found ${students.length}`);
    assert(wardens.length >= 1, 'Test warden user exists in database', `Found ${wardens.length}`);
    assert(admins.length >= 1, 'Test admin user exists in database', `Found ${admins.length}`);

    const student1 = students[0];
    const student2 = students[1] || students[0];
    const warden = wardens[0];
    const admin = admins[0];
    const accountant = accountants.length > 0 ? accountants[0] : admin;

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
    const student2Token = students.length > 1 ? await login(student2.email) : null;
    const wardenToken = await login(warden.email);
    const adminToken = await login(admin.email);
    const accountantToken = await login(accountant.email);

    assert(!!student1Token, 'Student 1 logged in successfully with JWT');
    assert(!!wardenToken, 'Warden logged in successfully with JWT');
    assert(!!adminToken, 'Admin logged in successfully with JWT');

    // =============================================================
    // PART 1: CORE NOTIFICATION APIS & DIRECT USER NOTIFICATIONS
    // =============================================================
    console.log('\n--- PART 1: NOTIFICATION API VERIFICATION ---');

    // 1. GET /api/notifications (Initial List for Student 1)
    const listRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications',
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      listRes.status === 200 && listRes.body?.success,
      'GET /api/notifications returns 200 and list of user notifications',
      JSON.stringify(listRes.body)
    );
    assert(
      Array.isArray(listRes.body?.data),
      'Notifications response contains data array'
    );
    assert(
      listRes.body?.pagination?.page === 1,
      'Notifications response includes pagination metadata'
    );

    // 2. GET /api/notifications/unread-count
    const unreadCountRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      unreadCountRes.status === 200 && typeof unreadCountRes.body?.data?.unreadCount === 'number',
      'GET /api/notifications/unread-count returns integer count',
      `Count: ${unreadCountRes.body?.data?.unreadCount}`
    );

    // 3. GET /api/notifications/unread
    const unreadListRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread',
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      unreadListRes.status === 200 && Array.isArray(unreadListRes.body?.data),
      'GET /api/notifications/unread returns list of unread notifications',
      `Items: ${unreadListRes.body?.data?.length}`
    );

    // =============================================================
    // PART 2: AUTOMATIC LEAVE NOTIFICATIONS (Student -> Warden -> Student)
    // =============================================================
    console.log('\n--- PART 2: AUTOMATIC LEAVE NOTIFICATIONS ---');

    // Get warden unread count before
    const wardenCountBeforeRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    const wardenUnreadBefore = wardenCountBeforeRes.body?.data?.unreadCount || 0;

    // Student 1 submits leave request
    const createLeaveRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/leaves',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        leaveType: 'HOME_VISIT',
        startDate: `2026-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}-01`,
        endDate: `2026-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}-05`,
        destinationAddress: '789 Notification Test Rd, Pune',
        emergencyContact: '+91 9988776655',
        reason: `Family Event for Step 13 Test ${Date.now()}`,
      },
    });

    assert(
      createLeaveRes.status === 201 && createLeaveRes.body?.success,
      'Student submits leave request (HTTP 201 Created)',
      JSON.stringify(createLeaveRes.body)
    );
    const leaveId = createLeaveRes.body?.data?.id;

    // Verify Warden received notification in MySQL database
    const [wardenDbNotif] = await query(
      `SELECT * FROM notifications WHERE user_id = ? AND type = 'LEAVE' ORDER BY id DESC LIMIT 1`,
      [warden.user_id]
    );

    assert(
      wardenDbNotif.length > 0 && wardenDbNotif[0].title.includes('Leave Request'),
      'Direct MySQL verification: Warden received "New Leave Request" notification',
      JSON.stringify(wardenDbNotif[0])
    );
    assert(
      wardenDbNotif[0].type === 'LEAVE',
      'Direct MySQL verification: Notification type is valid ENUM "LEAVE"'
    );

    // Verify Warden unread count increased via API
    const wardenCountAfterRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${wardenToken}` },
    });
    assert(
      wardenCountAfterRes.body?.data?.unreadCount >= wardenUnreadBefore + 1,
      'Warden unread count incremented in real-time via API'
    );

    // Warden approves the leave request
    const approveLeaveRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/leaves/${leaveId}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: {
        status: 'APPROVED',
        remarks: 'Approved with safe journey wishes',
      },
    });

    assert(
      approveLeaveRes.status === 200 && approveLeaveRes.body?.success,
      'Warden approves leave request (HTTP 200 OK)',
      JSON.stringify(approveLeaveRes.body)
    );

    // Verify Student received approval notification in DB
    const [studentLeaveNotif] = await query(
      `SELECT * FROM notifications WHERE user_id = ? AND type = 'LEAVE' ORDER BY id DESC LIMIT 1`,
      [student1.user_id]
    );

    assert(
      studentLeaveNotif.length > 0 && studentLeaveNotif[0].title.includes('Approved'),
      'Direct MySQL verification: Student received "Leave Request Approved" notification',
      JSON.stringify(studentLeaveNotif[0])
    );

    // =============================================================
    // PART 3: AUTOMATIC COMPLAINT NOTIFICATIONS (Student -> Staff -> Student)
    // =============================================================
    console.log('\n--- PART 3: AUTOMATIC COMPLAINT NOTIFICATIONS ---');

    // Student creates complaint
    const createComplaintRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/complaints',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        category: 'ELECTRICAL',
        title: 'Ceiling fan regulator faulty',
        description: 'Speed regulator is stuck at maximum speed.',
        priority: 'MEDIUM',
      },
    });

    assert(
      createComplaintRes.status === 201 && createComplaintRes.body?.success,
      'Student submits maintenance complaint (HTTP 201 Created)',
      JSON.stringify(createComplaintRes.body)
    );
    const complaintId = createComplaintRes.body?.data?.id;

    // Verify Warden received complaint notification
    const [wardenComplaintNotif] = await query(
      `SELECT * FROM notifications WHERE user_id = ? AND type = 'COMPLAINT' ORDER BY id DESC LIMIT 1`,
      [warden.user_id]
    );

    assert(
      wardenComplaintNotif.length > 0 && wardenComplaintNotif[0].title.includes('New Complaint'),
      'Direct MySQL verification: Warden received "New Complaint" notification',
      JSON.stringify(wardenComplaintNotif[0])
    );

    // Staff / Warden updates complaint status to RESOLVED
    const updateComplaintRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/complaints/${complaintId}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
      body: {
        status: 'RESOLVED',
        resolution_notes: 'Electrician replaced the fan regulator.',
      },
    });

    assert(
      updateComplaintRes.status === 200 && updateComplaintRes.body?.success,
      'Warden updates complaint status to RESOLVED (HTTP 200 OK)',
      JSON.stringify(updateComplaintRes.body)
    );

    // Verify Student received complaint update notification
    const [studentComplaintNotif] = await query(
      `SELECT * FROM notifications WHERE user_id = ? AND type = 'COMPLAINT' ORDER BY id DESC LIMIT 1`,
      [student1.user_id]
    );

    assert(
      studentComplaintNotif.length > 0 && studentComplaintNotif[0].title.includes('Complaint Updated'),
      'Direct MySQL verification: Student received "Complaint Updated" notification',
      JSON.stringify(studentComplaintNotif[0])
    );

    // =============================================================
    // PART 4: AUTOMATIC PAYMENT NOTIFICATIONS
    // =============================================================
    console.log('\n--- PART 4: AUTOMATIC PAYMENT NOTIFICATIONS ---');

    // Create a fresh student fee bill with outstanding balance for payment testing
    let [feeTypes] = await query(`SELECT id FROM fee_types LIMIT 1`);
    let feeTypeId = feeTypes[0]?.id || 1;
    const testBillNo = `BILL-N-${Date.now().toString().slice(-6)}`;

    const [insertFee] = await query(
      `INSERT INTO student_fees (student_id, fee_type_id, academic_year, term_name, amount_due, amount_paid, discount, due_date, status, bill_number, created_at)
       VALUES (?, ?, '2026-2027', 'Fall 2026', 8000.00, 0.00, 0.00, '2026-12-31', 'PENDING', ?, NOW())`,
      [student1.student_id, feeTypeId, testBillNo]
    );
    const feeId = insertFee.insertId;

    // Accountant records a payment for this fee
    const paymentAmount = 1500.00;
    const paymentRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: { Authorization: `Bearer ${accountantToken}` },
      body: {
        studentFeeId: feeId,
        amount: paymentAmount,
        paymentMethod: 'UPI',
        transactionId: `TEST_TXN_${Date.now()}`,
        notes: 'Step 13 Payment Notification Test',
      },
    });

    assert(
      paymentRes.status === 201 && paymentRes.body?.success,
      'Accountant successfully records fee payment (HTTP 201 Created)',
      JSON.stringify(paymentRes.body)
    );

    // Verify Student received payment notification in MySQL database
    const [studentPaymentNotif] = await query(
      `SELECT * FROM notifications WHERE user_id = ? AND type = 'FEES' ORDER BY id DESC LIMIT 1`,
      [student1.user_id]
    );

    assert(
      studentPaymentNotif.length > 0 && studentPaymentNotif[0].title.includes('Payment Successful'),
      'Direct MySQL verification: Student received "Payment Successful" notification with valid type "FEES"',
      JSON.stringify(studentPaymentNotif[0])
    );
    assert(
      studentPaymentNotif[0].message.includes('1500.00'),
      'Payment notification message contains accurate transaction amount from MySQL'
    );

    // =============================================================
    // PART 5: AUTOMATIC ROOM ALLOCATION NOTIFICATIONS
    // =============================================================
    console.log('\n--- PART 5: AUTOMATIC ROOM ALLOCATION NOTIFICATIONS ---');

    // Find an available room and hostel
    const [availableRooms] = await query(
      `SELECT r.id as room_id, r.room_number, r.capacity, h.id as hostel_id, h.name as hostel_name
       FROM rooms r
       JOIN hostels h ON r.hostel_id = h.id
       WHERE r.status = 'AVAILABLE'
       LIMIT 1`
    );

    if (availableRooms.length > 0) {
      const room = availableRooms[0];

      // Ensure student status is ACTIVE and de-allocate any previous active allocations
      await query(
        `UPDATE students SET status = 'ACTIVE', current_hostel_id = NULL, current_room_id = NULL WHERE id = ?`,
        [student1.student_id]
      );
      await query(
        `UPDATE room_allocations SET status = 'VACATED', vacated_at = NOW() WHERE student_id = ? AND status = 'ACTIVE'`,
        [student1.student_id]
      );

      // Admin / Warden allocates room to Student 1
      const allocRes = await makeRequest(server, {
        method: 'POST',
        path: '/api/allocations',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          studentId: student1.student_id,
          roomId: room.room_id,
          academicYear: '2026-2027',
          allocatedFrom: '2026-08-01',
          remarks: 'Step 13 E2E Room Allocation Test',
        },
      });

      assert(
        allocRes.status === 201 && allocRes.body?.success,
        'Admin/Warden allocates room to Student (HTTP 201 Created)',
        JSON.stringify(allocRes.body)
      );

      // Verify Student received Room Allocated notification
      const [studentRoomNotif] = await query(
        `SELECT * FROM notifications WHERE user_id = ? AND type = 'ROOM' ORDER BY id DESC LIMIT 1`,
        [student1.user_id]
      );

      assert(
        studentRoomNotif.length > 0 && studentRoomNotif[0].title.includes('Room Allocated'),
        'Direct MySQL verification: Student received "Room Allocated" notification with valid type "ROOM"',
        JSON.stringify(studentRoomNotif[0])
      );
      assert(
        studentRoomNotif[0].message.includes(room.room_number) && studentRoomNotif[0].message.includes(room.hostel_name),
        'Room allocation notification includes exact Room Number and Hostel Name'
      );
    } else {
      console.log('  ⚠️ Note: No available rooms found for allocation test, skipping room trigger step');
    }

    // =============================================================
    // PART 6: READ STATE, UNREAD COUNT DECREMENT & MARK ALL AS READ
    // =============================================================
    console.log('\n--- PART 6: READ STATE & UNREAD COUNT DECREMENT ---');

    // Get current unread notifications for Student 1
    const currentUnreadRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const currentCount = currentUnreadRes.body?.data?.unreadCount || 0;
    assert(currentCount > 0, `Student 1 has ${currentCount} unread notifications`);

    // Fetch unread notification list
    const unreadsList = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const targetNotification = unreadsList.body?.data?.[0];
    assert(!!targetNotification?.id, 'Target unread notification found for markAsRead test');

    // Mark single notification as read: PUT /api/notifications/:id/read
    const markSingleRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/notifications/${targetNotification.id}/read`,
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      markSingleRes.status === 200 && markSingleRes.body?.success,
      'PUT /api/notifications/:id/read marks notification as read (HTTP 200 OK)',
      JSON.stringify(markSingleRes.body)
    );

    // Verify unread count decreased by 1
    const countAfterSingleReadRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(
      countAfterSingleReadRes.body?.data?.unreadCount === currentCount - 1,
      'Unread count decreased by 1 after marking single notification as read',
      `Before: ${currentCount}, After: ${countAfterSingleReadRes.body?.data?.unreadCount}`
    );

    // Verify in MySQL that is_read is 1
    const [dbSingleRead] = await query('SELECT is_read FROM notifications WHERE id = ?', [targetNotification.id]);
    assert(
      dbSingleRead.length > 0 && dbSingleRead[0].is_read === 1,
      'Direct MySQL verification: is_read is updated to 1 in notifications table'
    );

    // Mark All As Read: PUT /api/notifications/read-all
    const markAllRes = await makeRequest(server, {
      method: 'PUT',
      path: '/api/notifications/read-all',
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      markAllRes.status === 200 && markAllRes.body?.success,
      'PUT /api/notifications/read-all marks all unread notifications as read (HTTP 200 OK)',
      JSON.stringify(markAllRes.body)
    );

    // Verify unread count becomes zero
    const countAfterAllReadRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(
      countAfterAllReadRes.body?.data?.unreadCount === 0,
      'Unread count is exactly 0 after markAllAsRead'
    );

    // =============================================================
    // PART 7: DELETION & RECIPIENT SECURITY / RBAC ISOLATION
    // =============================================================
    console.log('\n--- PART 7: DELETION & SECURITY / CROSS-USER ISOLATION ---');

    // 1. Delete notification: DELETE /api/notifications/:id
    const deleteRes = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/notifications/${targetNotification.id}`,
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(
      deleteRes.status === 200 && deleteRes.body?.success,
      'DELETE /api/notifications/:id deletes notification (HTTP 200 OK)',
      JSON.stringify(deleteRes.body)
    );

    // Verify deletion directly in MySQL
    const [dbDeleted] = await query('SELECT * FROM notifications WHERE id = ?', [targetNotification.id]);
    assert(
      dbDeleted.length === 0,
      'Direct MySQL verification: Notification record completely removed from database table'
    );

    // 2. Cross-User Security Test: Student 2 tries to access Student 1's notification
    const [createResult] = await query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES (?, 'Private Security Test', 'Confidential student notification', 'SYSTEM', 0, NOW())`,
      [student1.user_id]
    );
    const privateNotifId = createResult.insertId;

    if (student2Token && student1.user_id !== student2.user_id) {
      // Student 2 tries to mark Student 1's notification as read
      const unauthorizedMarkRes = await makeRequest(server, {
        method: 'PUT',
        path: `/api/notifications/${privateNotifId}/read`,
        headers: { Authorization: `Bearer ${student2Token}` },
      });

      assert(
        unauthorizedMarkRes.status === 404 || unauthorizedMarkRes.status === 403,
        'Security enforcement: User cannot mark another user\'s notification as read (HTTP 404/403 blocked)',
        `Status: ${unauthorizedMarkRes.status}`
      );

      // Student 2 tries to delete Student 1's notification
      const unauthorizedDeleteRes = await makeRequest(server, {
        method: 'DELETE',
        path: `/api/notifications/${privateNotifId}`,
        headers: { Authorization: `Bearer ${student2Token}` },
      });

      assert(
        unauthorizedDeleteRes.status === 404 || unauthorizedDeleteRes.status === 403,
        'Security enforcement: User cannot delete another user\'s notification (HTTP 404/403 blocked)',
        `Status: ${unauthorizedDeleteRes.status}`
      );
    }

    // 3. Unauthenticated access blocked
    const unauthListRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications',
    });

    assert(
      unauthListRes.status === 401,
      'Unauthenticated request without JWT is rejected (HTTP 401 Unauthorized)',
      `Status: ${unauthListRes.status}`
    );

    // =============================================================
    // PART 8: DIRECT MYSQL SCHEMA & DATA INTEGRITY VERIFICATION
    // =============================================================
    console.log('\n--- PART 8: DIRECT MYSQL INTEGRITY VERIFICATION ---');

    const [allNotifs] = await query(
      `SELECT id, user_id, title, type, is_read, created_at FROM notifications ORDER BY id DESC LIMIT 5`
    );

    assert(allNotifs.length > 0, 'Database contains persisted notification rows', `Found: ${allNotifs.length}`);
    console.log('\n  📋 Sample Notifications in MySQL:');
    allNotifs.forEach((n) => {
      console.log(`    - [ID: ${n.id}] [User: ${n.user_id}] [Type: ${n.type}] [Read: ${n.is_read}] ${n.title}`);
    });

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

runStep13Tests();
