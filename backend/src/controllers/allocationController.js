const allocationService = require('../services/allocationService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');

/**
 * GET /api/allocations
 */
async function getAllAllocations(req, res, next) {
  try {
    const { page, limit, search, hostelId, roomId, status, academicYear, studentId } = req.query;

    // If role is STUDENT, restrict to student's own ID
    let targetStudentId = studentId;
    if (req.user?.role === 'STUDENT') {
      targetStudentId = req.user.studentId;
    }

    const result = await allocationService.getAllAllocations({
      page,
      limit,
      search,
      hostelId,
      roomId,
      status,
      academicYear,
      studentId: targetStudentId,
    });

    return res.status(200).json({
      success: true,
      data: result.allocations,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/allocations/available-rooms
 */
async function getAvailableRooms(req, res, next) {
  try {
    const { hostelId, roomType, floor } = req.query;
    const availableRooms = await allocationService.getAvailableRooms({
      hostelId,
      roomType,
      floor,
    });

    return sendSuccess(res, availableRooms, 'Available rooms retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/allocations/:id
 */
async function getAllocationById(req, res, next) {
  try {
    const allocationId = parseInt(req.params.id, 10);
    if (isNaN(allocationId)) {
      return sendError(res, 'Invalid allocation ID format', 400);
    }

    const allocation = await allocationService.getAllocationById(allocationId);

    // If student role, ensure it's their own allocation
    if (req.user?.role === 'STUDENT' && req.user.studentId !== allocation.student_id) {
      return sendError(res, 'Access denied: You may only view your own room allocation', 403);
    }

    return sendSuccess(res, allocation, 'Room allocation details retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/allocations
 */
async function createAllocation(req, res, next) {
  try {
    const {
      studentId,
      roomId,
      academicYear,
      allocatedFrom,
      allocatedTo,
      securityDeposit,
      remarks,
    } = req.body;

    const newAllocation = await allocationService.createAllocation({
      studentId: parseInt(studentId, 10),
      roomId: parseInt(roomId, 10),
      academicYear,
      allocatedFrom,
      allocatedTo,
      securityDeposit,
      remarks,
      allocatedBy: req.user?.id || null,
    });

    return sendSuccess(res, newAllocation, 'Student allocated to room successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/allocations/:id
 */
async function updateAllocation(req, res, next) {
  try {
    const allocationId = parseInt(req.params.id, 10);
    if (isNaN(allocationId)) {
      return sendError(res, 'Invalid allocation ID format', 400);
    }

    const updated = await allocationService.updateAllocation(allocationId, req.body);
    return sendSuccess(res, updated, 'Allocation record updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/allocations/:id
 */
async function deleteAllocation(req, res, next) {
  try {
    const allocationId = parseInt(req.params.id, 10);
    if (isNaN(allocationId)) {
      return sendError(res, 'Invalid allocation ID format', 400);
    }

    const result = await allocationService.deleteAllocation(allocationId);
    return sendSuccess(res, result, 'Room allocation cancelled successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllAllocations,
  getAvailableRooms,
  getAllocationById,
  createAllocation,
  updateAllocation,
  deleteAllocation,
};
