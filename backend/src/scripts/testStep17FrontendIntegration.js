/**
 * STEP 17 — FRONTEND FOUNDATION & BACKEND INTEGRATION TEST SUITE
 * Verifies all API integration contracts, authentication lifecycle,
 * role redirection payloads, dashboard feeds, and notification feeds.
 */

const http = require('http');
const app = require('../server');
const { query } = require('../config/database');

function makeRequest(server, { method = 'GET', path, headers = {}, body = null }) {
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
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runStep17Tests() {
  console.log('============================================================');
  console.log('🌐 STEP 17: FRONTEND FOUNDATION & BACKEND INTEGRATION TESTS');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  let passed = 0;
  let total = 0;

  function assert(condition, message, details = '') {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      if (details) console.error(`     Details: ${details}`);
    }
  }

  try {
    // 1. Backend Connectivity & Health
    console.log('--- 1. BACKEND API HEALTH & CONNECTIVITY ---');
    const healthRes = await makeRequest(server, { path: '/api/health' });
    assert(healthRes.status === 200 && healthRes.body?.success, 'GET /api/health returns 200 OK');

    const dbHealthRes = await makeRequest(server, { path: '/api/health/database' });
    assert(
      dbHealthRes.status === 200 && dbHealthRes.body?.data?.databaseStatus === 'connected',
      'GET /api/health/database confirms active MySQL database connection'
    );

    // 2. Authentication UI & Lifecycle for all 5 roles
    console.log('\n--- 2. AUTHENTICATION CONTRACTS FOR FRONTEND AUTHCONTEXT ---');
    const [users] = await query("SELECT email, role FROM users WHERE status = 'ACTIVE'");
    const adminUser = users.find((u) => u.role === 'ADMIN');
    const wardenUser = users.find((u) => u.role === 'WARDEN');
    const messUser = users.find((u) => u.role === 'MESS_MANAGER');
    const accountantUser = users.find((u) => u.role === 'ACCOUNTANT');
    const studentUser = users.find((u) => u.role === 'STUDENT');

    assert(!!adminUser && !!wardenUser && !!messUser && !!accountantUser && !!studentUser, 'All 5 role accounts exist in MySQL');

    // Test Login & Token Generation
    const roles = [
      { name: 'ADMIN', user: adminUser },
      { name: 'WARDEN', user: wardenUser },
      { name: 'MESS_MANAGER', user: messUser },
      { name: 'ACCOUNTANT', user: accountantUser },
      { name: 'STUDENT', user: studentUser },
    ];

    const tokens = {};

    for (const r of roles) {
      const loginRes = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/login',
        body: { email: r.user.email, password: 'Password@123' },
      });

      assert(
        loginRes.status === 200 && loginRes.body?.data?.token && loginRes.body?.data?.user?.role === r.name,
        `Frontend login for ${r.name} returns valid JWT and role payload`
      );

      tokens[r.name] = loginRes.body?.data?.token;

      // Verify GET /api/auth/me for AuthContext profile hydration
      const meRes = await makeRequest(server, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${tokens[r.name]}` },
      });

      assert(
        meRes.status === 200 && (meRes.body?.data?.role === r.name || meRes.body?.data?.user?.role === r.name),
        `GET /api/auth/me returns valid sanitized profile for ${r.name}`
      );
    }

    // Invalid Login Handling
    const invalidLoginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'invalid@hostel.edu', password: 'WrongPassword@123' },
    });
    assert(
      invalidLoginRes.status === 401 && invalidLoginRes.body?.success === false,
      'Invalid credentials rejected with HTTP 401 and understandable error message'
    );

    // 3. Topbar Notification Polling Feeds
    console.log('\n--- 3. TOPBAR & NOTIFICATIONS INTEGRATION ---');
    const unreadCountRes = await makeRequest(server, {
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    assert(
      unreadCountRes.status === 200 && typeof unreadCountRes.body?.data?.unreadCount === 'number',
      'GET /api/notifications/unread-count returns live integer count for notification badge'
    );

    const unreadListRes = await makeRequest(server, {
      path: '/api/notifications/unread?limit=6',
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    assert(
      unreadListRes.status === 200 && Array.isArray(unreadListRes.body?.data),
      'GET /api/notifications/unread returns list for Topbar notification dropdown'
    );

    // 4. Role Dashboards Integration
    console.log('\n--- 4. DASHBOARD FEEDS INTEGRATION ---');
    const summaryRes = await makeRequest(server, {
      path: '/api/dashboard/summary',
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    assert(summaryRes.status === 200 && summaryRes.body?.data?.summary, 'GET /api/dashboard/summary feeds core stats');

    const adminDashRes = await makeRequest(server, {
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    assert(adminDashRes.status === 200 && adminDashRes.body?.data?.students, 'Admin Dashboard feed loaded successfully');

    const wardenDashRes = await makeRequest(server, {
      path: '/api/dashboard/warden',
      headers: { Authorization: `Bearer ${tokens.WARDEN}` },
    });
    assert(wardenDashRes.status === 200 && wardenDashRes.body?.data?.occupancy, 'Warden Dashboard feed loaded successfully');

    const messDashRes = await makeRequest(server, {
      path: '/api/dashboard/mess',
      headers: { Authorization: `Bearer ${tokens.MESS_MANAGER}` },
    });
    assert(messDashRes.status === 200 && Array.isArray(messDashRes.body?.data?.todayMenu), 'Mess Dashboard feed loaded successfully');

    const accDashRes = await makeRequest(server, {
      path: '/api/dashboard/accountant',
      headers: { Authorization: `Bearer ${tokens.ACCOUNTANT}` },
    });
    assert(accDashRes.status === 200 && accDashRes.body?.data?.overview, 'Accountant Dashboard feed loaded successfully');

    const studentDashRes = await makeRequest(server, {
      path: '/api/dashboard/student',
      headers: { Authorization: `Bearer ${tokens.STUDENT}` },
    });
    assert(studentDashRes.status === 200 && studentDashRes.body?.data?.studentProfile, 'Student Dashboard feed loaded successfully');

    // 5. Reports & Export Feeds Integration
    console.log('\n--- 5. REPORTS & EXPORT FEEDS INTEGRATION ---');
    const repSummaryRes = await makeRequest(server, {
      path: '/api/reports/summary',
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    assert(repSummaryRes.status === 200 && repSummaryRes.body?.data?.students, 'Reports consolidated summary feed loaded successfully');

    const studentRepRes = await makeRequest(server, {
      path: '/api/reports/students',
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    assert(studentRepRes.status === 200 && Array.isArray(studentRepRes.body?.data?.records), 'Student Report table feed loaded successfully');

    // 6. Security & RBAC Isolation
    console.log('\n--- 6. FRONTEND RBAC ROUTE PROTECTION VERIFICATION ---');
    const studentBlockedRes = await makeRequest(server, {
      path: '/api/dashboard/admin',
      headers: { Authorization: `Bearer ${tokens.STUDENT}` },
    });
    assert(studentBlockedRes.status === 403, 'Student is blocked with HTTP 403 from Admin dashboard');

    const unauthRes = await makeRequest(server, {
      path: '/api/dashboard/summary',
    });
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401 Unauthorized');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    console.log('\n============================================================');
    console.log(`🏁 STEP 17 TEST RESULTS: ${passed} PASSED, ${total - passed} FAILED`);
    console.log('============================================================\n');
    server.close();
    process.exit(passed === total ? 0 : 1);
  }
}

runStep17Tests();
