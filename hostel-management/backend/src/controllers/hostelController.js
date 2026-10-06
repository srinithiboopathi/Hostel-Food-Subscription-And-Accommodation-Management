const hostelService = require('../services/hostelService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * GET /api/hostels
 */
async function getAllHostels(req, res) {
  try {
    const { search, status, type } = req.query;
    const hostels = await hostelService.getAllHostels({ search, status, type });
    return sendSuccess(res, hostels, 'Hostels retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/**
 * GET /api/hostels/:id
 */
async function getHostelById(req, res) {
  try {
    const { id } = req.params;
    const hostel = await hostelService.getHostelById(id);
    return sendSuccess(res, hostel, 'Hostel details retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/**
 * POST /api/hostels
 */
async function createHostel(req, res) {
  try {
    const newHostel = await hostelService.createHostel(req.body);
    return sendSuccess(res, newHostel, 'Hostel created successfully', 201);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/**
 * PUT /api/hostels/:id
 */
async function updateHostel(req, res) {
  try {
    const { id } = req.params;
    const updated = await hostelService.updateHostel(id, req.body);
    return sendSuccess(res, updated, 'Hostel updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/**
 * DELETE /api/hostels/:id
 */
async function deleteHostel(req, res) {
  try {
    const { id } = req.params;
    const result = await hostelService.deleteHostel(id);
    return sendSuccess(res, result, result.message || 'Hostel deleted successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getAllHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
};
