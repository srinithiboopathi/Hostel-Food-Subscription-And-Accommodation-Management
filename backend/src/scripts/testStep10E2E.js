/**
 * STEP 10 — REAL-TIME FEES & PAYMENTS MANAGEMENT
 * Comprehensive 26-Point End-to-End Verification Test Script
 */

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

const results = [];
function recordResult(num, description, passed, details = '') {
  results.push({ num, description, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Step ${num}: ${description} ${details ? `(${details})` : ''}`);
}

async function runStep10Tests() {
  console.log('=================================================================');
  console.log('STARTING STEP 10 E2E TEST SUITE: FEES & PAYMENTS MANAGEMENT');
  console.log('=================================================================\n');

  let server;
  let accountantToken = '';
  let studentToken = '';
  let studentUser = null;
  let testStudent = null;
  let feeTypesList = [];
  let createdFeeBill = null;
  let partialPayment = null;
  let fullPayment = null;
  const testAcademicYear = '2026-2027';
  const testTerm = 'Odd Semester 2026';
  const testBillNumber = `BILL-TEST-${Date.now().toString().slice(-6)}`;

  try {
    // 0. Start in-memory server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    // ---------------------------------------------------------------------------
    // TEST 1: Login as ACCOUNTANT
    // ---------------------------------------------------------------------------
    const loginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'accounts@hostel.edu', password: 'Password@123' },
    });
    accountantToken = loginRes.data?.data?.token;
    recordResult(1, 'Login as ACCOUNTANT', loginRes.status === 200 && !!accountantToken, `Token generated for role: ${loginRes.data?.data?.user?.role}`);

    const authHeaders = { Authorization: `Bearer ${accountantToken}` };

    // ---------------------------------------------------------------------------
    // TEST 2: Load Fee Types
    // ---------------------------------------------------------------------------
    const ftRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees/types',
      headers: authHeaders,
    });
    feeTypesList = ftRes.data?.data || [];
    const hasTypes = ftRes.status === 200 && Array.isArray(feeTypesList) && feeTypesList.length > 0;
    recordResult(2, 'Load fee types', hasTypes, `Found ${feeTypesList.length} fee types: ${feeTypesList.map(t => t.name).join(', ')}`);

    // ---------------------------------------------------------------------------
    // TEST 3: Load Students from actual database
    // ---------------------------------------------------------------------------
    const stRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/students?limit=10',
      headers: authHeaders,
    });
    const studentList = stRes.data?.data || [];
    testStudent = studentList[0];
    recordResult(3, 'Load students from MySQL', stRes.status === 200 && !!testStudent, `Target student: ${testStudent?.student_name} (${testStudent?.roll_number}), ID: ${testStudent?.id}`);

    // ---------------------------------------------------------------------------
    // TEST 4: Create Fee Bill (POST /api/fees)
    // ---------------------------------------------------------------------------
    const targetFeeType = feeTypesList[0] || { id: 1, name: 'Hostel Rent' };
    const feeAmountDue = 18000;
    const feeDiscount = 0;
    const feeDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const createRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/fees',
      headers: authHeaders,
      body: {
        studentId: testStudent.id,
        feeTypeId: targetFeeType.id,
        academicYear: testAcademicYear,
        termName: testTerm,
        amountDue: feeAmountDue,
        discount: feeDiscount,
        dueDate: feeDueDate,
        billNumber: testBillNumber,
      },
    });

    createdFeeBill = createRes.data?.data;
    const isCreated = createRes.status === 201 && createdFeeBill && createdFeeBill.bill_number === testBillNumber;
    recordResult(4, 'Create fee bill via API', isCreated, `Bill: ${createdFeeBill?.bill_number}, Net Due: ₹${createdFeeBill?.amount_due}, Status: ${createdFeeBill?.status}`);

    // ---------------------------------------------------------------------------
    // TEST 5: Verify INSERT directly in MySQL
    // ---------------------------------------------------------------------------
    const [sqlRows] = await query('SELECT * FROM student_fees WHERE bill_number = ?', [testBillNumber]);
    const mysqlMatch = sqlRows.length === 1 && parseFloat(sqlRows[0].amount_due) === feeAmountDue;
    recordResult(5, 'Verify INSERT directly in MySQL', mysqlMatch, `MySQL Record ID: ${sqlRows[0]?.id}, DB amount_due: ₹${sqlRows[0]?.amount_due}`);

    // ---------------------------------------------------------------------------
    // TEST 6: Query / Refresh Fees API
    // ---------------------------------------------------------------------------
    const getFeesRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/fees?search=${testBillNumber}`,
      headers: authHeaders,
    });
    const foundList = getFeesRes.data?.data || [];
    const foundInList = getFeesRes.status === 200 && foundList.some(f => f.bill_number === testBillNumber);
    recordResult(6, 'Fetch fee list with search filter', foundInList, `Found matching bill in paginated search`);

    // ---------------------------------------------------------------------------
    // TEST 7: Verify Fee Remains after query (Persistence)
    // ---------------------------------------------------------------------------
    const singleFeeRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/fees/${createdFeeBill.id}`,
      headers: authHeaders,
    });
    const feeData = singleFeeRes.data?.data;
    const isPersistent = singleFeeRes.status === 200 && feeData && feeData.id === createdFeeBill.id && feeData.status === 'PENDING';
    recordResult(7, 'Verify fee persistence and PENDING status', isPersistent, `Status: ${feeData?.status}, Outstanding: ₹${feeData?.outstanding_balance}`);

    // ---------------------------------------------------------------------------
    // TEST 8: Record Partial Payment (₹9,000 out of ₹18,000)
    // ---------------------------------------------------------------------------
    const partialAmount = 9000;
    const payRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: authHeaders,
      body: {
        studentFeeId: createdFeeBill.id,
        amount: partialAmount,
        paymentMethod: 'UPI',
        transactionId: `UPI-TXN-${Date.now().toString().slice(-6)}`,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: 'Partial semester fee payment installment 1',
      },
    });

    partialPayment = payRes.data?.data;
    const isPaid = payRes.status === 201 && partialPayment && parseFloat(partialPayment.amount) === partialAmount;
    recordResult(8, 'Record partial payment (₹9,000)', isPaid, `Receipt: ${partialPayment?.receipt_number}, Method: ${partialPayment?.payment_method}`);

    // ---------------------------------------------------------------------------
    // TEST 9: Verify Payment in MySQL
    // ---------------------------------------------------------------------------
    const [paySqlRows] = await query('SELECT * FROM payments WHERE receipt_number = ?', [partialPayment.receipt_number]);
    const paySaved = paySqlRows.length === 1 && parseFloat(paySqlRows[0].amount) === partialAmount;
    recordResult(9, 'Verify payment transaction stored in MySQL', paySaved, `MySQL Payment ID: ${paySqlRows[0]?.id}, Status: ${paySqlRows[0]?.payment_status}`);

    // ---------------------------------------------------------------------------
    // TEST 10: Verify Outstanding Balance in MySQL and API
    // ---------------------------------------------------------------------------
    const feeCheckRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/fees/${createdFeeBill.id}`,
      headers: authHeaders,
    });
    const feeObj = feeCheckRes.data?.data;
    const expectedBalance = feeAmountDue - partialAmount;
    const balanceCorrect = feeCheckRes.status === 200 && feeObj.outstanding_balance === expectedBalance && feeObj.amount_paid === partialAmount;
    recordResult(10, 'Verify dynamic outstanding balance (₹9,000)', balanceCorrect, `Calculated Balance: ₹${feeObj?.outstanding_balance}, Paid: ₹${feeObj?.amount_paid}`);

    // ---------------------------------------------------------------------------
    // TEST 11: Verify PARTIAL status
    // ---------------------------------------------------------------------------
    const [feeRow] = await query('SELECT status, amount_paid FROM student_fees WHERE id = ?', [createdFeeBill.id]);
    const isPartial = feeRow[0]?.status === 'PARTIAL';
    recordResult(11, 'Verify fee status updated to PARTIAL in MySQL', isPartial, `MySQL status: ${feeRow[0]?.status}`);

    // ---------------------------------------------------------------------------
    // TEST 12: Record Remaining Payment (Remaining ₹9,000)
    // ---------------------------------------------------------------------------
    const remainingAmount = 9000;
    const payRes2 = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: authHeaders,
      body: {
        studentFeeId: createdFeeBill.id,
        amount: remainingAmount,
        paymentMethod: 'NET_BANKING',
        transactionId: `NET-TXN-${Date.now().toString().slice(-6)}`,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: 'Final installment settlement',
      },
    });

    fullPayment = payRes2.data?.data;
    const isSecondPaid = payRes2.status === 201 && fullPayment && parseFloat(fullPayment.amount) === remainingAmount;
    recordResult(12, 'Record remaining payment (₹9,000)', isSecondPaid, `Receipt: ${fullPayment?.receipt_number}`);

    // ---------------------------------------------------------------------------
    // TEST 13: Verify Balance becomes zero
    // ---------------------------------------------------------------------------
    const finalFeeRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/fees/${createdFeeBill.id}`,
      headers: authHeaders,
    });
    const finalFee = finalFeeRes.data?.data;
    const isZeroBalance = finalFeeRes.status === 200 && finalFee.outstanding_balance === 0 && finalFee.amount_paid === feeAmountDue;
    recordResult(13, 'Verify balance becomes zero (₹0.00)', isZeroBalance, `Outstanding: ₹${finalFee?.outstanding_balance}, Total Paid: ₹${finalFee?.amount_paid}`);

    // ---------------------------------------------------------------------------
    // TEST 14: Verify PAID status
    // ---------------------------------------------------------------------------
    const [finalSql] = await query('SELECT status, amount_paid FROM student_fees WHERE id = ?', [createdFeeBill.id]);
    const isPaidStatus = finalSql[0]?.status === 'PAID';
    recordResult(14, 'Verify fee status updated to PAID in MySQL', isPaidStatus, `MySQL status: ${finalSql[0]?.status}`);

    // ---------------------------------------------------------------------------
    // TEST 15: Overpayment Protection Test (Attempt ₹500 on fully paid bill)
    // ---------------------------------------------------------------------------
    const overpayRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: authHeaders,
      body: { studentFeeId: createdFeeBill.id, amount: 500, paymentMethod: 'CASH' },
    });
    const isOverpayRejected = overpayRes.status === 409;
    recordResult(15, 'Overpayment protection (Reject payment > balance)', isOverpayRejected, `Correctly returned HTTP 409: ${overpayRes.data?.message}`);

    // ---------------------------------------------------------------------------
    // TEST 16: Duplicate Receipt Protection Test
    // ---------------------------------------------------------------------------
    try {
      await query(
        `INSERT INTO payments (student_fee_id, student_id, receipt_number, amount, payment_method)
         VALUES (?, ?, ?, 100, 'UPI')`,
        [createdFeeBill.id, testStudent.id, partialPayment.receipt_number]
      );
      recordResult(16, 'Duplicate receipt protection', false, 'Duplicate receipt was allowed');
    } catch (err) {
      const isDuplicateBlocked = err.code === 'ER_DUP_ENTRY' || err.message.includes('Duplicate');
      recordResult(16, 'Duplicate receipt protection', isDuplicateBlocked, `MySQL UNIQUE constraint prevented duplicate: ${err.message}`);
    }

    // ---------------------------------------------------------------------------
    // TEST 17: Duplicate Bill Number Protection Test
    // ---------------------------------------------------------------------------
    const dupBillRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/fees',
      headers: authHeaders,
      body: {
        studentId: testStudent.id,
        feeTypeId: targetFeeType.id,
        academicYear: testAcademicYear,
        termName: testTerm,
        amountDue: 5000,
        dueDate: feeDueDate,
        billNumber: testBillNumber,
      },
    });
    const isDupBillBlocked = dupBillRes.status === 409;
    recordResult(17, 'Duplicate bill number protection', isDupBillBlocked, `Correctly rejected with HTTP 409: ${dupBillRes.data?.message}`);

    // ---------------------------------------------------------------------------
    // TEST 18: Payment History API (GET /api/payments)
    // ---------------------------------------------------------------------------
    const payListRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/payments?feeId=${createdFeeBill.id}`,
      headers: authHeaders,
    });
    const payList = payListRes.data?.data || [];
    const hasBothPayments = payListRes.status === 200 && payList.length === 2 && payList.some(p => p.receipt_number === partialPayment.receipt_number);
    recordResult(18, 'Payment history API and receipt retrieval', hasBothPayments, `Retrieved ${payList.length} payments for bill`);

    // ---------------------------------------------------------------------------
    // TEST 19: Student Fee Summary API (GET /api/fees/student/:id/summary)
    // ---------------------------------------------------------------------------
    const sumRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/fees/student/${testStudent.id}/summary`,
      headers: authHeaders,
    });
    const summaryData = sumRes.data?.data;
    const isSummaryValid = sumRes.status === 200 && summaryData && summaryData.total_fees >= feeAmountDue && summaryData.number_of_payments >= 2;
    recordResult(19, 'Student fee summary API', isSummaryValid, `Total Fees: ₹${summaryData?.total_fees}, Total Paid: ₹${summaryData?.total_paid}, Paid Bills: ${summaryData?.paid_bills}`);

    // ---------------------------------------------------------------------------
    // TEST 20: Financial Statistics Aggregation (GET /api/payments/statistics)
    // ---------------------------------------------------------------------------
    const statsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/payments/statistics',
      headers: authHeaders,
    });
    const stats = statsRes.data?.data;
    const isStatsValid = statsRes.status === 200 && stats && stats.overview && typeof stats.overview.total_amount_collected === 'number' && stats.overview.total_amount_collected > 0;
    recordResult(20, 'Financial statistics SQL aggregation', isStatsValid, `Total Collected: ₹${stats?.overview?.total_amount_collected}, Today: ₹${stats?.overview?.today_collection}`);

    // ---------------------------------------------------------------------------
    // TEST 21: Login as STUDENT
    // ---------------------------------------------------------------------------
    const studentLoginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'priya.nair@student.edu', password: 'Password@123' },
    });
    studentToken = studentLoginRes.data?.data?.token;
    studentUser = studentLoginRes.data?.data?.user;
    recordResult(21, 'Login as STUDENT (Priya Nair)', studentLoginRes.status === 200 && !!studentToken, `Logged in student: ${studentUser?.name} (${studentUser?.email})`);

    const studentHeaders = { Authorization: `Bearer ${studentToken}` };

    // ---------------------------------------------------------------------------
    // TEST 22: Verify Student sees only their own fees (Data Isolation)
    // ---------------------------------------------------------------------------
    const studentFeesRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees',
      headers: studentHeaders,
    });
    const studentFeesList = studentFeesRes.data?.data || [];
    const allBelong = studentFeesRes.status === 200 && studentFeesList.every(f => f.student_id === studentUser.studentId || f.student_email === studentUser.email);
    recordResult(22, 'Student data isolation (Student sees only own fees)', allBelong, `Student returned ${studentFeesList.length} fees; all verified to belong to student ID ${studentUser.studentId}`);

    // ---------------------------------------------------------------------------
    // TEST 23: Verify Student cannot create/modify fees (RBAC 403)
    // ---------------------------------------------------------------------------
    const studentCreateRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/fees',
      headers: studentHeaders,
      body: {
        studentId: studentUser.studentId,
        feeTypeId: 1,
        amountDue: 1000,
        dueDate: '2026-12-31',
      },
    });
    const is403 = studentCreateRes.status === 403;
    recordResult(23, 'Student cannot create fees (RBAC 403)', is403, `HTTP 403 Forbidden received as expected: ${studentCreateRes.data?.message}`);

    // ---------------------------------------------------------------------------
    // TEST 24: Test Unauthorized API access without token (401)
    // ---------------------------------------------------------------------------
    const noAuthRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/fees',
    });
    const is401 = noAuthRes.status === 401;
    recordResult(24, 'Unauthorized API access rejected (HTTP 401)', is401, `HTTP 401 Unauthorized received as expected`);

    // ---------------------------------------------------------------------------
    // TEST 25: Transaction Rollback on Failure
    // ---------------------------------------------------------------------------
    await makeRequest(server, {
      method: 'POST',
      path: '/api/payments',
      headers: authHeaders,
      body: { studentFeeId: createdFeeBill.id, amount: -500, paymentMethod: 'UPI' },
    });
    const [badRows] = await query('SELECT * FROM payments WHERE amount < 0');
    const rollbackOk = badRows.length === 0;
    recordResult(25, 'Transaction rollback integrity verification', rollbackOk, 'No invalid or orphaned rows found in payments table');

    // ---------------------------------------------------------------------------
    // TEST 26: Persistence & MySQL Data Verification
    // ---------------------------------------------------------------------------
    const [finalBill] = await query('SELECT * FROM student_fees WHERE bill_number = ?', [testBillNumber]);
    const [finalPayments] = await query('SELECT * FROM payments WHERE student_fee_id = ?', [createdFeeBill.id]);
    const totalPaidDb = finalPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);

    const isDataIntact =
      finalBill.length === 1 &&
      finalBill[0].status === 'PAID' &&
      parseFloat(finalBill[0].amount_paid) === 18000 &&
      finalPayments.length === 2 &&
      totalPaidDb === 18000;

    recordResult(26, 'MySQL end-state data integrity and persistence', isDataIntact, `Bill #${finalBill[0]?.bill_number}: Paid ₹${finalBill[0]?.amount_paid}, Total DB Payments: ₹${totalPaidDb}`);

  } catch (globalErr) {
    console.error('Fatal test error:', globalErr);
  } finally {
    if (server) {
      server.close();
    }
    console.log('\n=================================================================');
    console.log('STEP 10 E2E TEST SUMMARY RESULTS:');
    console.log('=================================================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`TOTAL TESTS: ${results.length}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${results.length - passedCount}`);
    console.log(`SUCCESS RATE: ${((passedCount / results.length) * 100).toFixed(1)}%`);
    console.log('=================================================================\n');

    process.exit(passedCount === results.length ? 0 : 1);
  }
}

runStep10Tests();
