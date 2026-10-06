const { pool, query } = require('../config/database');

/**
 * Get all rooms with search, multiple filters, and real-time calculated occupancy
 */
async function getAllRooms({
  search = '',
  hostelId = '',
  floor = '',
  roomType = '',
  status = '',
  occupancy = '',
} = {}) {
  const whereClauses = [];
  const params = [];

  if (search && search.trim() !== '') {
    const searchParam = `%${search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(r.room_number) LIKE ? OR LOWER(h.name) LIKE ? OR LOWER(h.code) LIKE ?)');
    params.push(searchParam, searchParam, searchParam);
  }

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('r.hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  if (floor && floor.toString().trim() !== '') {
    whereClauses.push('r.floor = ?');
    params.push(parseInt(floor, 10));
  }

  if (roomType && roomType.trim() !== '') {
    whereClauses.push('r.room_type = ?');
    params.push(roomType.trim());
  }

  if (status && status.trim() !== '') {
    whereClauses.push('r.status = ?');
    params.push(status.trim());
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      r.id,
      r.hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      h.type AS hostel_type,
      r.room_number,
      r.floor,
      r.room_type,
      r.capacity,
      r.base_rent,
      r.amenities,
      r.status AS configured_status,
      r.created_at,
      r.updated_at,
      COALESCE(ra_count.active_allocs, 0) AS occupied_beds,
      (r.capacity - COALESCE(ra_count.active_allocs, 0)) AS available_beds,
      ROUND((COALESCE(ra_count.active_allocs, 0) / r.capacity) * 100, 1) AS occupancy_percentage,
      CASE 
        WHEN r.status = 'MAINTENANCE' THEN 'MAINTENANCE'
        WHEN r.status = 'RESERVED' THEN 'RESERVED'
        WHEN COALESCE(ra_count.active_allocs, 0) >= r.capacity THEN 'FULL'
        WHEN COALESCE(ra_count.active_allocs, 0) > 0 THEN 'PARTIAL'
        ELSE 'AVAILABLE'
      END AS calculated_status
    FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN (
      SELECT room_id, COUNT(*) AS active_allocs
      FROM room_allocations
      WHERE status = 'ACTIVE'
      GROUP BY room_id
    ) ra_count ON r.id = ra_count.room_id
    ${whereSQL}
    ORDER BY h.id ASC, r.floor ASC, r.room_number ASC
  `;

  const [rows] = await query(sql, params);

  // Parse amenities JSON if string
  const processedRows = (rows || []).map((row) => {
    let parsedAmenities = row.amenities;
    if (typeof row.amenities === 'string') {
      try {
        parsedAmenities = JSON.parse(row.amenities);
      } catch (e) {
        parsedAmenities = [];
      }
    }
    return {
      ...row,
      amenities: parsedAmenities || [],
    };
  });

  // Filter by calculated occupancy if requested (e.g., 'AVAILABLE', 'PARTIAL', 'FULL')
  if (occupancy && occupancy.trim() !== '') {
    const targetOccupancy = occupancy.trim().toUpperCase();
    return processedRows.filter((r) => r.calculated_status === targetOccupancy);
  }

  return processedRows;
}

/**
 * Get single room by ID with active resident students list
 */
async function getRoomById(id) {
  const sql = `
    SELECT 
      r.id,
      r.hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      h.type AS hostel_type,
      h.contact_phone AS hostel_phone,
      r.room_number,
      r.floor,
      r.room_type,
      r.capacity,
      r.base_rent,
      r.amenities,
      r.status AS configured_status,
      r.created_at,
      r.updated_at,
      COALESCE(ra_count.active_allocs, 0) AS occupied_beds,
      (r.capacity - COALESCE(ra_count.active_allocs, 0)) AS available_beds,
      ROUND((COALESCE(ra_count.active_allocs, 0) / r.capacity) * 100, 1) AS occupancy_percentage,
      CASE 
        WHEN r.status = 'MAINTENANCE' THEN 'MAINTENANCE'
        WHEN r.status = 'RESERVED' THEN 'RESERVED'
        WHEN COALESCE(ra_count.active_allocs, 0) >= r.capacity THEN 'FULL'
        WHEN COALESCE(ra_count.active_allocs, 0) > 0 THEN 'PARTIAL'
        ELSE 'AVAILABLE'
      END AS calculated_status
    FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN (
      SELECT room_id, COUNT(*) AS active_allocs
      FROM room_allocations
      WHERE status = 'ACTIVE'
      GROUP BY room_id
    ) ra_count ON r.id = ra_count.room_id
    WHERE r.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Room not found');
    error.statusCode = 404;
    throw error;
  }

  const room = rows[0];
  if (typeof room.amenities === 'string') {
    try {
      room.amenities = JSON.parse(room.amenities);
    } catch (e) {
      room.amenities = [];
    }
  }

  // Fetch current active residents allocated to this room
  const [residentRows] = await query(`
    SELECT 
      ra.id AS allocation_id,
      ra.student_id,
      s.roll_number,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      s.department,
      s.year_of_study,
      ra.academic_year,
      ra.allocated_from,
      ra.security_deposit,
      ra.status AS allocation_status,
      ra.remarks
    FROM room_allocations ra
    JOIN students s ON ra.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE ra.room_id = ? AND ra.status = 'ACTIVE'
    ORDER BY ra.allocated_from ASC
  `, [id]);

  room.residents = residentRows || [];
  return room;
}

/**
 * Create a new room in a hostel
 */
async function createRoom(data) {
  const {
    hostelId,
    roomNumber,
    floor = 1,
    roomType = 'DOUBLE',
    capacity = 2,
    baseRent = 0,
    amenities = [],
    status = 'AVAILABLE',
  } = data;

  const cleanRoomNumber = roomNumber.trim().toUpperCase();

  // 1. Verify hostel exists
  const [hostel] = await query('SELECT id, total_floors FROM hostels WHERE id = ?', [hostelId]);
  if (!hostel || hostel.length === 0) {
    const error = new Error('Selected hostel block does not exist');
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate floor
  if (parseInt(floor, 10) > hostel[0].total_floors) {
    const error = new Error(`Floor number ${floor} exceeds the hostel's total floors (${hostel[0].total_floors})`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Check duplicate room_number in the same hostel
  const [dup] = await query(
    'SELECT id FROM rooms WHERE hostel_id = ? AND UPPER(room_number) = ?',
    [hostelId, cleanRoomNumber]
  );
  if (dup.length > 0) {
    const error = new Error(`Room number "${cleanRoomNumber}" already exists in this hostel`);
    error.statusCode = 409;
    throw error;
  }

  // 4. Validate capacity
  const cap = parseInt(capacity, 10);
  if (isNaN(cap) || cap < 1) {
    const error = new Error('Room capacity must be at least 1');
    error.statusCode = 400;
    throw error;
  }

  const amenitiesJSON = Array.isArray(amenities) ? JSON.stringify(amenities) : JSON.stringify([]);

  const [result] = await query(
    `INSERT INTO rooms (hostel_id, room_number, floor, room_type, capacity, occupied_count, base_rent, amenities, status)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      parseInt(hostelId, 10),
      cleanRoomNumber,
      parseInt(floor, 10) || 1,
      roomType,
      cap,
      parseFloat(baseRent) || 0.00,
      amenitiesJSON,
      status,
    ]
  );

  return await getRoomById(result.insertId);
}

/**
 * Update room details with capacity and duplicate protection
 */
async function updateRoom(id, data) {
  // 1. Verify existence
  const [existing] = await query('SELECT id, hostel_id, room_number, capacity FROM rooms WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Room not found');
    error.statusCode = 404;
    throw error;
  }

  const current = existing[0];
  const targetHostelId = data.hostelId !== undefined ? parseInt(data.hostelId, 10) : current.hostel_id;
  const targetRoomNumber = data.roomNumber !== undefined ? data.roomNumber.trim().toUpperCase() : current.room_number;

  // 2. Check duplicate room number in target hostel if hostelId or roomNumber changed
  if (targetHostelId !== current.hostel_id || targetRoomNumber !== current.room_number) {
    const [dup] = await query(
      'SELECT id FROM rooms WHERE hostel_id = ? AND UPPER(room_number) = ? AND id != ?',
      [targetHostelId, targetRoomNumber, id]
    );
    if (dup.length > 0) {
      const error = new Error(`Room number "${targetRoomNumber}" already exists in this hostel`);
      error.statusCode = 409;
      throw error;
    }
  }

  // 3. Check active allocations if capacity is being changed
  if (data.capacity !== undefined) {
    const newCapacity = parseInt(data.capacity, 10);
    if (isNaN(newCapacity) || newCapacity < 1) {
      const error = new Error('Room capacity must be at least 1');
      error.statusCode = 400;
      throw error;
    }

    const [allocRows] = await query(
      'SELECT COUNT(*) AS active_count FROM room_allocations WHERE room_id = ? AND status = "ACTIVE"',
      [id]
    );
    const activeCount = allocRows[0]?.active_count || 0;

    if (newCapacity < activeCount) {
      const error = new Error(
        `Capacity cannot be reduced to ${newCapacity} because this room currently has ${activeCount} active student resident(s).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const updates = [];
  const params = [];

  if (data.hostelId !== undefined) {
    updates.push('hostel_id = ?');
    params.push(parseInt(data.hostelId, 10));
  }
  if (data.roomNumber !== undefined) {
    updates.push('room_number = ?');
    params.push(data.roomNumber.trim().toUpperCase());
  }
  if (data.floor !== undefined) {
    updates.push('floor = ?');
    params.push(parseInt(data.floor, 10));
  }
  if (data.roomType !== undefined) {
    updates.push('room_type = ?');
    params.push(data.roomType);
  }
  if (data.capacity !== undefined) {
    updates.push('capacity = ?');
    params.push(parseInt(data.capacity, 10));
  }
  if (data.baseRent !== undefined) {
    updates.push('base_rent = ?');
    params.push(parseFloat(data.baseRent));
  }
  if (data.amenities !== undefined) {
    updates.push('amenities = ?');
    params.push(Array.isArray(data.amenities) ? JSON.stringify(data.amenities) : JSON.stringify([]));
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return await getRoomById(id);
}

/**
 * Delete room safely
 */
async function deleteRoom(id) {
  // 1. Verify existence
  const [existing] = await query('SELECT id, room_number, hostel_id FROM rooms WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Room not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Check active allocations
  const [activeAllocs] = await query(
    'SELECT id FROM room_allocations WHERE room_id = ? AND status = "ACTIVE" LIMIT 1',
    [id]
  );
  if (activeAllocs.length > 0) {
    const error = new Error('Room cannot be deleted because it has active student resident allocations.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Check active student residents assigned current_room_id
  const [activeStudents] = await query(
    'SELECT id FROM students WHERE current_room_id = ? AND status = "ACTIVE" LIMIT 1',
    [id]
  );
  if (activeStudents.length > 0) {
    const error = new Error('Room cannot be deleted because students are currently assigned to this room.');
    error.statusCode = 400;
    throw error;
  }

  await query('DELETE FROM rooms WHERE id = ?', [id]);
  return { id, message: `Room "${existing[0].room_number}" deleted successfully.` };
}

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
