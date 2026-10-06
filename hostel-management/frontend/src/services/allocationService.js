import axiosClient from '../api/axiosClient';

/**
 * Fetch paginated room allocations with filters and search
 * @param {Object} params - { page, limit, search, hostelId, roomId, status, academicYear }
 */
export async function getAllocations(params = {}) {
  return await axiosClient.get('/allocations', { params });
}

/**
 * Fetch available rooms that currently have available bed capacity
 * @param {Object} params - { hostelId, roomType, floor }
 */
export async function getAvailableRooms(params = {}) {
  return await axiosClient.get('/allocations/available-rooms', { params });
}

/**
 * Fetch allocation details by ID
 * @param {number|string} id 
 */
export async function getAllocationById(id) {
  return await axiosClient.get(`/allocations/${id}`);
}

/**
 * Create a new Room Allocation in MySQL via transaction
 * @param {Object} allocationData - { studentId, roomId, academicYear, allocatedFrom, allocatedTo, securityDeposit, remarks }
 */
export async function createAllocation(allocationData) {
  return await axiosClient.post('/allocations', allocationData);
}

/**
 * Update allocation (room transfer, check-out/vacating, dates, remarks)
 * @param {number|string} id 
 * @param {Object} updateData 
 */
export async function updateAllocation(id, updateData) {
  return await axiosClient.put(`/allocations/${id}`, updateData);
}

/**
 * Cancel or vacate an allocation
 * @param {number|string} id 
 */
export async function deleteAllocation(id) {
  return await axiosClient.delete(`/allocations/${id}`);
}
