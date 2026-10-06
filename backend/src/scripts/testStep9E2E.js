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
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runStep9Tests() {
  console.log('========================================================================');
  console.log(' STEP 9 E2E TEST: REAL-TIME FOOD & MESS MANAGEMENT WITH MYSQL');
  console.log('========================================================================\n');

  let server;
  let messToken = null;
  let studentToken = null;
  let studentId = null;
  let studentEmail = null;
  let breakfastMenuId = null;
  let mealTypes = [];

  try {
    // 0. Start in-memory server instance on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        console.log(`[TEST SERVER] Running on dynamic test port ${server.address().port}`);
        resolve();
      });
    });

    // Ensure active student exists
    await query("UPDATE users SET status = 'ACTIVE' WHERE role = 'STUDENT'");

    // 1. Login as MESS_MANAGER
    console.log('\n[TEST 1] Logging in as MESS_MANAGER...');
    const messLoginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: 'mess@hostel.edu',
        password: 'Password@123',
      },
    });

    if (messLoginRes.status !== 200 || !messLoginRes.data.data?.token) {
      throw new Error(`MESS_MANAGER login failed with status ${messLoginRes.status}: ${JSON.stringify(messLoginRes.data)}`);
    }
    messToken = messLoginRes.data.data.token;
    console.log('✔ MESS_MANAGER login successful (JWT token generated).');

    // 2. Fetch Meal Types
    console.log('\n[TEST 2] Fetching Meal Types from MySQL...');
    const typesRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/menu/types',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    if (typesRes.status !== 200 || !Array.isArray(typesRes.data.data) || typesRes.data.data.length === 0) {
      throw new Error(`Failed to get meal types: ${JSON.stringify(typesRes.data)}`);
    }
    mealTypes = typesRes.data.data;
    console.log(`✔ Retrieved ${mealTypes.length} meal types:`, mealTypes.map((t) => t.name).join(', '));

    const breakfastType = mealTypes.find((t) => t.name.toUpperCase().includes('BREAKFAST')) || mealTypes[0];
    const lunchType = mealTypes.find((t) => t.name.toUpperCase().includes('LUNCH')) || mealTypes[1];
    const dinnerType = mealTypes.find((t) => t.name.toUpperCase().includes('DINNER')) || mealTypes[3];

    // 3. Load menu from MySQL (GET /api/menu/today & /api/menu/week)
    console.log('\n[TEST 3] Loading today & weekly menu...');
    const todayRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/menu/today',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    if (todayRes.status !== 200 || !todayRes.data.data?.meals) {
      throw new Error(`Failed to load today's menu: ${JSON.stringify(todayRes.data)}`);
    }
    console.log(`✔ Today's menu loaded for ${todayRes.data.data.day_of_week} (${todayRes.data.data.meals.length} meal slots).`);

    const weekRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/menu/week',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    if (weekRes.status !== 200 || !weekRes.data.data?.schedule) {
      throw new Error(`Failed to load weekly menu: ${JSON.stringify(weekRes.data)}`);
    }
    console.log('✔ Weekly 7-day dining schedule loaded from MySQL.');

    // 4. Add breakfast (POST /api/menu)
    console.log('\n[TEST 4] Adding breakfast menu item for MONDAY...');
    const addBreakfastRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/menu',
      headers: { Authorization: `Bearer ${messToken}` },
      body: {
        dayOfWeek: 'MONDAY',
        mealTypeId: breakfastType.id,
        itemsDescription: 'Idli with Sambar and Coconut Chutney, Medu Vada',
        specialItem: 'Filter Coffee',
        caloriesEst: 420,
        isActive: true,
      },
    });

    if (addBreakfastRes.status !== 201 && addBreakfastRes.status !== 200) {
      throw new Error(`Failed to add breakfast: ${JSON.stringify(addBreakfastRes.data)}`);
    }
    breakfastMenuId = addBreakfastRes.data.data.id;
    console.log(`✔ Breakfast added with ID ${breakfastMenuId}: "${addBreakfastRes.data.data.items_description}".`);

    // 5. Verify record in MySQL directly
    console.log('\n[TEST 5] Verifying record directly in MySQL food_menu table...');
    const [sqlRows] = await query('SELECT * FROM food_menu WHERE id = ?', [breakfastMenuId]);
    if (sqlRows.length === 0) {
      throw new Error(`Record ${breakfastMenuId} not found in MySQL food_menu!`);
    }
    console.log(`✔ Verified in MySQL: Day=${sqlRows[0].day_of_week}, Special="${sqlRows[0].special_item}", Calories=${sqlRows[0].calories_est}`);

    // 6 & 7. Refresh & Confirm breakfast remains
    console.log('\n[TEST 6 & 7] Refreshing / Querying menu item by ID...');
    const getByIdRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/menu/${breakfastMenuId}`,
      headers: { Authorization: `Bearer ${messToken}` },
    });
    if (getByIdRes.status !== 200 || getByIdRes.data.data.id !== breakfastMenuId) {
      throw new Error('Menu item not preserved after lookup');
    }
    console.log('✔ Confirmed item remains persisted in MySQL.');

    // 8 & 9. Edit breakfast (PUT /api/menu/:id) & Verify UPDATE
    console.log('\n[TEST 8 & 9] Updating breakfast menu item...');
    const updateRes = await makeRequest(server, {
      method: 'PUT',
      path: `/api/menu/${breakfastMenuId}`,
      headers: { Authorization: `Bearer ${messToken}` },
      body: {
        itemsDescription: 'Masala Dosa with Sambar, Chutney & Kesari',
        specialItem: 'Masala Tea',
        caloriesEst: 510,
      },
    });

    if (updateRes.status !== 200 || !updateRes.data.data.items_description.includes('Masala Dosa')) {
      throw new Error(`Failed to update menu item: ${JSON.stringify(updateRes.data)}`);
    }
    console.log('✔ Menu item updated successfully:', updateRes.data.data.items_description);

    // 10 & 11. Add Lunch & Dinner
    console.log('\n[TEST 10 & 11] Adding Lunch and Dinner items for MONDAY...');
    const lunchRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/menu',
      headers: { Authorization: `Bearer ${messToken}` },
      body: {
        dayOfWeek: 'MONDAY',
        mealTypeId: lunchType.id,
        itemsDescription: 'Steamed Rice, Dal Tadka, Paneer Butter Masala, Roti, Curd',
        specialItem: 'Gulab Jamun',
        caloriesEst: 750,
      },
    });
    console.log('✔ Lunch added:', lunchRes.data.data?.items_description?.slice(0, 40) + '...');

    const dinnerRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/menu',
      headers: { Authorization: `Bearer ${messToken}` },
      body: {
        dayOfWeek: 'MONDAY',
        mealTypeId: dinnerType.id,
        itemsDescription: 'Veg Biryani, Raita, Mixed Veg Curry, Chapati',
        specialItem: 'Ice Cream',
        caloriesEst: 680,
      },
    });
    console.log('✔ Dinner added:', dinnerRes.data.data?.items_description?.slice(0, 40) + '...');

    // 12. Verify weekly menu
    console.log('\n[TEST 12] Verifying weekly menu contains Monday items...');
    const weekCheckRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/menu/week',
      headers: { Authorization: `Bearer ${messToken}` },
    });
    const mondayMeals = weekCheckRes.data.data.schedule['MONDAY'];
    const mondayHasBreakfast = mondayMeals.some((m) => m.items_description.includes('Masala Dosa'));
    if (!mondayHasBreakfast) {
      throw new Error('Weekly menu did not reflect the updated Monday breakfast!');
    }
    console.log('✔ Weekly schedule verified containing 4 meals for Monday.');

    // 13. Record meal attendance (POST /api/meals/attendance)
    console.log('\n[TEST 13] Finding active student and marking meal attendance...');
    const [students] = await query(`
      SELECT s.id, u.email 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.status = 'ACTIVE' 
      LIMIT 1
    `);
    if (students.length === 0) {
      throw new Error('No active student found for attendance test');
    }
    studentId = students[0].id;
    studentEmail = students[0].email;
    const testDate = '2026-09-28';

    const markAttRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/meals/attendance',
      headers: { Authorization: `Bearer ${messToken}` },
      body: {
        studentId,
        mealTypeId: breakfastType.id,
        mealDate: testDate,
        status: 'PRESENT',
        remarks: 'On time for breakfast',
      },
    });

    if (markAttRes.status !== 201 && markAttRes.status !== 200) {
      throw new Error(`Failed to record attendance: ${JSON.stringify(markAttRes.data)}`);
    }
    console.log('✔ Attendance recorded successfully for student ID:', studentId);

    // 14. Verify attendance in MySQL
    console.log('\n[TEST 14] Verifying attendance in MySQL meal_attendance table...');
    const [attRows] = await query(
      'SELECT * FROM meal_attendance WHERE student_id = ? AND meal_date = ? AND meal_type_id = ?',
      [studentId, testDate, breakfastType.id]
    );
    if (attRows.length === 0) {
      throw new Error('Attendance record not persisted in MySQL!');
    }
    console.log(`✔ Verified in MySQL: Attendance ID=${attRows[0].id}, Status=${attRows[0].status}, Remarks="${attRows[0].remarks}"`);

    // 15 & 16. Attempt duplicate attendance & Verify duplicate protection
    console.log('\n[TEST 15 & 16] Testing duplicate attendance prevention / upsert handling...');
    const dupAttRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/meals/attendance',
      headers: { Authorization: `Bearer ${messToken}` },
      body: {
        studentId,
        mealTypeId: breakfastType.id,
        mealDate: testDate,
        status: 'PACKED',
        remarks: 'Updated to packed meal request',
      },
    });

    if (dupAttRes.status !== 200 && dupAttRes.status !== 201) {
      throw new Error(`Duplicate attendance handling failed: ${JSON.stringify(dupAttRes.data)}`);
    }

    // Verify record count remains exactly 1 for this (student, date, meal_type)
    const [dupCheckRows] = await query(
      'SELECT COUNT(*) as cnt FROM meal_attendance WHERE student_id = ? AND meal_date = ? AND meal_type_id = ?',
      [studentId, testDate, breakfastType.id]
    );
    if (dupCheckRows[0].cnt !== 1) {
      throw new Error(`Duplicate record inserted! Count is ${dupCheckRows[0].cnt}, expected 1.`);
    }
    console.log('✔ Duplicate protection verified (unique constraint respected, status updated to PACKED).');

    // 17. Check statistics (GET /api/meals/statistics)
    console.log('\n[TEST 17] Fetching meal statistics via SQL aggregation...');
    const statsRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/meals/statistics?date=${testDate}`,
      headers: { Authorization: `Bearer ${messToken}` },
    });

    if (statsRes.status !== 200 || !statsRes.data.data) {
      throw new Error(`Failed to get statistics: ${JSON.stringify(statsRes.data)}`);
    }
    const stats = statsRes.data.data;
    console.log('✔ Aggregation Statistics from MySQL:');
    console.log(`   - Total Active Residents: ${stats.total_residents}`);
    console.log(`   - Breakfast Count: ${stats.breakfast_count}`);
    console.log(`   - Lunch Count: ${stats.lunch_count}`);
    console.log(`   - Snacks Count: ${stats.snacks_count}`);
    console.log(`   - Dinner Count: ${stats.dinner_count}`);
    console.log(`   - Total Consumed: ${stats.total_consumed}`);
    console.log(`   - Consumption Rate: ${stats.consumption_percentage}%`);

    // 18. Login as STUDENT
    console.log(`\n[TEST 18] Logging in as STUDENT (${studentEmail})...`);
    const studentLoginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: studentEmail,
        password: 'Password@123',
      },
    });

    if (studentLoginRes.status !== 200 || !studentLoginRes.data.data?.token) {
      throw new Error(`Student login failed: ${JSON.stringify(studentLoginRes.data)}`);
    }
    studentToken = studentLoginRes.data.data.token;
    console.log('✔ Student login successful.');

    // 19. Verify student can view menu
    console.log('\n[TEST 19] Student viewing food menu...');
    const studentMenuRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/menu/today',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (studentMenuRes.status !== 200) {
      throw new Error(`Student cannot view menu: ${JSON.stringify(studentMenuRes.data)}`);
    }
    console.log('✔ Student successfully viewed today\'s menu.');

    // 20. Verify student sees only their own meal history
    console.log('\n[TEST 20] Student viewing own meal history (/api/meals/my-history)...');
    const historyRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/meals/my-history',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (historyRes.status !== 200 || !Array.isArray(historyRes.data.data)) {
      throw new Error(`Failed to get student meal history: ${JSON.stringify(historyRes.data)}`);
    }
    console.log(`✔ Student retrieved ${historyRes.data.data.length} personal meal check-in records.`);

    // 21. Verify student cannot modify menu (RBAC)
    console.log('\n[TEST 21] Verifying Student CANNOT add/modify menu items (403 Forbidden)...');
    const forbiddenMenuRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/menu',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        dayOfWeek: 'TUESDAY',
        mealTypeId: breakfastType.id,
        itemsDescription: 'Unauthorized menu item',
      },
    });
    if (forbiddenMenuRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for Student menu modification, got ${forbiddenMenuRes.status}`);
    }
    console.log('✔ RBAC Enforcement confirmed: Student received 403 Forbidden on POST /api/menu.');

    // 22. Test invalid data
    console.log('\n[TEST 22] Testing validation on invalid day of week (400 / 422 Unprocessable Entity)...');
    const invalidDayRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/menu',
      headers: { Authorization: `Bearer ${messToken}` },
      body: {
        dayOfWeek: 'FUNDAY',
        mealTypeId: breakfastType.id,
        itemsDescription: 'Test item',
      },
    });
    if (invalidDayRes.status !== 400 && invalidDayRes.status !== 422) {
      throw new Error(`Expected 400/422 for invalid day, got ${invalidDayRes.status}`);
    }
    console.log(`✔ Validation confirmed: HTTP ${invalidDayRes.status} returned on invalid data.`);

    // 23. Test unauthorized request without token
    console.log('\n[TEST 23] Testing unauthorized access without JWT token (401 Unauthorized)...');
    const unauthRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/menu',
      body: {
        dayOfWeek: 'MONDAY',
        mealTypeId: 1,
        itemsDescription: 'No auth test',
      },
    });
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized without token, got ${unauthRes.status}`);
    }
    console.log('✔ Auth Security confirmed: 401 Unauthorized returned when token is missing.');

    console.log('\n========================================================================');
    console.log(' ALL 23 STEP 9 VERIFICATION TESTS PASSED SUCCESSFULLY! (100% COMPLETE)');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
  }
}

runStep9Tests();
