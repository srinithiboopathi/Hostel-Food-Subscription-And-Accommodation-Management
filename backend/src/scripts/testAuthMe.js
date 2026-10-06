const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const http = require('http');

function apiCall(token, path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(postData);
    req.end();
  });
}

async function testAll() {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = 'student@hostel.com'");
  const user = rows[0];
  const [students] = await pool.query('SELECT id FROM students WHERE user_id = ?', [user.id]);
  const studentId = students[0]?.id || null;
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.full_name, studentId }, process.env.JWT_SECRET || 'super_secret_production_jwt_key_hostel_management_2026', { expiresIn: '7d' });

  console.log('--- 1. Testing GET /api/food/stats ---');
  const statsRes = await apiCall(token, '/api/food/statistics');
  console.log('Stats status:', statsRes.status, 'Success:', statsRes.body?.success);

  console.log('--- 2. Testing GET /api/food/plans ---');
  const plansRes = await apiCall(token, '/api/food/plans');
  console.log('Plans status:', plansRes.status, 'Total plans:', plansRes.body?.data?.length);

  console.log('--- 3. Testing GET /api/food/subscriptions ---');
  const subsRes = await apiCall(token, '/api/food/subscriptions');
  console.log('Subs status:', subsRes.status, 'Total subs:', subsRes.body?.data?.length);
  console.log('Student Subscriptions:', subsRes.body?.data);

  console.log('--- 4. Testing GET /api/food/subscriptions/my-subscription ---');
  const mySubRes = await apiCall(token, '/api/food/subscriptions/my-subscription');
  console.log('My Sub status:', mySubRes.status, 'Plan:', mySubRes.body?.data?.plan_name);

  console.log('--- 5. Testing Change Plan ---');
  const changeRes = await apiCall(token, `/api/food/subscriptions/${mySubRes.body?.data?.id}/change-plan`, 'PUT', { new_plan_id: 1 });
  console.log('Change Plan status:', changeRes.status, 'Message:', changeRes.body?.message);

  process.exit(0);
}

testAll().catch(err => {
  console.error(err);
  process.exit(1);
});
