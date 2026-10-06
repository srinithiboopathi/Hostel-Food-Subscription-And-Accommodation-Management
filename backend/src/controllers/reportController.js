const reportService = require('../services/reportService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Helper to handle CSV format streaming or JSON response
 */
function handleReportResponse(res, result, format, filename, columnMappings) {
  if (format === 'csv') {
    const csvContent = reportService.convertToCsv(result.records || result, columnMappings);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  }

  return sendSuccess(res, result, 'Report generated successfully');
}

/**
 * 1. Students Report
 */
async function getStudentReport(req, res) {
  try {
    const result = await reportService.getStudentReport(req.query, req.user);
    const columns = {
      roll_number: 'Roll Number',
      student_name: 'Student Name',
      department: 'Department',
      year_of_study: 'Year',
      hostel_name: 'Hostel',
      room_number: 'Room',
      email: 'Email',
      phone: 'Phone',
      status: 'Status',
    };
    return handleReportResponse(res, result, req.query.format, 'students-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate student report', 500);
  }
}

/**
 * 2. Room & Occupancy Report
 */
async function getRoomReport(req, res) {
  try {
    const result = await reportService.getRoomReport(req.query, req.user);
    const columns = {
      hostel_name: 'Hostel Name',
      room_number: 'Room Number',
      floor: 'Floor',
      room_type: 'Room Type',
      capacity: 'Capacity',
      occupied_count: 'Occupied',
      available_beds: 'Available',
      base_rent: 'Base Rent (₹)',
      status: 'Status',
      occupancy_status: 'Occupancy Status',
    };
    return handleReportResponse(res, result, req.query.format, 'rooms-occupancy-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate room report', 500);
  }
}

/**
 * 3. Room Allocation Report
 */
async function getAllocationReport(req, res) {
  try {
    const result = await reportService.getAllocationReport(req.query, req.user);
    const columns = {
      student_name: 'Student Name',
      roll_number: 'Roll Number',
      department: 'Department',
      hostel_name: 'Hostel',
      room_number: 'Room Number',
      academic_year: 'Academic Year',
      allocated_from: 'Allocated From',
      allocated_to: 'Allocated To',
      security_deposit: 'Security Deposit',
      status: 'Status',
      allocated_by_name: 'Allocated By',
    };
    return handleReportResponse(res, result, req.query.format, 'allocations-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate allocation report', 500);
  }
}

/**
 * 4. Food & Meal Attendance Report
 */
async function getMealReport(req, res) {
  try {
    const result = await reportService.getMealReport(req.query, req.user);
    const columns = {
      meal_date: 'Meal Date',
      meal_type: 'Meal Type',
      student_name: 'Student Name',
      roll_number: 'Roll Number',
      status: 'Attendance Status',
      special_item: 'Special Item',
      remarks: 'Remarks',
      marked_by_name: 'Marked By',
    };
    return handleReportResponse(res, result, req.query.format, 'meals-attendance-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate meal attendance report', 500);
  }
}

/**
 * 5. Food Menu Report
 */
async function getMenuReport(req, res) {
  try {
    const result = await reportService.getMenuReport(req.query);
    const columns = {
      day_of_week: 'Day of Week',
      meal_type: 'Meal Type',
      start_time: 'Start Time',
      end_time: 'End Time',
      items_description: 'Menu Items',
      special_item: 'Special Item',
      calories_est: 'Estimated Calories',
      is_active: 'Active Status',
    };
    return handleReportResponse(res, result, req.query.format, 'food-menu-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate food menu report', 500);
  }
}

/**
 * 6. Fees Report
 */
async function getFeeReport(req, res) {
  try {
    const result = await reportService.getFeeReport(req.query, req.user);
    const columns = {
      bill_number: 'Bill Number',
      student_name: 'Student Name',
      roll_number: 'Roll Number',
      fee_type_name: 'Fee Type',
      term_name: 'Term',
      academic_year: 'Academic Year',
      amount_due: 'Amount Due (₹)',
      amount_paid: 'Amount Paid (₹)',
      balance_pending: 'Balance Pending (₹)',
      discount: 'Discount',
      status: 'Status',
      due_date: 'Due Date',
    };
    return handleReportResponse(res, result, req.query.format, 'fees-dues-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate fees report', 500);
  }
}

/**
 * 7. Payment Report
 */
async function getPaymentReport(req, res) {
  try {
    const result = await reportService.getPaymentReport(req.query, req.user);
    const columns = {
      receipt_number: 'Receipt Number',
      transaction_id: 'Transaction ID',
      student_name: 'Student Name',
      roll_number: 'Roll Number',
      bill_number: 'Bill Number',
      amount: 'Amount (₹)',
      payment_method: 'Payment Method',
      payment_date: 'Payment Date',
      payment_status: 'Payment Status',
      collected_by_name: 'Collected By',
    };
    return handleReportResponse(res, result, req.query.format, 'payments-ledger-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate payment report', 500);
  }
}

/**
 * 8. Complaint Report
 */
async function getComplaintReport(req, res) {
  try {
    const result = await reportService.getComplaintReport(req.query, req.user);
    const columns = {
      ticket_number: 'Ticket Number',
      student_name: 'Student Name',
      roll_number: 'Roll Number',
      hostel_name: 'Hostel',
      room_number: 'Room',
      category: 'Category',
      title: 'Title',
      priority: 'Priority',
      status: 'Status',
      assigned_to_name: 'Assigned To',
      created_at: 'Reported At',
      updated_at: 'Last Updated',
    };
    return handleReportResponse(res, result, req.query.format, 'complaints-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate complaint report', 500);
  }
}

/**
 * 9. Leave Report
 */
async function getLeaveReport(req, res) {
  try {
    const result = await reportService.getLeaveReport(req.query, req.user);
    const columns = {
      student_name: 'Student Name',
      roll_number: 'Roll Number',
      leave_type: 'Leave Type',
      start_date: 'Start Date',
      end_date: 'End Date',
      reason: 'Reason',
      destination_address: 'Destination Address',
      emergency_contact: 'Emergency Contact',
      status: 'Status',
      reviewed_by_name: 'Reviewed By',
      review_remarks: 'Review Remarks',
      actual_return_time: 'Return Time',
    };
    return handleReportResponse(res, result, req.query.format, 'leaves-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate leave report', 500);
  }
}

/**
 * 10. Visitor Report
 */
async function getVisitorReport(req, res) {
  try {
    const result = await reportService.getVisitorReport(req.query, req.user);
    const columns = {
      visitor_name: 'Visitor Name',
      relationship: 'Relationship',
      phone_number: 'Phone Number',
      student_name: 'Student Visited',
      roll_number: 'Roll Number',
      purpose: 'Purpose of Visit',
      check_in_time: 'Check In Time',
      check_out_time: 'Check Out Time',
      status: 'Status',
      approved_by_name: 'Approved By',
    };
    return handleReportResponse(res, result, req.query.format, 'visitors-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate visitor report', 500);
  }
}

/**
 * 11. Notification Report
 */
async function getNotificationReport(req, res) {
  try {
    const result = await reportService.getNotificationReport(req.query, req.user);
    const columns = {
      user_name: 'Recipient Name',
      email: 'Email',
      role: 'Role',
      title: 'Title',
      message: 'Message',
      type: 'Type',
      is_read: 'Is Read',
      created_at: 'Date',
    };
    return handleReportResponse(res, result, req.query.format, 'notifications-report', columns);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate notification report', 500);
  }
}

/**
 * 12. Summary Consolidated Report
 */
async function getSummaryReport(req, res) {
  try {
    const result = await reportService.getReportSummary();
    return sendSuccess(res, result, 'Consolidated summary report generated successfully');
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate summary report', 500);
  }
}

module.exports = {
  getStudentReport,
  getRoomReport,
  getAllocationReport,
  getMealReport,
  getMenuReport,
  getFeeReport,
  getPaymentReport,
  getComplaintReport,
  getLeaveReport,
  getVisitorReport,
  getNotificationReport,
  getSummaryReport,
};
