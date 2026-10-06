import axiosClient from '../api/axiosClient';

/**
 * Fetch all hostels with optional search and filter parameters
 * @param {Object} params - { search, status, type }
 */
export async function getHostels(params = {}) {
  return await axiosClient.get('/hostels', { params });
}

/**
 * Fetch complete hostel details by ID including its rooms and occupancy
 * @param {number|string} id 
 */
export async function getHostelById(id) {
  return await axiosClient.get(`/hostels/${id}`);
}

/**
 * Create a new hostel block in MySQL
 * @param {Object} hostelData - { name, code, type, totalFloors, wardenId, address, contactPhone, status }
 */
export async function createHostel(hostelData) {
  return await axiosClient.post('/hostels', hostelData);
}

/**
 * Update an existing hostel record
 * @param {number|string} id 
 * @param {Object} hostelData 
 */
export async function updateHostel(id, hostelData) {
  return await axiosClient.put(`/hostels/${id}`, hostelData);
}

/**
 * Delete a hostel block safely (prevented if rooms have active allocations)
 * @param {number|string} id 
 */
export async function deleteHostel(id) {
  return await axiosClient.delete(`/hostels/${id}`);
}
