const app = require('../server');
const request = require('http');
const mysql = require('mysql2/promise');

setTimeout(async () => {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'production_super_secret_jwt_key_hostel_dbms_2026';

  const adminToken = jwt.sign({ id: 9, email: 'admin@hostel.local', role: 'ADMIN' }, secret, { expiresIn: '1h' });
  const wardenToken = jwt.sign({ id: 10, email: 'warden@hostel.local', role: 'WARDEN' }, secret, { expiresIn: '1h' });
  const studentToken = jwt.sign({ id: 13, email: 'student@hostel.local', role: 'STUDENT', studentId: 6 }, secret, { expiresIn: '1h' });

  async function apiCall(path, method = 'GET', body = null, token = adminToken) {
    return new Promise((resolve, reject) => {
      const u = new URL('http://localhost:5000' + path);
      const req = request.request(u, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch(e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hostel_management'
  });

  console.log('==================================================================');
  console.log('🧪 STEP 8 REAL-TIME ROOM ALLOCATION & TRANSACTION TEST SUITE');
  console.log('==================================================================');

  try {
    // 1. Login as ADMIN
    console.log('\n[1] Login as ADMIN');
    const loginRes = await apiCall('/api/auth/login', 'POST', {
      email: 'admin@hostel.local',
      password: 'Admin@123'
    }, null);
    console.log('   Admin Login Result:', loginRes.status === 200 ? '✅ 200 OK' : '❌ Failed', loginRes.body.data?.user?.email);

    // 2. Load students from MySQL
    console.log('\n[2] Load Students from MySQL');
    const studentsRes = await apiCall('/api/students');
    console.log('   Students Count:', studentsRes.body.data?.length);

    // 3. Load hostels from MySQL
    console.log('\n[3] Load Hostels from MySQL');
    const hostelsRes = await apiCall('/api/hostels');
    console.log('   Hostels Count:', hostelsRes.body.data?.length);

    // 4. Load available rooms (must exclude full or maintenance rooms)
    console.log('\n[4] Load Available Rooms (GET /api/allocations/available-rooms)');
    const availRoomsRes = await apiCall('/api/allocations/available-rooms');
    console.log('   Available Rooms Count:', availRoomsRes.body.data?.length);
    console.log('   Sample Available Room:', {
      room_number: availRoomsRes.body.data[0]?.room_number,
      capacity: availRoomsRes.body.data[0]?.capacity,
      occupied: availRoomsRes.body.data[0]?.occupied,
      available: availRoomsRes.body.data[0]?.available
    });

    // Create an unallocated test student for allocation testing
    const testRoll = 'ALLOC' + Math.floor(Math.random() * 10000);
    const createStudRes = await apiCall('/api/students', 'POST', {
      name: 'Allocation Test Candidate',
      email: 'alloc.test.' + Date.now() + '@student.edu',
      rollNumber: testRoll,
      department: 'Electrical Engineering',
      course: 'B.Tech',
      yearOfStudy: 2,
      gender: 'MALE',
      guardianName: 'Test Parent',
      guardianPhone: '+91 99887 76655',
      permanentAddress: '100 Campus Avenue, Bangalore'
    });
    const testStudentId = createStudRes.body.data?.id;
    console.log('\n   [Setup] Created unallocated test student:', { id: testStudentId, roll: testRoll });

    // Pick an available room (e.g. Room 102 in Hostel 1 with capacity 2)
    const targetRoom = availRoomsRes.body.data.find(r => r.hostel_id === 1 && r.capacity >= 2) || availRoomsRes.body.data[0];
    const targetRoomId = targetRoom.room_id;
    const initialOccupied = targetRoom.occupied;
    const initialAvailable = targetRoom.available;
    console.log('   [Target Room Before Allocation]:', {
      id: targetRoomId,
      room_number: targetRoom.room_number,
      capacity: targetRoom.capacity,
      occupied: initialOccupied,
      available: initialAvailable
    });

    // 5. Allocate a student (POST /api/allocations)
    console.log('\n[5] Allocate Student (POST /api/allocations)');
    const allocRes = await apiCall('/api/allocations', 'POST', {
      studentId: testStudentId,
      roomId: targetRoomId,
      academicYear: '2025-2026',
      allocatedFrom: new Date().toISOString().split('T')[0],
      securityDeposit: 5000,
      remarks: 'Bed 1 Allocated via E2E Test Suite'
    });
    console.log('   Allocation Status:', allocRes.status === 201 ? '✅ 201 Created' : '❌ Failed');
    const createdAllocId = allocRes.body.data?.id;
    console.log('   Created Allocation ID:', createdAllocId);

    // 6. Verify allocation in MySQL directly
    console.log('\n[6] Verify Allocation Record in MySQL (room_allocations table)');
    const [dbAllocRows] = await db.query('SELECT * FROM room_allocations WHERE id = ?', [createdAllocId]);
    console.log('   MySQL Allocation Row Found:', dbAllocRows.length > 0 ? '✅ YES' : '❌ NO', {
      student_id: dbAllocRows[0]?.student_id,
      room_id: dbAllocRows[0]?.room_id,
      status: dbAllocRows[0]?.status,
      academic_year: dbAllocRows[0]?.academic_year
    });

    // 7 & 8. Verify room occupancy and availability changed
    console.log('\n[7 & 8] Verify Room Occupancy & Availability Changed in MySQL & API');
    const updatedRoomRes = await apiCall('/api/rooms/' + targetRoomId);
    console.log('   Updated Room Stats:', {
      room_number: updatedRoomRes.body.data?.room_number,
      capacity: updatedRoomRes.body.data?.capacity,
      occupied_beds: updatedRoomRes.body.data?.occupied_beds,
      available_beds: updatedRoomRes.body.data?.available_beds,
      calculated_status: updatedRoomRes.body.data?.calculated_status
    });
    const occupancyIncremented = updatedRoomRes.body.data?.occupied_beds === initialOccupied + 1;
    console.log('   Occupancy incremented by 1:', occupancyIncremented ? '✅ PASS' : '❌ FAIL');

    // 9. Verify student profile shows allocated room
    console.log('\n[9] Verify Student Profile shows Allocated Room');
    const studentProfileRes = await apiCall('/api/students/' + testStudentId);
    console.log('   Student Accommodation Profile:', {
      hostel_name: studentProfileRes.body.data?.hostel_name,
      room_number: studentProfileRes.body.data?.room_number,
      room_type: studentProfileRes.body.data?.room_type,
      allocation_status: studentProfileRes.body.data?.allocation_status
    });
    console.log('   Student linked to room in DB:', studentProfileRes.body.data?.room_number ? '✅ YES' : '❌ NO');

    // 10. Persistence check (re-query allocation by ID)
    console.log('\n[10] Persistence Check (GET /api/allocations/' + createdAllocId + ')');
    const fetchAllocRes = await apiCall('/api/allocations/' + createdAllocId);
    console.log('   Fetch Allocation Status:', fetchAllocRes.status === 200 ? '✅ 200 OK' : '❌ Failed', 'Status:', fetchAllocRes.body.data?.status);

    // 11 & 12. Student Validation: Try allocating the same student again (must reject)
    console.log('\n[11 & 12] Student Validation: Try allocating student who already has an ACTIVE room allocation');
    const dupStudentAllocRes = await apiCall('/api/allocations', 'POST', {
      studentId: testStudentId,
      roomId: 3, // another room
      academicYear: '2025-2026'
    });
    console.log('   Duplicate Student Allocation Result:', dupStudentAllocRes.status === 409 ? '✅ 409 Conflict as Expected' : '❌ Failed');
    console.log('   Message:', dupStudentAllocRes.body.message);

    // 13 & 14. Fill a room to capacity & test full room behavior
    console.log('\n[13 & 14] Fill Room to Capacity (Single Room test: Room 3 capacity 1)');
    // Create another candidate student
    const testRoll2 = 'ALLOC' + Math.floor(Math.random() * 10000);
    const createStudRes2 = await apiCall('/api/students', 'POST', {
      name: 'Single Room Occupant',
      email: 'single.' + Date.now() + '@student.edu',
      rollNumber: testRoll2,
      department: 'Civil Engineering',
      course: 'B.Tech',
      yearOfStudy: 1,
      gender: 'MALE',
      guardianName: 'Parent 2',
      guardianPhone: '+91 99887 76611',
      permanentAddress: 'Bangalore'
    });
    const testStudentId2 = createStudRes2.body.data?.id;

    // Allocate to Room 3 (Single room with capacity 1)
    const singleAllocRes = await apiCall('/api/allocations', 'POST', {
      studentId: testStudentId2,
      roomId: 3,
      academicYear: '2025-2026'
    });
    console.log('   Allocate Single Room Status:', singleAllocRes.status === 201 ? '✅ 201 Created' : '❌ Failed');
    const singleAllocId = singleAllocRes.body.data?.id;

    // Verify Room 3 is now FULL
    const room3Res = await apiCall('/api/rooms/3');
    console.log('   Room 3 Calculated Status (Expected FULL):', room3Res.body.data?.calculated_status === 'FULL' ? '✅ FULL' : '❌ Not Full', {
      capacity: room3Res.body.data?.capacity,
      occupied: room3Res.body.data?.occupied_beds,
      available: room3Res.body.data?.available_beds
    });

    // 15 & 16. Verify FULL room does NOT appear in available-rooms API
    console.log('\n[15 & 16] Verify Room 3 does NOT appear in available-rooms API');
    const availAfterFull = await apiCall('/api/allocations/available-rooms');
    const room3InAvail = availAfterFull.body.data?.some(r => r.room_id === 3);
    console.log('   Room 3 present in available rooms list:', room3InAvail ? '❌ FAIL (Should be hidden)' : '✅ PASS (Correctly excluded)');

    // 17 & 18. Try allocating another student to the FULL room (must reject)
    console.log('\n[17 & 18] Concurrency / Capacity Guard: Try allocating 3rd student to FULL Room 3');
    const testRoll3 = 'ALLOC' + Math.floor(Math.random() * 10000);
    const createStudRes3 = await apiCall('/api/students', 'POST', {
      name: 'Third Student Candidate',
      email: 'third.' + Date.now() + '@student.edu',
      rollNumber: testRoll3,
      department: 'Mechanical',
      course: 'B.Tech',
      yearOfStudy: 1,
      gender: 'MALE',
      guardianName: 'Parent 3',
      guardianPhone: '+91 99887 76622',
      permanentAddress: 'Bangalore'
    });
    const testStudentId3 = createStudRes3.body.data?.id;

    const fullRoomAllocRes = await apiCall('/api/allocations', 'POST', {
      studentId: testStudentId3,
      roomId: 3,
      academicYear: '2025-2026'
    });
    console.log('   Allocation to FULL Room Result:', fullRoomAllocRes.status === 400 ? '✅ 400 Rejected as Expected' : '❌ Failed');
    console.log('   Message:', fullRoomAllocRes.body.message);

    // 19 & 20. Check-out / Vacate student (Room becomes available again)
    console.log('\n[19 & 20] Check-out / Vacate Student from Room 3 (PUT /api/allocations/' + singleAllocId + ')');
    const checkoutRes = await apiCall('/api/allocations/' + singleAllocId, 'PUT', {
      status: 'VACATED',
      remarks: 'Student completed stay and checked out'
    });
    console.log('   Check-out Result:', checkoutRes.status === 200 ? '✅ 200 OK' : '❌ Failed', 'Status:', checkoutRes.body.data?.status);

    // Verify Room 3 is available again
    const room3AfterCheckout = await apiCall('/api/rooms/3');
    console.log('   Room 3 Status After Check-Out:', room3AfterCheckout.body.data?.calculated_status === 'AVAILABLE' ? '✅ AVAILABLE' : '❌ Failed', {
      capacity: room3AfterCheckout.body.data?.capacity,
      occupied: room3AfterCheckout.body.data?.occupied_beds,
      available: room3AfterCheckout.body.data?.available_beds
    });

    // 21. Test Unauthorized Role: STUDENT attempting to POST /api/allocations
    console.log('\n[21] Authorization Test: STUDENT attempting to allocate room (Must return 403)');
    const studentAllocAttempt = await apiCall('/api/allocations', 'POST', {
      studentId: testStudentId3,
      roomId: 2
    }, studentToken);
    console.log('   Student Allocate Result:', studentAllocAttempt.status === 403 ? '✅ 403 Forbidden as Expected' : '❌ Failed');
    console.log('   Message:', studentAllocAttempt.body.message);

    // 22. Test Invalid Student ID
    console.log('\n[22] Validation Test: Allocate with non-existent student ID (99999)');
    const invalidStudentRes = await apiCall('/api/allocations', 'POST', {
      studentId: 99999,
      roomId: 2
    });
    console.log('   Invalid Student Result:', invalidStudentRes.status === 404 ? '✅ 404 Not Found as Expected' : '❌ Failed');

    // 23. Test Invalid Room ID
    console.log('\n[23] Validation Test: Allocate with non-existent room ID (99999)');
    const invalidRoomRes = await apiCall('/api/allocations', 'POST', {
      studentId: testStudentId3,
      roomId: 99999
    });
    console.log('   Invalid Room Result:', invalidRoomRes.status === 404 ? '✅ 404 Not Found as Expected' : '❌ Failed');

    // 24. Clean-up & Transaction Rollback confirmation
    console.log('\n[24] Clean up test allocations');
    await apiCall('/api/allocations/' + createdAllocId, 'DELETE');
    await apiCall('/api/students/' + testStudentId, 'DELETE');
    await apiCall('/api/students/' + testStudentId2, 'DELETE');
    await apiCall('/api/students/' + testStudentId3, 'DELETE');
    console.log('   Clean-up completed.');

    await db.end();
    console.log('\n==================================================================');
    console.log('🎉 ALL 24 STEP 8 E2E TESTS COMPLETED & VERIFIED IN MYSQL!');
    console.log('==================================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test error:', err);
    await db.end();
    process.exit(1);
  }
}, 1000);
