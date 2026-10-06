const roomService = require('../services/roomService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * GET /api/rooms
 */
async function getAllRooms(req, res) {
  try {
    const { search, hostelId, floor, roomType, status, occupancy } = req.query;
    const rooms = await roomService.getAllRooms({
      search,
      hostelId,
      floor,
      roomType,
      status,
      occupancy,
    });
    return sendSuccess(res, rooms, 'Rooms retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/**
 * GET /api/rooms/:id
 */
async function getRoomById(req, res) {
  try {
    const { id } = req.params;
    const room = await roomService.getRoomById(id);
    return sendSuccess(res, room, 'Room details retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/**
 * POST /api/rooms
 */
async function createRoom(req, res) {
  try {
    const newRoom = await roomService.createRoom(req.body);
    return sendSuccess(res, newRoom, 'Room created successfully', 201);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/**
 * PUT /api/rooms/:id
 */
async function updateRoom(req, res) {
  try {
    const { id } = req.params;
    const updated = await roomService.updateRoom(id, req.body);
    return sendSuccess(res, updated, 'Room updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/**
 * DELETE /api/rooms/:id
 */
async function deleteRoom(req, res) {
  try {
    const { id } = req.params;
    const result = await roomService.deleteRoom(id);
    return sendSuccess(res, result, result.message || 'Room deleted successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
