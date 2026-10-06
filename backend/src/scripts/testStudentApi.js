const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
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

async function runStudentTests() {
  console.log('========================================================================');
  console.log(' 🧪 REAL STUDENT MANAGEMENT CRUD TEST SUITE                             ');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 10;

  function assert(num, title, cond, details = '') {
    if (cond) {
      console.log(` ✅ Test ${num.toString().padStart(2, ' ')}: [PASS] ${title}`);
      passed++;
    } else {
      console.log(` ❌ Test ${num.toString().padStart(2, ' ')}: [FAIL] ${title} -> ${details}`);
    }
  }

  // 1. Get Admin Token
  const adminLogin = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'admin@hostel.local', password: 'Admin@123' });
  const adminToken = adminLogin.data?.data?.token;

  // 2. Get Student Token (Aarav Patel, studentId = 1)
  const studentLogin = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'student@hostel.local', password: 'Student@123' });
  const studentToken = studentLogin.data?.data?.token;

  // Test 1: List all students as Admin (200 OK + Paginated Array)
  const t1 = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/students?page=1&limit=10', method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert(1, 'List students as Admin with pagination', t1.statusCode === 200 && Array.isArray(t1.data?.data) && t1.data?.pagination?.total > 0, JSON.stringify(t1.data));

  // Test 2: Search students by query
  const t2 = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/students?search=Aarav', method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert(2, 'Search students by name (search=Aarav)', t2.statusCode === 200 && t2.data?.data?.length > 0 && t2.data?.data[0].name.includes('Aarav'), JSON.stringify(t2.data));

  // Test 3: Filter by department
  const t3 = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/students?department=Computer%20Science%20%26%20Engineering', method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert(3, 'Filter students by department', t3.statusCode === 200 && t3.data?.data?.length > 0, JSON.stringify(t3.data));

  // Test 4: Create new student "Sriram D"
  const newStudentPayload = {
    name: 'Sriram D',
    email: `sriram.d.${Date.now()}@student.edu`,
    rollNumber: `CS${Date.now().toString().slice(-6)}`,
    department: 'Computer Science & Engineering',
    course: 'B.Tech CSE',
    yearOfStudy: 1,
    gender: 'MALE',
    guardianName: 'D. Ramamoorthy',
    guardianPhone: '+91 98765 11223',
    guardianRelation: 'Father',
    permanentAddress: '14, Temple Street, Chennai, Tamil Nadu',
    admissionDate: '2025-08-01',
    status: 'ACTIVE',
  };

  const t4 = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/students', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
  }, newStudentPayload);

  const createdId = t4.data?.data?.id;
  assert(4, 'Create new real student "Sriram D" in MySQL', t4.statusCode === 201 && t4.data?.data?.name === 'Sriram D' && !!createdId, JSON.stringify(t4.data));

  // Test 5: Get student by ID
  const t5 = await makeRequest({
    hostname: 'localhost', port: 5000, path: `/api/students/${createdId}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert(5, 'Get created student by ID with relational joins', t5.statusCode === 200 && t5.data?.data?.name === 'Sriram D', JSON.stringify(t5.data));

  // Test 6: Update student info (Promote Sriram D to 2nd year)
  const t6 = await makeRequest({
    hostname: 'localhost', port: 5000, path: `/api/students/${createdId}`, method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
  }, { yearOfStudy: 2, phone: '+91 98765 99887' });
  assert(6, 'Update student fields in MySQL (PUT /api/students/:id)', t6.statusCode === 200 && t6.data?.data?.year_of_study === 2, JSON.stringify(t6.data));

  // Test 7: Deactivate student
  const t7 = await makeRequest({
    hostname: 'localhost', port: 5000, path: `/api/students/${createdId}`, method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert(7, 'Deactivate student with safe status transition', t7.statusCode === 200 && t7.data?.data?.status === 'VACATED', JSON.stringify(t7.data));

  // Test 8: Student role denied access to GET /api/students (403 Forbidden)
  const t8 = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/students', method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
  });
  assert(8, 'Student role forbidden from listing all students (403)', t8.statusCode === 403, JSON.stringify(t8.data));

  // Test 9: Student role allowed to view their own profile (GET /api/students/:id)
  const studentId = studentLogin.data?.data?.user?.studentDetails?.studentId || 1;
  const t9 = await makeRequest({
    hostname: 'localhost', port: 5000, path: `/api/students/${studentId}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
  });
  assert(9, 'Student role permitted to view own profile (200 OK)', t9.statusCode === 200, JSON.stringify(t9.data));

  // Test 10: Student role forbidden from viewing another student (403)
  const anotherStudentId = studentId === 1 ? 2 : 1;
  const t10 = await makeRequest({
    hostname: 'localhost', port: 5000, path: `/api/students/${anotherStudentId}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
  });
  assert(10, 'Student role forbidden from viewing another student (403)', t10.statusCode === 403, JSON.stringify(t10.data));

  console.log('\n========================================================================');
  console.log(` 🏁 RESULT: ${passed}/${total} STUDENT CRUD TESTS PASSED`);
  console.log('========================================================================\n');
}

runStudentTests();
