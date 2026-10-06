const http = require('http');
const app = require('../server');
const { query } = require('../config/database');

function makeRequest(server, options, data = null) {
  return new Promise((resolve) => {
    const port = server.address().port;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        error: err.message,
      });
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  const [users] = await query("SELECT email, role FROM users WHERE status = 'ACTIVE'");
  const adminUser = users.find(u => u.role === 'ADMIN') || { email: 'admin@hostel.local' };
  const studentUser = users.find(u => u.role === 'STUDENT') || { email: 'student@hostel.local' };

  console.log('========================================================================');
  console.log(' 🧪 BACKEND AUTHENTICATION & RBAC TEST SUITE (10 TEST SCENARIOS)        ');
  console.log('========================================================================\n');

  let adminToken = '';
  let studentToken = '';
  let passedCount = 0;
  let totalTests = 10;

  function assert(testNumber, description, condition, details = '') {
    if (condition) {
      console.log(` ✅ Test ${testNumber.toString().padStart(2, ' ')}: [PASS] ${description}`);
      passedCount++;
    } else {
      console.log(` ❌ Test ${testNumber.toString().padStart(2, ' ')}: [FAIL] ${description} -> ${details}`);
    }
  }

  // 1. Valid Admin Login
  const t1 = await makeRequest(server, {
    path: '/api/auth/login',
    method: 'POST',
  }, { email: adminUser.email, password: 'Password@123' });
  adminToken = t1.data?.data?.token || '';
  assert(1, 'Valid Admin Login (200 OK + JWT returned)', t1.statusCode === 200 && !!adminToken && t1.data?.data?.user?.role === 'ADMIN', JSON.stringify(t1.data));

  // 2. Valid Student Login
  const t2 = await makeRequest(server, {
    path: '/api/auth/login',
    method: 'POST',
  }, { email: studentUser.email, password: 'Password@123' });
  studentToken = t2.data?.data?.token || '';
  assert(2, 'Valid Student Login (200 OK + JWT returned)', t2.statusCode === 200 && !!studentToken && t2.data?.data?.user?.role === 'STUDENT', JSON.stringify(t2.data));

  // 3. Invalid Password
  const t3 = await makeRequest(server, {
    path: '/api/auth/login',
    method: 'POST',
  }, { email: 'admin@hostel.local', password: 'WrongPassword@999' });
  assert(3, 'Invalid Password (401 Unauthorized + Generic message)', t3.statusCode === 401 && t3.data?.message === 'Invalid email or password', JSON.stringify(t3.data));

  // 4. Invalid Email
  const t4 = await makeRequest(server, {
    path: '/api/auth/login',
    method: 'POST',
  }, { email: 'nonexistent@hostel.local', password: 'Admin@123' });
  assert(4, 'Invalid Email (401 Unauthorized + Generic message)', t4.statusCode === 401 && t4.data?.message === 'Invalid email or password', JSON.stringify(t4.data));

  // 5. Missing Credentials / Validation Error
  const t5 = await makeRequest(server, {
    path: '/api/auth/login',
    method: 'POST',
  }, {});
  assert(5, 'Missing Credentials (422 Unprocessable / 400 Bad Request)', t5.statusCode === 422 || t5.statusCode === 400, JSON.stringify(t5.data));

  // 6. /api/auth/me with Valid Token
  const t6 = await makeRequest(server, {
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert(6, '/api/auth/me with Valid Token (200 OK + Safe Profile)', t6.statusCode === 200 && t6.data?.data?.email === adminUser.email && !t6.data?.data?.password_hash, JSON.stringify(t6.data));

  // 7. /api/auth/me without Token
  const t7 = await makeRequest(server, {
    path: '/api/auth/me',
    method: 'GET',
  });
  assert(7, '/api/auth/me without Token (401 Unauthorized)', t7.statusCode === 401, JSON.stringify(t7.data));

  // 8. /api/auth/me with Invalid Token
  const t8 = await makeRequest(server, {
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': 'Bearer invalid_malformed_token_xyz_123' },
  });
  assert(8, '/api/auth/me with Invalid Token (401 Unauthorized)', t8.statusCode === 401, JSON.stringify(t8.data));

  // 9. Role Authorization with Correct Role (Admin accessing /admin-only)
  const t9 = await makeRequest(server, {
    path: '/api/auth/admin-only',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert(9, 'Role Authorization Correct Role (200 OK)', t9.statusCode === 200, JSON.stringify(t9.data));

  // 10. Role Authorization with Incorrect Role (Student accessing /admin-only)
  const t10 = await makeRequest(server, {
    path: '/api/auth/admin-only',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
  });
  assert(10, 'Role Authorization Incorrect Role (403 Forbidden)', t10.statusCode === 403, JSON.stringify(t10.data));

  console.log('\n========================================================================');
  console.log(` 🏁 RESULT: ${passedCount}/${totalTests} TESTS PASSED`);
  console.log('========================================================================\n');

  server.close();
  process.exit(passedCount === totalTests ? 0 : 1);
}

runTests();
