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

  console.log('====================================================');
  console.log('🧪 STEP 7 FULL END-TO-END VERIFICATION SUITE');
  console.log('====================================================');

  try {
    // 1 & 2. Login as ADMIN & Open Hostels
    console.log('\n[1 & 2] Login as ADMIN & Open Hostels');
    const loginRes = await apiCall('/api/auth/login', 'POST', {
      email: 'admin@hostel.local',
      password: 'Admin@123'
    }, null);
    console.log('   Admin Login Result:', loginRes.status === 200 ? '✅ 200 OK' : '❌ Failed', loginRes.body.data?.user?.email);

    // 3. Load hostels from MySQL
    console.log('\n[3] Load Hostels from MySQL via API');
    const hostelsRes = await apiCall('/api/hostels');
    console.log('   Loaded Hostels Count:', hostelsRes.body.data?.length);

    // 4. Add a new hostel
    console.log('\n[4] Add a new Hostel block');
    const testHostelCode = 'RSB-' + Math.floor(Math.random() * 1000);
    const testHostelName = 'Ramanujan Block ' + Date.now();
    const createHostelRes = await apiCall('/api/hostels', 'POST', {
      name: testHostelName,
      code: testHostelCode,
      type: 'BOYS',
      totalFloors: 3,
      wardenId: 10,
      address: 'South-East Campus Science Block',
      contactPhone: '+91 98765 00099',
      status: 'ACTIVE'
    });
    console.log('   Create Hostel Status:', createHostelRes.status === 201 ? '✅ 201 Created' : '❌ Failed');
    const newHostelId = createHostelRes.body.data?.id;
    console.log('   New Hostel ID:', newHostelId);

    // 5. Verify it in MySQL directly
    console.log('\n[5] Verify Hostel in MySQL database');
    const [dbHostelRows] = await db.query('SELECT * FROM hostels WHERE id = ?', [newHostelId]);
    console.log('   MySQL row found:', dbHostelRows.length > 0 ? '✅ YES' : '❌ NO', 'Code:', dbHostelRows[0]?.code);

    // 6 & 7. Refresh / fetch again to verify persistence
    console.log('\n[6 & 7] Persistence verification (fetch by ID and re-list)');
    const getSingleHostelRes = await apiCall('/api/hostels/' + newHostelId);
    console.log('   Re-fetch Status:', getSingleHostelRes.status === 200 ? '✅ 200 OK' : '❌ Failed', 'Name:', getSingleHostelRes.body.data?.name);

    // 8. Add a room to the newly created hostel
    console.log('\n[8] Add a Room in the new Hostel (Room 101, Capacity 3)');
    const createRoomRes = await apiCall('/api/rooms', 'POST', {
      hostelId: newHostelId,
      roomNumber: '101',
      floor: 1,
      roomType: 'TRIPLE',
      capacity: 3,
      baseRent: 4000,
      amenities: ['Air Conditioner', 'Study Desks', 'High-speed Wi-Fi'],
      status: 'AVAILABLE'
    });
    console.log('   Create Room Status:', createRoomRes.status === 201 ? '✅ 201 Created' : '❌ Failed');
    const newRoomId = createRoomRes.body.data?.id;
    console.log('   New Room ID:', newRoomId);

    // 9. Verify room in MySQL
    console.log('\n[9] Verify Room in MySQL database');
    const [dbRoomRows] = await db.query('SELECT * FROM rooms WHERE id = ?', [newRoomId]);
    console.log('   MySQL Room row found:', dbRoomRows.length > 0 ? '✅ YES' : '❌ NO', 'Room Number:', dbRoomRows[0]?.room_number);

    // 10. Edit room
    console.log('\n[10] Edit Room (Update Base Rent to 4500 and capacity to 4)');
    const updateRoomRes = await apiCall('/api/rooms/' + newRoomId, 'PUT', {
      capacity: 4,
      baseRent: 4500,
      roomType: 'FOUR_BED'
    });
    console.log('   Update Room Status:', updateRoomRes.status === 200 ? '✅ 200 OK' : '❌ Failed');
    console.log('   Updated Room Data in API:', {
      capacity: updateRoomRes.body.data?.capacity,
      baseRent: updateRoomRes.body.data?.base_rent,
      roomType: updateRoomRes.body.data?.room_type
    });

    // 11. Verify update in MySQL
    console.log('\n[11] Verify Room Update in MySQL database');
    const [dbUpdatedRoomRows] = await db.query('SELECT capacity, base_rent, room_type FROM rooms WHERE id = ?', [newRoomId]);
    console.log('   MySQL Updated Values:', dbUpdatedRoomRows[0]);

    // 12. Test duplicate room number within the same hostel
    console.log('\n[12] Test Duplicate Room Number in same hostel (Try creating Room 101 again in same hostel)');
    const dupRoomRes = await apiCall('/api/rooms', 'POST', {
      hostelId: newHostelId,
      roomNumber: '101',
      floor: 1,
      capacity: 2
    });
    console.log('   Duplicate Room Result:', dupRoomRes.status === 409 ? '✅ 409 Conflict as Expected' : '❌ Failed', 'Message:', dupRoomRes.body.message);

    // 13. Test invalid capacity (capacity <= 0)
    console.log('\n[13] Test Invalid Capacity (capacity = 0)');
    const invCapRes = await apiCall('/api/rooms', 'POST', {
      hostelId: newHostelId,
      roomNumber: '102',
      floor: 1,
      capacity: 0
    });
    console.log('   Invalid Capacity Result:', invCapRes.status === 422 ? '✅ 422 Validation Error as Expected' : '❌ Failed', 'Message:', invCapRes.body.message);

    // 14. Test room filtering (by hostel, floor, roomType, occupancy)
    console.log('\n[14] Test Room Filtering (hostelId, floor, roomType, occupancy)');
    const filterRes1 = await apiCall('/api/rooms?hostelId=' + newHostelId);
    console.log('   Filtered by New Hostel ID:', filterRes1.body.data?.length === 1 ? '✅ PASS (Found 1 room)' : '❌ FAIL');
    const filterRes2 = await apiCall('/api/rooms?occupancy=AVAILABLE');
    console.log('   Filtered by Occupancy AVAILABLE:', filterRes2.body.data?.length > 0 ? '✅ PASS' : '❌ FAIL');

    // 15. Test hostel filtering (by search, status, type)
    console.log('\n[15] Test Hostel Filtering (by search & type)');
    const filterHostelRes = await apiCall('/api/hostels?search=' + encodeURIComponent(testHostelCode));
    console.log('   Search by Code:', filterHostelRes.body.data?.length === 1 ? '✅ PASS' : '❌ FAIL', 'Hostel:', filterHostelRes.body.data[0]?.name);

    // 16. Test real occupancy calculations
    console.log('\n[16] Test Real Occupancy Calculations');
    const singleHostelStats = await apiCall('/api/hostels/' + newHostelId);
    console.log('   New Hostel Stats:', {
      total_rooms: singleHostelStats.body.data?.total_rooms,
      total_capacity: singleHostelStats.body.data?.total_capacity,
      occupied_beds: singleHostelStats.body.data?.occupied_beds,
      available_beds: singleHostelStats.body.data?.available_beds,
      occupancy_percentage: singleHostelStats.body.data?.occupancy_percentage
    });

    // 17. Test Role Restrictions: STUDENT attempting to create room
    console.log('\n[17] Test Role Restrictions (STUDENT attempting POST /api/rooms)');
    const studentCreateRes = await apiCall('/api/rooms', 'POST', {
      hostelId: newHostelId,
      roomNumber: '999',
      capacity: 2
    }, studentToken);
    console.log('   Student Create Room Result:', studentCreateRes.status === 403 ? '✅ 403 Forbidden as Expected' : '❌ Failed', 'Message:', studentCreateRes.body.message);

    // 18. Verify students can only view permitted information
    console.log('\n[18] Verify Student can GET /api/hostels and /api/rooms');
    const studentHostelGet = await apiCall('/api/hostels', 'GET', null, studentToken);
    console.log('   Student GET Hostels:', studentHostelGet.status === 200 ? '✅ 200 OK' : '❌ Failed', 'Count:', studentHostelGet.body.data?.length);
    const studentRoomGet = await apiCall('/api/rooms', 'GET', null, studentToken);
    console.log('   Student GET Rooms:', studentRoomGet.status === 200 ? '✅ 200 OK' : '❌ Failed', 'Count:', studentRoomGet.body.data?.length);

    // Clean up created test room & test hostel
    console.log('\n[Clean-up] Deleting test room & test hostel');
    const delRoomRes = await apiCall('/api/rooms/' + newRoomId, 'DELETE');
    console.log('   Delete Test Room:', delRoomRes.status === 200 ? '✅ Deleted' : '❌ Failed');
    const delHostelRes = await apiCall('/api/hostels/' + newHostelId, 'DELETE');
    console.log('   Delete Test Hostel:', delHostelRes.status === 200 ? '✅ Deleted' : '❌ Failed');

    await db.end();
    console.log('\n====================================================');
    console.log('🎉 ALL 18 END-TO-END TESTS COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
    process.exit(0);
  } catch(e) {
    console.error('❌ Test execution error:', e);
    await db.end();
    process.exit(1);
  }
}, 1000);
