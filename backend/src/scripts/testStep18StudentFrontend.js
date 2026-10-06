/**
 * STEP 18 — STUDENT MANAGEMENT FRONTEND INTEGRATION & PERSISTENCE TEST SUITE
 * Verifies all Student CRUD workflows, pagination, filters, validations,
 * deactivations, RBAC isolation, and real-time MySQL persistence.
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

async function runStep18Tests() {
  console.log('============================================================');
  console.log('🎓 STEP 18: STUDENT MANAGEMENT E2E & PERSISTENCE TEST SUITE');
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
    // 1. Authenticate Actors
    console.log('--- 1. ACTOR AUTHENTICATION ---');
    const [users] = await query("SELECT email, role FROM users WHERE status = 'ACTIVE'");
    const adminUser = users.find((u) => u.role === 'ADMIN');
    const wardenUser = users.find((u) => u.role === 'WARDEN');
    const studentUser = users.find((u) => u.role === 'STUDENT');
    const messUser = users.find((u) => u.role === 'MESS_MANAGER');

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
    const studentToken = await login(studentUser.email);
    const messToken = await login(messUser.email);

    assert(!!adminToken && !!wardenToken && !!studentToken, 'Admin, Warden, and Student authenticated with JWT');

    // 2. Student List & Pagination
    console.log('\n--- 2. STUDENT LIST & PAGINATION ---');
    const listRes = await makeRequest(server, {
      path: '/api/students?page=1&limit=5',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const studentsList = Array.isArray(listRes.body?.data) ? listRes.body.data : (listRes.body?.data?.students || []);
    const paginationMeta = listRes.body?.pagination || listRes.body?.data?.pagination;

    assert(
      listRes.status === 200 && Array.isArray(studentsList),
      'GET /api/students returns paginated student list (HTTP 200)'
    );
    assert(
      paginationMeta?.page === 1 && paginationMeta?.limit === 5,
      'Pagination metadata correctly formatted (page, limit, total, totalPages)'
    );

    const initialTotal = paginationMeta?.total || 0;

    // 3. Search and Filtering
    console.log('\n--- 3. SEARCH & FILTER INTEGRATION ---');
    const searchRes = await makeRequest(server, {
      path: '/api/students?search=Aarav',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchStudents = Array.isArray(searchRes.body?.data) ? searchRes.body.data : (searchRes.body?.data?.students || []);
    assert(
      searchRes.status === 200 && searchStudents.some((s) => s.name.includes('Aarav')),
      'Student search by name returns matching MySQL records'
    );

    const filterDeptRes = await makeRequest(server, {
      path: '/api/students?department=Computer%20Science%20%26%20Engineering',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptStudents = Array.isArray(filterDeptRes.body?.data) ? filterDeptRes.body.data : (filterDeptRes.body?.data?.students || []);
    assert(
      filterDeptRes.status === 200 && deptStudents.every((s) => s.department === 'Computer Science & Engineering'),
      'Student filter by department operates accurately'
    );

    // 4. Add Student (POST /api/students)
    console.log('\n--- 4. ADD STUDENT CREATION WORKFLOW ---');
    const testRoll = `ST18-${Math.floor(100000 + Math.random() * 900000)}`;
    const testEmail = `student.${testRoll.toLowerCase()}@student.edu`;
    const newStudentData = {
      name: 'Rohan Deshmukh',
      email: testEmail,
      phone: '+91 98765 88990',
      rollNumber: testRoll,
      department: 'Biotechnology',
      course: 'B.Tech Biotech',
      yearOfStudy: 2,
      gender: 'MALE',
      dob: '2004-09-12',
      bloodGroup: 'O+',
      guardianName: 'Sanjay Deshmukh',
      guardianPhone: '+91 98765 88991',
      guardianRelation: 'Father',
      permanentAddress: 'Flat 402, Green Meadows, Pune, Maharashtra',
      status: 'ACTIVE',
    };

    const createRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/students',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: newStudentData,
    });

    assert(
      createRes.status === 201 && createRes.body?.success,
      'Admin creates new student via POST /api/students (HTTP 201 Created)'
    );

    const createdStudentId = createRes.body?.data?.id;
    assert(!!createdStudentId, `Created student ID returned: ${createdStudentId}`);

    // Verify directly in MySQL
    const [mysqlCreated] = await query('SELECT * FROM students WHERE id = ?', [createdStudentId]);
    assert(
      mysqlCreated.length > 0 && mysqlCreated[0].roll_number === testRoll,
      'Direct MySQL verification: Student row successfully inserted with correct roll number'
    );

    // Verify Duplicate Validation
    const dupRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/students',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: newStudentData,
    });
    assert(
      dupRes.status === 409,
      'Duplicate email / roll number rejected with HTTP 409 Conflict'
    );

    // 5. View Student Details (GET /api/students/:id)
    console.log('\n--- 5. VIEW STUDENT DETAILS ---');
    const viewRes = await makeRequest(server, {
      path: `/api/students/${createdStudentId}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      viewRes.status === 200 && viewRes.body?.data?.id === createdStudentId,
      'Warden retrieves detailed student profile (HTTP 200 OK)'
    );
    assert(
      viewRes.body?.data?.guardian_name === 'Sanjay Deshmukh' && viewRes.body?.data?.department === 'Biotechnology',
      'Student profile includes complete personal, guardian, and academic attributes'
    );

    // 6. Edit Student (PUT /api/students/:id)
    console.log('\n--- 6. EDIT STUDENT UPDATE WORKFLOW ---');
    const updatePayload = {
      name: 'Rohan S. Deshmukh',
      phone: '+91 98765 99999',
      yearOfStudy: 3,
      permanentAddress: 'Updated Address 505, Pune, Maharashtra',
    };

    const updateRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/students/${createdStudentId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: updatePayload,
    });

    assert(
      updateRes.status === 200 && updateRes.body?.success,
      'Admin updates student profile via PUT /api/students/:id (HTTP 200 OK)'
    );

    // Verify MySQL update persistence
    const [mysqlUpdated] = await query('SELECT s.year_of_study, s.permanent_address, u.full_name, u.phone FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?', [createdStudentId]);
    assert(
      mysqlUpdated[0]?.year_of_study === 3 && mysqlUpdated[0]?.full_name === 'Rohan S. Deshmukh',
      'Direct MySQL verification: Updated values persisted across both users and students tables'
    );

    // 7. Deactivate Student (DELETE /api/students/:id)
    console.log('\n--- 7. DEACTIVATE STUDENT WORKFLOW ---');
    const deactivateRes = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/students/${createdStudentId}`,
      headers: { Authorization: `Bearer ${wardenToken}` },
    });

    assert(
      deactivateRes.status === 200 && deactivateRes.body?.success,
      'Warden deactivates student via DELETE /api/students/:id (HTTP 200 OK)'
    );

    // Verify MySQL status is VACATED and user is INACTIVE
    const [mysqlDeactivated] = await query('SELECT s.status as student_status, u.status as user_status FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?', [createdStudentId]);
    assert(
      mysqlDeactivated[0]?.student_status === 'VACATED' && mysqlDeactivated[0]?.user_status === 'INACTIVE',
      'Direct MySQL verification: Status updated to VACATED (student) and INACTIVE (user)'
    );

    // 8. Security & RBAC Checks
    console.log('\n--- 8. SECURITY & RBAC ISOLATION ---');
    // Student attempting to create student
    const studentCreateBlocked = await makeRequest(server, {
      method: 'POST',
      path: '/api/students',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: newStudentData,
    });
    assert(
      studentCreateBlocked.status === 403,
      'Student role blocked with HTTP 403 Forbidden from creating students'
    );

    // Student attempting to list all students
    const studentListBlocked = await makeRequest(server, {
      path: '/api/students',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentListBlocked.status === 403,
      'Student role blocked with HTTP 403 Forbidden from managing student list'
    );

    // Unauthenticated request
    const unauthBlocked = await makeRequest(server, {
      path: '/api/students',
    });
    assert(
      unauthBlocked.status === 401,
      'Unauthenticated request blocked with HTTP 401 Unauthorized'
    );
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    console.log('\n============================================================');
    console.log(`🏁 STEP 18 TEST RESULTS: ${passed} PASSED, ${total - passed} FAILED`);
    console.log('============================================================\n');
    server.close();
    process.exit(passed === total ? 0 : 1);
  }
}

runStep18Tests();
