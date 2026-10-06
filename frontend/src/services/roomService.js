import axiosClient from '../api/axiosClient';

/**
 * Fetch all rooms with search and filters (hostel, floor, roomType, status, occupancy)
 * @param {Object} params - { search, hostelId, floor, roomType, status, occupancy }
 */
export async function getRooms(params = {}) {
  return await axiosClient.get('/rooms', { params });
}

/**
 * Fetch single room by ID with resident students details
 * @param {number|string} id 
 */
export async function getRoomById(id) {
  return await axiosClient.get(`/rooms/${id}`);
}

/**
 * Create a new room in a hostel
 * @param {Object} roomData - { hostelId, roomNumber, floor, roomType, capacity, baseRent, amenities, status }
 */
export async function createRoom(roomData) {
  return await axiosClient.post('/rooms', roomData);
}

/**
 * Update room details (enforcing capacity >= occupied beds)
 * @param {number|string} id 
 * @param {Object} roomData 
 */
export async function updateRoom(id, roomData) {
  return await axiosClient.put(`/rooms/${id}`, roomData);
}

/**
 * Delete a room (prevented if active student resident allocations exist)
 * @param {number|string} id 
 */
export async function deleteRoom(id) {
  return await axiosClient.delete(`/rooms/${id}`);
}
