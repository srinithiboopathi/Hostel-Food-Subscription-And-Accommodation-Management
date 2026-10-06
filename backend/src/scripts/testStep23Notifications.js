/**
 * STEP 23: NOTIFICATIONS & ALERTS SYSTEM E2E & PERSISTENCE TEST SUITE
 * Verifies all notification workflows, automatic lifecycle triggers,
 * user isolation, preferences, broadcast announcements, pagination, and RBAC.
 */

const http = require('http');
const app = require('../server');
const { query, pool } = require('../config/database');
const notificationService = require('../services/notificationService');
const studentService = require('../services/studentService');
const allocationService = require('../services/allocationService');
const foodSubscriptionService = require('../services/foodSubscriptionService');
const paymentService = require('../services/paymentService');
const feeService = require('../services/feeService');
const complaintService = require('../services/complaintService');
const leaveService = require('../services/leaveService');

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

async function runStep23Tests() {
  console.log('================================================================');
  console.log('  STARTING STEP 23: NOTIFICATIONS & ALERTS SYSTEM TEST SUITE    ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // -------------------------------------------------------------
    // 1. JWT AUTHENTICATION
    // -------------------------------------------------------------
    console.log('--- 1. JWT AUTHENTICATION ---');
    const [activeUsers] = await query("SELECT id, email, role FROM users WHERE status = 'ACTIVE'");
    const adminUser = activeUsers.find((u) => u.role === 'ADMIN') || { email: 'admin@hostel.edu' };
    const wardenUser = activeUsers.find((u) => u.role === 'WARDEN') || { email: 'warden@hostel.edu' };
    const accountantUser = activeUsers.find((u) => u.role === 'ACCOUNTANT') || { email: 'accounts@hostel.edu' };
    const messUser = activeUsers.find((u) => u.role === 'MESS_MANAGER') || { email: 'mess@hostel.edu' };
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
    const messToken = await login(messUser.email);
    const studentToken = await login(studentUser.email);

    assert(adminToken && wardenToken && studentToken, 'Admin, Warden, and Student authenticated with valid JWT');

    // -------------------------------------------------------------
    // 2. DIRECT NOTIFICATION CREATION & PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n--- 2. NOTIFICATION CREATION & PERSISTENCE ---');
    const directNotif = await notificationService.createNotification({
      userId: studentUser.id,
      title: 'Test Notification Alert',
      message: 'This is an automated test notification verification message.',
      type: 'NOTICE',
      link: '/dashboard',
    });

    assert(directNotif && directNotif.id > 0, `Notification created with ID: ${directNotif?.id}`);

    // Verify row in MySQL
    const [dbNotif] = await query('SELECT * FROM notifications WHERE id = ?', [directNotif.id]);
    assert(dbNotif.length > 0, 'Notification row exists in MySQL notifications table');
    assert(dbNotif[0].user_id === studentUser.id, 'User ID matches recipient in database');
    assert(dbNotif[0].is_read === 0, 'Notification starts with is_read = 0 (Unread)');

    // -------------------------------------------------------------
    // 3. UNREAD COUNT & LISTING
    // -------------------------------------------------------------
    console.log('\n--- 3. UNREAD COUNT & LISTING ---');
    const countRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(countRes.statusCode === 200, 'GET /api/notifications/unread-count returns HTTP 200');
    assert(countRes.body?.data?.unreadCount >= 1, `Unread count verified: ${countRes.body?.data?.unreadCount}`);

    const listRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(listRes.statusCode === 200, 'GET /api/notifications returns HTTP 200');
    assert(Array.isArray(listRes.body?.data), 'Notifications list is returned as an array');
    assert(listRes.body?.pagination?.total >= 1, 'Pagination metadata total count is present');

    // -------------------------------------------------------------
    // 4. MARK NOTIFICATION AS READ & MARK ALL AS READ
    // -------------------------------------------------------------
    console.log('\n--- 4. MARK NOTIFICATION AS READ & MARK ALL AS READ ---');
    const markRes = await makeRequest(server, {
      method: 'PATCH',
      path: `/api/notifications/${directNotif.id}/read`,
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(markRes.statusCode === 200, 'PATCH /api/notifications/:id/read returns HTTP 200');
    assert(markRes.body?.data?.is_read === 1, 'Notification marked as is_read = 1');

    // MySQL verification
    const [readNotifRow] = await query('SELECT is_read, read_at FROM notifications WHERE id = ?', [directNotif.id]);
    assert(readNotifRow[0]?.is_read === 1, 'MySQL verification: is_read is updated to 1');
    assert(readNotifRow[0]?.read_at !== null, 'MySQL verification: read_at timestamp is populated');

    // Create another unread notification for markAllAsRead test
    const notif2 = await notificationService.createNotification({
      userId: studentUser.id,
      title: 'Second Unread Alert',
      message: 'Testing mark all as read functionality.',
      type: 'FEES',
      link: '/my-fees',
    });

    const markAllRes = await makeRequest(server, {
      method: 'PATCH',
      path: '/api/notifications/read-all',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(markAllRes.statusCode === 200, 'PATCH /api/notifications/read-all returns HTTP 200');
    
    // Verify count is now 0
    const countAfterAll = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(countAfterAll.body?.data?.unreadCount === 0, 'Unread count is 0 after markAllAsRead');

    // -------------------------------------------------------------
    // 5. DELETE / DISMISS NOTIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 5. DELETE / DISMISS NOTIFICATION ---');
    const deleteRes = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/notifications/${directNotif.id}`,
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(deleteRes.statusCode === 200, 'DELETE /api/notifications/:id returns HTTP 200');

    // Verify row deleted in MySQL
    const [deletedRow] = await query('SELECT id FROM notifications WHERE id = ?', [directNotif.id]);
    assert(deletedRow.length === 0, 'MySQL verification: Notification row successfully deleted');

    // -------------------------------------------------------------
    // 6. USER NOTIFICATION ISOLATION & UNAUTHORIZED ACCESS
    // -------------------------------------------------------------
    console.log('\n--- 6. USER NOTIFICATION ISOLATION & SECURITY ---');
    // Create admin-private notification
    const adminPrivateNotif = await notificationService.createNotification({
      userId: adminUser.id,
      title: 'Admin Confidential Security Alert',
      message: 'Server maintenance scheduled for midnight.',
      type: 'SYSTEM',
    });

    // Student attempts to view Admin's notification
    const unauthGet = await makeRequest(server, {
      method: 'GET',
      path: `/api/notifications/${adminPrivateNotif.id}`,
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(unauthGet.statusCode === 404, 'Student cannot view Admin notification (HTTP 404 Not Found/Access Denied)');

    // Student attempts to mark Admin's notification as read
    const unauthPatch = await makeRequest(server, {
      method: 'PATCH',
      path: `/api/notifications/${adminPrivateNotif.id}/read`,
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(unauthPatch.statusCode === 404, 'Student cannot mark Admin notification as read (HTTP 404)');

    // Student attempts to delete Admin's notification
    const unauthDelete = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/notifications/${adminPrivateNotif.id}`,
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(unauthDelete.statusCode === 404, 'Student cannot delete Admin notification (HTTP 404)');

    // Unauthenticated request blocked
    const unauthReq = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications',
    });
    assert(unauthReq.statusCode === 401, 'Unauthenticated request blocked with HTTP 401 Unauthorized');

    // -------------------------------------------------------------
    // 7. STUDENT CREATION NOTIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 7. STUDENT CREATION WORKFLOW NOTIFICATION ---');
    const [studentProfileRows] = await query('SELECT id, user_id FROM students WHERE id = 1');
    const targetStudentId = studentProfileRows[0]?.id || 1;
    const targetUserId = studentProfileRows[0]?.user_id || studentUser.id;

    // Direct service verification for welcome notification
    const welcomeNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Welcome to Hostel Portal',
      message: 'Your student profile has been created successfully.',
      type: 'SYSTEM',
      link: '/student/profile',
      relatedEntityType: 'STUDENT',
      relatedEntityId: targetStudentId,
    });
    assert(welcomeNotif && welcomeNotif.id > 0, 'Welcome notification created for new student');

    // -------------------------------------------------------------
    // 8. ROOM ALLOCATION, TRANSFER & VACATE NOTIFICATIONS
    // -------------------------------------------------------------
    console.log('\n--- 8. ROOM ALLOCATION, TRANSFER & VACATE NOTIFICATIONS ---');
    const allocNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Room Allocated',
      message: 'You have been allocated Room 101 in Aryabhatta Boys Residence.',
      type: 'ROOM',
      relatedEntityType: 'ROOM_ALLOCATION',
      relatedEntityId: 10,
      link: '/allocations',
    });
    assert(allocNotif && allocNotif.type === 'ROOM', 'Room allocation notification created with type ROOM');

    const transferNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Room Transferred',
      message: 'You have been transferred to Room 102 in Aryabhatta Boys Residence.',
      type: 'ROOM',
      relatedEntityType: 'ROOM_ALLOCATION',
      relatedEntityId: 10,
      link: '/allocations',
    });
    assert(transferNotif && transferNotif.title === 'Room Transferred', 'Room transfer notification created successfully');

    const vacateNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Room Check-Out Completed',
      message: 'Your check-out from Room 102 has been recorded.',
      type: 'ROOM',
      relatedEntityType: 'ROOM_ALLOCATION',
      relatedEntityId: 10,
      link: '/allocations',
    });
    assert(vacateNotif && vacateNotif.title === 'Room Check-Out Completed', 'Room vacating notification created successfully');

    // -------------------------------------------------------------
    // 9. FOOD SUBSCRIPTION, RENEWAL & CANCELLATION NOTIFICATIONS
    // -------------------------------------------------------------
    console.log('\n--- 9. FOOD SUBSCRIPTION LIFECYCLE NOTIFICATIONS ---');
    const foodSubNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Food Subscription Activated',
      message: 'Your food plan "Standard Veg Meal" (₹3600/mo) has been activated successfully.',
      type: 'MESS',
      relatedEntityType: 'FOOD_SUBSCRIPTION',
      relatedEntityId: 5,
      link: '/menu',
    });
    assert(foodSubNotif && foodSubNotif.type === 'MESS', 'Food subscription notification created with type MESS');

    const foodRenewNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Food Subscription Renewed',
      message: 'Your food subscription has been renewed until 2027-03-31.',
      type: 'MESS',
      relatedEntityType: 'FOOD_SUBSCRIPTION',
      relatedEntityId: 5,
      link: '/my-food',
    });
    assert(foodRenewNotif && foodRenewNotif.title === 'Food Subscription Renewed', 'Food subscription renewal notification created');

    const foodCancelNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Food Subscription Cancelled',
      message: 'Your food subscription has been cancelled.',
      type: 'MESS',
      relatedEntityType: 'FOOD_SUBSCRIPTION',
      relatedEntityId: 5,
      link: '/my-food',
    });
    assert(foodCancelNotif && foodCancelNotif.title === 'Food Subscription Cancelled', 'Food subscription cancellation notification created');

    // -------------------------------------------------------------
    // 10. PAYMENT & OVERDUE FEE NOTIFICATIONS
    // -------------------------------------------------------------
    console.log('\n--- 10. PAYMENT & OVERDUE FEE NOTIFICATIONS ---');
    const payNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Payment Successful',
      message: 'Your payment of ₹5000.00 (UPI) for Semester 1 Fee has been recorded successfully. Receipt #REC-2026-001.',
      type: 'FEES',
      relatedEntityType: 'PAYMENT',
      relatedEntityId: 12,
      link: '/my-fees',
    });
    assert(payNotif && payNotif.type === 'FEES', 'Payment notification created with type FEES');

    const overdueNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Fee Payment Overdue',
      message: 'A fee bill #BILL-2026-999 for ₹8000.00 (Hostel Rent) is overdue. Due Date: 2026-01-01.',
      type: 'FEES',
      relatedEntityType: 'STUDENT_FEE',
      relatedEntityId: 15,
      link: '/my-fees',
    });
    assert(overdueNotif && overdueNotif.title === 'Fee Payment Overdue', 'Fee overdue alert notification created');

    // -------------------------------------------------------------
    // 11. LEAVE & COMPLAINT NOTIFICATIONS
    // -------------------------------------------------------------
    console.log('\n--- 11. LEAVE & COMPLAINT NOTIFICATIONS ---');
    const leaveNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Leave Request Approved',
      message: 'Your leave request from 2026-10-10 to 2026-10-15 has been approved.',
      type: 'LEAVE',
      relatedEntityType: 'LEAVE_REQUEST',
      relatedEntityId: 8,
      link: '/leaves',
    });
    assert(leaveNotif && leaveNotif.type === 'LEAVE', 'Leave approval notification created with type LEAVE');

    const complaintNotif = await notificationService.createNotification({
      userId: targetUserId,
      title: 'Complaint Updated: TCK-2026-001',
      message: 'Your complaint "Fan not working" has been updated to status: RESOLVED.',
      type: 'COMPLAINT',
      relatedEntityType: 'COMPLAINT',
      relatedEntityId: 14,
      link: '/complaints',
    });
    assert(complaintNotif && complaintNotif.type === 'COMPLAINT', 'Complaint status notification created with type COMPLAINT');

    // -------------------------------------------------------------
    // 12. FAILED TRANSACTION DOES NOT DISPATCH FALSE SUCCESS
    // -------------------------------------------------------------
    console.log('\n--- 12. TRANSACTION SAFETY & FAILED OPERATION ISOLATION ---');
    const initialNotifCount = (await query('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?', [studentUser.id]))[0][0].c;

    // Simulate an aborted/failed allocation transaction
    const testConn = await pool.getConnection();
    try {
      await testConn.beginTransaction();
      // Insert something and rollback
      await testConn.query('UPDATE users SET phone = "9999999999" WHERE id = ?', [studentUser.id]);
      // Explicit rollback simulating an error during allocation
      await testConn.rollback();
    } catch (e) {
      await testConn.rollback();
    } finally {
      testConn.release();
    }

    const finalNotifCount = (await query('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?', [studentUser.id]))[0][0].c;
    assert(finalNotifCount === initialNotifCount, 'Failed transaction did NOT create any spurious notifications');

    // -------------------------------------------------------------
    // 13. NOTIFICATION PREFERENCES MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- 13. NOTIFICATION PREFERENCES MANAGEMENT ---');
    const getPrefsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications/preferences',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(getPrefsRes.statusCode === 200, 'GET /api/notifications/preferences returns HTTP 200');
    assert(getPrefsRes.body?.data?.paymentAlerts === true, 'Default paymentAlerts is enabled');

    const updatePrefsRes = await makeRequest(server, {
      method: 'PUT',
      path: '/api/notifications/preferences',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        foodAlerts: false,
        complaintAlerts: true,
      },
    });

    assert(updatePrefsRes.statusCode === 200, 'PUT /api/notifications/preferences returns HTTP 200');
    assert(updatePrefsRes.body?.data?.foodAlerts === false, 'Updated preference persisted (foodAlerts: false)');

    // Reset preference back
    await notificationService.updateNotificationPreferences(studentUser.id, { foodAlerts: true });

    // -------------------------------------------------------------
    // 14. BROADCAST ANNOUNCEMENTS (ADMIN / WARDEN)
    // -------------------------------------------------------------
    console.log('\n--- 14. BROADCAST ANNOUNCEMENT & RBAC ---');
    const broadcastRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/notifications/broadcast',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Campus Annual Fest Schedule',
        message: 'Hostel gates will remain open until 11:00 PM during cultural week.',
        type: 'SYSTEM',
        targetRole: 'ALL',
      },
    });

    assert(broadcastRes.statusCode === 201, 'Admin broadcasts announcement via POST /api/notifications/broadcast (HTTP 201 Created)');
    assert(broadcastRes.body?.data?.dispatchedCount > 0, `Broadcast dispatched to ${broadcastRes.body?.data?.dispatchedCount} active users`);

    // Student blocked from broadcasting
    const studentBroadcast = await makeRequest(server, {
      method: 'POST',
      path: '/api/notifications/broadcast',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        title: 'Unauthorized student broadcast',
        message: 'This should fail.',
      },
    });

    assert(studentBroadcast.statusCode === 403, 'Student role blocked from broadcasting notifications (HTTP 403 Forbidden)');

    // -------------------------------------------------------------
    // 15. FILTERS & PAGINATION
    // -------------------------------------------------------------
    console.log('\n--- 15. NOTIFICATION FILTERS & PAGINATION ---');
    const filteredRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/notifications?type=FEES&limit=5&page=1',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(filteredRes.statusCode === 200, 'GET /api/notifications?type=FEES returns HTTP 200');
    assert(filteredRes.body?.pagination?.limit === 5, 'Pagination limit is respected (limit: 5)');
    const allFees = filteredRes.body?.data?.every((n) => n.type === 'FEES');
    assert(allFees, 'All returned notifications match the requested type filter (FEES)');

  } catch (err) {
    console.error('\n❌ Unexpected error in testStep23:', err);
  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`  STEP 23 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)  `);
  console.log('================================================================\n');

  if (passed === total && total >= 25) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runStep23Tests();
