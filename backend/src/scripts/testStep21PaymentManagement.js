/**
 * STEP 21: PAYMENTS & FINANCIAL MANAGEMENT E2E & PERSISTENCE TEST SUITE
 */

const http = require('http');
const app = require('../server');
const { query } = require('../config/database');

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

async function runTests() {
  console.log('================================================================');
  console.log('  STARTING STEP 21: PAYMENTS & FINANCIAL MANAGEMENT TEST SUITE  ');
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
    const studentToken = await login(studentUser.email);

    assert(adminToken && wardenToken && studentToken, 'Admin, Warden, and Student authenticated with valid JWT');

    // -------------------------------------------------------------
    // 2. RBAC ACCESS CONTROL
    // -------------------------------------------------------------
    console.log('\n--- 2. RBAC ACCESS CONTROL ---');
    // Student should not be able to record payments
    const studentPayAttempt = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { studentFeeId: 1, amount: 500, paymentMethod: 'CASH' },
    });
    assert(studentPayAttempt.statusCode === 403, 'Student role blocked from recording payments (HTTP 403)');

    // Student should not be able to create fee bills
    const studentFeeAttempt = await makeRequest(server, {
      method: 'POST',
      path: '/api/fees',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { studentId: 1, feeTypeId: 1, amountDue: 5000, dueDate: '2026-12-31' },
    });
    assert(studentFeeAttempt.statusCode === 403, 'Student role blocked from creating fee bills (HTTP 403)');

    // -------------------------------------------------------------
    // 3. FEE LEDGER LISTING & MULTI-FILTERING
    // -------------------------------------------------------------
    console.log('\n--- 3. FEE LEDGER LISTING ---');
    const ledgerRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees?limit=10',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(ledgerRes.statusCode === 200, 'GET /api/fees returns HTTP 200');
    assert(Array.isArray(ledgerRes.body?.data), 'Fee ledger contains array of student fees');
    assert(ledgerRes.body?.pagination && ledgerRes.body.pagination.total !== undefined, 'Pagination metadata is properly returned');

    // Filter by feeTypeId
    const filteredLedger = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees?feeTypeId=1',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(filteredLedger.statusCode === 200, 'Filtering fee ledger by feeTypeId succeeds');

    // -------------------------------------------------------------
    // 4. STUDENT FEE CREATION & RETRIEVAL
    // -------------------------------------------------------------
    console.log('\n--- 4. STUDENT FEE CREATION & RETRIEVAL ---');
    const [students] = await query("SELECT id, roll_number FROM students WHERE status = 'ACTIVE' LIMIT 2");
    const testStudent = students[0];

    const uniqueBillNo = `BILL-TEST-${Date.now().toString().slice(-6)}`;
    const createFeeRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/fees',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        studentId: testStudent.id,
        feeTypeId: 1, // HOSTEL_RENT
        academicYear: '2026-2027',
        termName: 'Step 21 Test Term',
        amountDue: 15000,
        discount: 1000,
        dueDate: '2026-12-31',
        billNumber: uniqueBillNo,
      },
    });

    assert(createFeeRes.statusCode === 201, 'Admin creates student fee bill (HTTP 201 Created)');
    const createdFee = createFeeRes.body?.data;
    assert(createdFee && createdFee.id, 'Fee bill ID returned');
    assert(createdFee.outstanding_balance === 14000, 'Outstanding balance calculated correctly (15000 - 1000 = 14000)');

    // Retrieve single fee by ID
    const getFeeRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/fees/${createdFee.id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getFeeRes.statusCode === 200, 'GET /api/fees/:id retrieves fee bill with payments array');

    // -------------------------------------------------------------
    // 5. PAYMENT VALIDATIONS (POSITIVE & OVERPAYMENT & DUPLICATE)
    // -------------------------------------------------------------
    console.log('\n--- 5. PAYMENT VALIDATIONS ---');
    // Test negative / zero amount
    const invalidAmountRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        studentFeeId: createdFee.id,
        amount: -100,
        paymentMethod: 'UPI',
      },
    });
    assert(invalidAmountRes.statusCode === 400, 'Negative payment amount rejected with HTTP 400');

    // Test overpayment prevention
    const overpaymentRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        studentFeeId: createdFee.id,
        amount: 20000, // exceeds 14000 balance
        paymentMethod: 'UPI',
        transactionId: `TXN-OVERPAY-${Date.now()}`,
      },
    });
    assert(overpaymentRes.statusCode === 409, 'Overpayment rejected with HTTP 409 Conflict');

    // -------------------------------------------------------------
    // 6. PARTIAL PAYMENT & STATUS TRANSITION
    // -------------------------------------------------------------
    console.log('\n--- 6. PARTIAL PAYMENT ---');
    const txn1 = `TXN-PARTIAL-${Date.now()}`;
    const partialPayRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        studentFeeId: createdFee.id,
        amount: 6000,
        paymentMethod: 'UPI',
        transactionId: txn1,
        paymentDate: '2026-10-05',
        notes: 'First installment paid online',
      },
    });
    assert(partialPayRes.statusCode === 201, 'Partial payment of ₹6000 recorded successfully (HTTP 201)');
    const partialPayData = partialPayRes.body?.data;
    assert(partialPayData && partialPayData.receipt_number, 'Receipt number generated: ' + partialPayData?.receipt_number);

    // Verify student fee is updated to PARTIAL
    const [feeAfterPartial] = await query('SELECT * FROM student_fees WHERE id = ?', [createdFee.id]);
    assert(feeAfterPartial[0].status === 'PARTIAL', 'Fee status updated to PARTIAL in MySQL');
    assert(parseFloat(feeAfterPartial[0].amount_paid) === 6000, 'amount_paid updated to 6000.00');

    // Test duplicate transaction reference prevention
    const dupTxnRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        studentFeeId: createdFee.id,
        amount: 2000,
        paymentMethod: 'UPI',
        transactionId: txn1, // reusing same txn1
      },
    });
    assert(dupTxnRes.statusCode === 409, 'Duplicate transaction reference rejected with HTTP 409');

    // -------------------------------------------------------------
    // 7. FULL PAYMENT & STATUS TRANSITION TO PAID
    // -------------------------------------------------------------
    console.log('\n--- 7. FULL PAYMENT ---');
    const txn2 = `TXN-FULL-${Date.now()}`;
    const remainingToPay = 14000 - 6000; // 8000
    const fullPayRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        studentFeeId: createdFee.id,
        amount: remainingToPay,
        paymentMethod: 'NET_BANKING',
        transactionId: txn2,
        notes: 'Final installment paid',
      },
    });
    assert(fullPayRes.statusCode === 201, 'Full payment of remaining ₹8000 recorded (HTTP 201)');

    const [feeAfterFull] = await query('SELECT * FROM student_fees WHERE id = ?', [createdFee.id]);
    assert(feeAfterFull[0].status === 'PAID', 'Fee status updated to PAID in MySQL');
    assert(parseFloat(feeAfterFull[0].amount_paid) === 14000, 'amount_paid matches net due (14000.00)');

    // -------------------------------------------------------------
    // 8. PAYMENT HISTORY & RECEIPT DETAILS
    // -------------------------------------------------------------
    console.log('\n--- 8. PAYMENT HISTORY & RECEIPTS ---');
    const payHistoryRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/payments?feeId=${createdFee.id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(payHistoryRes.statusCode === 200, 'GET /api/payments returns payment list (HTTP 200)');
    assert(payHistoryRes.body?.data?.length === 2, '2 payment transactions found for this fee bill');

    // Get individual receipt
    const receiptRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/payments/${partialPayData.id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(receiptRes.statusCode === 200, 'GET /api/payments/:id returns complete receipt details');
    const rData = receiptRes.body?.data;
    assert(rData.receipt_number === partialPayData.receipt_number, 'Receipt number matches');
    assert(rData.student_name && rData.bill_number, 'Receipt contains student_name and bill_number');
    assert(rData.previous_balance !== undefined && rData.remaining_balance !== undefined, 'Receipt contains previous and remaining balances');

    // -------------------------------------------------------------
    // 9. PENDING & OVERDUE FEE QUERIES
    // -------------------------------------------------------------
    console.log('\n--- 9. PENDING & OVERDUE FEES ---');
    const pendingFeesRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees?status=PENDING',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(pendingFeesRes.statusCode === 200, 'GET /api/fees?status=PENDING succeeds');

    const overdueFeesRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees?status=OVERDUE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(overdueFeesRes.statusCode === 200, 'GET /api/fees?status=OVERDUE succeeds');

    // -------------------------------------------------------------
    // 10. FOOD & ACCOMMODATION BILLING INTEGRATION
    // -------------------------------------------------------------
    console.log('\n--- 10. FOOD & ACCOMMODATION BILLING INTEGRATION ---');
    // Check fee_types table contains MESS_CHARGES and HOSTEL_RENT / ACCOMMODATION
    const [feeTypes] = await query('SELECT id, name FROM fee_types WHERE is_active = TRUE');
    const messFeeType = feeTypes.find(f => f.name.includes('MESS') || f.name.includes('FOOD'));
    const hostelFeeType = feeTypes.find(f => f.name.includes('HOSTEL') || f.name.includes('ACCOMMODATION') || f.name.includes('RENT'));

    assert(Boolean(messFeeType), 'Fee type for Mess/Food charges is active in database (ID: ' + messFeeType?.id + ')');
    assert(Boolean(hostelFeeType), 'Fee type for Hostel/Accommodation is active in database (ID: ' + hostelFeeType?.id + ')');

    // -------------------------------------------------------------
    // 11. FINANCIAL STATISTICS & REVENUE REPORTS
    // -------------------------------------------------------------
    console.log('\n--- 11. FINANCIAL STATISTICS & REVENUE REPORTS ---');
    const statsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/payments/statistics',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(statsRes.statusCode === 200, 'GET /api/payments/statistics returns financial dashboard stats (HTTP 200)');
    const sData = statsRes.body?.data;
    assert(sData && sData.totalRevenue !== undefined, 'Total Revenue metric present: ₹' + sData?.totalRevenue);
    assert(sData.todayCollection !== undefined, 'Today Collection metric present: ₹' + sData?.todayCollection);
    assert(sData.thisMonthCollection !== undefined, 'This Month Collection metric present: ₹' + sData?.thisMonthCollection);
    assert(sData.pendingFees !== undefined, 'Pending Fees metric present: ₹' + sData?.pendingFees);
    assert(sData.foodRevenue !== undefined, 'Food/Mess Revenue metric present: ₹' + sData?.foodRevenue);
    assert(sData.accommodationRevenue !== undefined, 'Accommodation Revenue metric present: ₹' + sData?.accommodationRevenue);
    assert(sData.paidStudentsCount !== undefined, 'Paid Students Count metric present: ' + sData?.paidStudentsCount);
    assert(sData.pendingStudentsCount !== undefined, 'Pending Students Count metric present: ' + sData?.pendingStudentsCount);
    assert(Array.isArray(sData.monthly_collection), 'Monthly collection trend array present');
    assert(Array.isArray(sData.fee_type_breakdown), 'Fee type category breakdown array present');

    // -------------------------------------------------------------
    // 12. STUDENT ISOLATION & SECURITY
    // -------------------------------------------------------------
    console.log('\n--- 12. STUDENT FINANCIAL ISOLATION ---');
    const studentFeeSummaryRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/fees/student/${testStudent.id}/summary`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(studentFeeSummaryRes.statusCode === 200, 'Student fee summary retrieved successfully');

    // Student querying their own fees list
    const studentOwnFees = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentOwnFees.statusCode === 200, 'Student can access their personal fees (HTTP 200)');

    // Student querying their own payments list
    const studentOwnPayments = await makeRequest(server, {
      method: 'GET',
      path: '/api/payments',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentOwnPayments.statusCode === 200, 'Student can access their personal payment history (HTTP 200)');

    // Unauthenticated request prevention
    const unauthRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/payments/statistics',
    });
    assert(unauthRes.statusCode === 401, 'Unauthenticated request blocked with HTTP 401 Unauthorized');

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('\n================================================================');
    console.log(`  STEP 21 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)  `);
    console.log('================================================================\n');
    process.exit(total > 0 && passed === total ? 0 : 1);
  }
}

runTests();
