const { pool, query } = require('../config/database');
const notificationService = require('./notificationService');

/**
 * Get all room allocations with filters, search, and pagination
 */
async function getAllAllocations({
  page = 1,
  limit = 10,
  search = '',
  hostelId = '',
  roomId = '',
  status = '',
  academicYear = '',
  studentId = '',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (search && search.trim() !== '') {
    const searchParam = `%${search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(u.full_name) LIKE ? OR LOWER(s.roll_number) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(r.room_number) LIKE ?)');
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('r.hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  if (roomId && roomId.toString().trim() !== '') {
    whereClauses.push('ra.room_id = ?');
    params.push(parseInt(roomId, 10));
  }

  if (status && status.trim() !== '') {
    whereClauses.push('ra.status = ?');
    params.push(status.trim());
  }

  if (academicYear && academicYear.trim() !== '') {
    whereClauses.push('ra.academic_year = ?');
    params.push(academicYear.trim());
  }

  if (studentId && studentId.toString().trim() !== '') {
    whereClauses.push('ra.student_id = ?');
    params.push(parseInt(studentId, 10));
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Get total count
  const countSQL = `
    SELECT COUNT(*) AS total
    FROM room_allocations ra
    JOIN students s ON ra.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN rooms r ON ra.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    ${whereSQL}
  `;
  const [countRows] = await query(countSQL, params);
  const total = countRows[0]?.total || 0;

  // 2. Fetch paginated allocations
  const dataSQL = `
    SELECT 
      ra.id,
      ra.student_id,
      s.roll_number,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      s.department,
      s.course,
      s.year_of_study,
      s.gender,
      r.id AS room_id,
      r.room_number,
      r.floor,
      r.room_type,
      r.capacity AS room_capacity,
      r.base_rent,
      h.id AS hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      h.type AS hostel_type,
      ra.academic_year,
      ra.allocated_from,
      ra.allocated_to,
      ra.security_deposit,
      ra.status,
      ra.vacated_at,
      ra.remarks,
      ra.allocated_by,
      alloc_user.full_name AS allocated_by_name,
      ra.created_at,
      ra.updated_at
    FROM room_allocations ra
    JOIN students s ON ra.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN rooms r ON ra.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN users alloc_user ON ra.allocated_by = alloc_user.id
    ${whereSQL}
    ORDER BY ra.id DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSQL, queryParams);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    allocations: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    },
  };
}

/**
 * Get available rooms that currently have available capacity (available > 0)
 */
async function getAvailableRooms({ hostelId = '', roomType = '', floor = '' } = {}) {
  const whereClauses = ["r.status NOT IN ('MAINTENANCE', 'RESERVED')"];
  const params = [];

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('r.hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  if (roomType && roomType.trim() !== '') {
    whereClauses.push('r.room_type = ?');
    params.push(roomType.trim());
  }

  if (floor && floor.toString().trim() !== '') {
    whereClauses.push('r.floor = ?');
    params.push(parseInt(floor, 10));
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      r.id AS room_id,
      r.room_number,
      r.hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      h.type AS hostel_type,
      r.floor,
      r.room_type,
      r.capacity,
      r.base_rent,
      r.amenities,
      r.status AS configured_status,
      COALESCE(ra_count.active_allocs, 0) AS occupied,
      (r.capacity - COALESCE(ra_count.active_allocs, 0)) AS available,
      ROUND((COALESCE(ra_count.active_allocs, 0) / r.capacity) * 100, 1) AS occupancy_percentage,
      CASE 
        WHEN COALESCE(ra_count.active_allocs, 0) = 0 THEN 'AVAILABLE'
        ELSE 'PARTIAL'
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
    HAVING available > 0
    ORDER BY h.id ASC, r.floor ASC, r.room_number ASC
  `;

  const [rows] = await query(sql, params);

  return (rows || []).map((row) => {
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
}

/**
 * Get single allocation by ID
 */
async function getAllocationById(id) {
  const sql = `
    SELECT 
      ra.id,
      ra.student_id,
      s.roll_number,
      u.full_name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      s.department,
      s.course,
      s.year_of_study,
      s.gender,
      r.id AS room_id,
      r.room_number,
      r.floor,
      r.room_type,
      r.capacity AS room_capacity,
      r.base_rent,
      h.id AS hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      h.type AS hostel_type,
      ra.academic_year,
      ra.allocated_from,
      ra.allocated_to,
      ra.security_deposit,
      ra.status,
      ra.vacated_at,
      ra.remarks,
      ra.allocated_by,
      alloc_user.full_name AS allocated_by_name,
      ra.created_at,
      ra.updated_at
    FROM room_allocations ra
    JOIN students s ON ra.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN rooms r ON ra.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN users alloc_user ON ra.allocated_by = alloc_user.id
    WHERE ra.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Room allocation record not found');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
}

/**
 * Create a new Room Allocation using strict ACID Database Transaction and Concurrency Control
 */
async function createAllocation({
  studentId,
  roomId,
  academicYear,
  allocatedFrom,
  allocatedTo = null,
  securityDeposit = 0,
  remarks = null,
  allocatedBy = null,
}) {
  const connection = await pool.getConnection();

  try {
    // 1. Begin Transaction
    await connection.beginTransaction();

    // 2. Lock & Verify Student
    const [studentRows] = await connection.query(
      `SELECT s.id, s.user_id, s.roll_number, s.status, u.full_name, s.current_hostel_id, s.current_room_id 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ? 
       FOR UPDATE`,
      [studentId]
    );

    if (studentRows.length === 0) {
      const error = new Error('Student record not found in database');
      error.statusCode = 404;
      throw error;
    }

    const student = studentRows[0];
    if (student.status !== 'ACTIVE') {
      const error = new Error(`Cannot allocate room to student with status "${student.status}"`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Verify student does NOT already have an ACTIVE allocation (Student Validation)
    const [existingAllocs] = await connection.query(
      `SELECT ra.id, ra.room_id, r.room_number, h.name AS hostel_name
       FROM room_allocations ra
       JOIN rooms r ON ra.room_id = r.id
       JOIN hostels h ON r.hostel_id = h.id
       WHERE ra.student_id = ? AND ra.status = 'ACTIVE'
       FOR UPDATE`,
      [studentId]
    );

    if (existingAllocs.length > 0) {
      const active = existingAllocs[0];
      const error = new Error(
        `Student already has an active room allocation in Room ${active.room_number} (${active.hostel_name}). Transfer or vacate the student first.`
      );
      error.statusCode = 409;
      throw error;
    }

    // 4. Lock & Verify Room and Hostel
    const [roomRows] = await connection.query(
      `SELECT r.id, r.hostel_id, r.room_number, r.capacity, r.status, h.name AS hostel_name
       FROM rooms r
       JOIN hostels h ON r.hostel_id = h.id
       WHERE r.id = ?
       FOR UPDATE`,
      [roomId]
    );

    if (roomRows.length === 0) {
      const error = new Error('Selected room does not exist');
      error.statusCode = 404;
      throw error;
    }

    const room = roomRows[0];

    if (room.status === 'MAINTENANCE') {
      const error = new Error(`Room ${room.room_number} is currently under MAINTENANCE and cannot accept allocations.`);
      error.statusCode = 400;
      throw error;
    }

    if (room.status === 'RESERVED') {
      const error = new Error(`Room ${room.room_number} is currently RESERVED.`);
      error.statusCode = 400;
      throw error;
    }

    // 5. Count current ACTIVE allocations for this room with FOR UPDATE lock (Concurrency Safety)
    const [allocCountRows] = await connection.query(
      `SELECT COUNT(*) AS active_count 
       FROM room_allocations 
       WHERE room_id = ? AND status = 'ACTIVE' 
       FOR UPDATE`,
      [roomId]
    );

    const currentOccupied = allocCountRows[0]?.active_count || 0;

    // 6. Compare with room capacity
    if (currentOccupied >= room.capacity) {
      const error = new Error(
        `Room ${room.room_number} (${room.hostel_name}) is full. Capacity is ${room.capacity}, currently occupied: ${currentOccupied}.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 7. Format Dates & Academic Year
    const cleanAcademicYear = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const cleanAllocatedFrom = allocatedFrom || new Date().toISOString().split('T')[0];

    // 8. Insert new allocation
    const [insertResult] = await connection.query(
      `INSERT INTO room_allocations 
       (student_id, room_id, academic_year, allocated_from, allocated_to, security_deposit, status, allocated_by, remarks)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [
        studentId,
        roomId,
        cleanAcademicYear,
        cleanAllocatedFrom,
        allocatedTo || null,
        parseFloat(securityDeposit) || 0.0,
        allocatedBy || null,
        remarks ? remarks.trim() : null,
      ]
    );

    const newAllocationId = insertResult.insertId;

    // 9. Update Student record: set current_hostel_id and current_room_id
    await connection.query(
      `UPDATE students 
       SET current_hostel_id = ?, current_room_id = ?, status = 'ACTIVE' 
       WHERE id = ?`,
      [room.hostel_id, room.id, studentId]
    );

    // 10. Update Room occupied_count and status consistency
    const newOccupiedCount = currentOccupied + 1;
    const newRoomStatus = newOccupiedCount >= room.capacity ? 'OCCUPIED' : 'AVAILABLE';
    await connection.query(
      `UPDATE rooms 
       SET occupied_count = ?, 
           status = CASE WHEN status IN ('MAINTENANCE', 'RESERVED') THEN status ELSE ? END 
       WHERE id = ?`,
      [newOccupiedCount, newRoomStatus, room.id]
    );

    // AUTOMATIC NOTIFICATION: Notify student of room allocation
    try {
      const [studentRows] = await connection.query(
        'SELECT user_id FROM students WHERE id = ?',
        [studentId]
      );
      if (studentRows && studentRows.length > 0) {
        await notificationService.createNotification({
          userId: studentRows[0].user_id,
          title: 'Room Allocated',
          message: `You have been allocated Room ${room.room_number} in ${room.hostel_name}.`,
          type: 'ROOM',
          relatedEntityType: 'ROOM_ALLOCATION',
          relatedEntityId: newAllocationId,
          link: '/allocations',
          connection,
        });
      }
    } catch (notifErr) {
      console.warn('Could not dispatch room allocation notification:', notifErr.message);
    }

    // 11. Commit Transaction
    await connection.commit();

    // Release connection
    connection.release();

    // Fetch and return the populated allocation record
    return await getAllocationById(newAllocationId);
  } catch (error) {
    // Rollback on any failure
    await connection.rollback();
    connection.release();
    throw error;
  }
}

/**
 * Update an Allocation (Support Check-out / Vacate, Remarks, Dates, or Room Transfer)
 */
async function updateAllocation(id, updateData) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock & Fetch existing allocation
    const [existingRows] = await connection.query(
      `SELECT ra.*, r.hostel_id, r.capacity, r.room_number, s.id AS student_id, s.user_id
       FROM room_allocations ra
       JOIN rooms r ON ra.room_id = r.id
       JOIN students s ON ra.student_id = s.id
       WHERE ra.id = ?
       FOR UPDATE`,
      [id]
    );

    if (existingRows.length === 0) {
      const error = new Error('Allocation record not found');
      error.statusCode = 404;
      throw error;
    }

    const currentAlloc = existingRows[0];
    const targetStatus = updateData.status !== undefined ? updateData.status : currentAlloc.status;
    const targetRoomId = updateData.roomId !== undefined ? parseInt(updateData.roomId, 10) : currentAlloc.room_id;
    const isTransfer = targetRoomId !== currentAlloc.room_id && targetStatus === 'ACTIVE';
    let newRoom = null;

    // 2. Handle Room Transfer (if targetRoomId is different and status is ACTIVE)
    if (isTransfer) {
      // Check new room availability
      const [newRoomRows] = await connection.query(
        `SELECT r.id, r.hostel_id, r.room_number, r.capacity, r.status, h.name AS hostel_name
         FROM rooms r
         JOIN hostels h ON r.hostel_id = h.id
         WHERE r.id = ?
         FOR UPDATE`,
        [targetRoomId]
      );

      if (newRoomRows.length === 0) {
        const error = new Error('Target transfer room does not exist');
        error.statusCode = 404;
        throw error;
      }

      newRoom = newRoomRows[0];
      if (newRoom.status === 'MAINTENANCE' || newRoom.status === 'RESERVED') {
        const error = new Error(`Target room ${newRoom.room_number} is under ${newRoom.status} and cannot accept transfers.`);
        error.statusCode = 400;
        throw error;
      }

      // Count active allocations in target room
      const [newRoomCount] = await connection.query(
        `SELECT COUNT(*) AS active_count 
         FROM room_allocations 
         WHERE room_id = ? AND status = 'ACTIVE' AND id != ?
         FOR UPDATE`,
        [targetRoomId, id]
      );

      const newOccupied = newRoomCount[0]?.active_count || 0;
      if (newOccupied >= newRoom.capacity) {
        const error = new Error(`Target room ${newRoom.room_number} is full (${newOccupied}/${newRoom.capacity}).`);
        error.statusCode = 400;
        throw error;
      }

      // Update student table to new hostel & room
      await connection.query(
        `UPDATE students SET current_hostel_id = ?, current_room_id = ? WHERE id = ?`,
        [newRoom.hostel_id, newRoom.id, currentAlloc.student_id]
      );

      // Recalculate old room
      await connection.query(
        `UPDATE rooms 
         SET occupied_count = (SELECT COUNT(*) FROM room_allocations WHERE room_id = ? AND status = 'ACTIVE' AND id != ?),
             status = CASE WHEN status = 'OCCUPIED' THEN 'AVAILABLE' ELSE status END
         WHERE id = ?`,
        [currentAlloc.room_id, id, currentAlloc.room_id]
      );

      // Update new room count
      await connection.query(
        `UPDATE rooms 
         SET occupied_count = ?, 
             status = CASE WHEN ? >= capacity AND status != 'MAINTENANCE' THEN 'OCCUPIED' ELSE status END 
         WHERE id = ?`,
        [newOccupied + 1, newOccupied + 1, newRoom.id]
      );
    }

    // 3. Handle Check-Out / Vacating
    let vacatedAt = currentAlloc.vacated_at;
    if ((targetStatus === 'VACATED' || targetStatus === 'CANCELLED') && currentAlloc.status === 'ACTIVE') {
      vacatedAt = new Date();

      // Clear student's active room and hostel reference
      await connection.query(
        `UPDATE students SET current_hostel_id = NULL, current_room_id = NULL WHERE id = ?`,
        [currentAlloc.student_id]
      );

      // Decrement/Recalculate occupied room count
      await connection.query(
        `UPDATE rooms 
         SET occupied_count = GREATEST(0, (SELECT COUNT(*) FROM room_allocations WHERE room_id = ? AND status = 'ACTIVE' AND id != ?)),
             status = CASE WHEN status = 'OCCUPIED' THEN 'AVAILABLE' ELSE status END
         WHERE id = ?`,
        [currentAlloc.room_id, id, currentAlloc.room_id]
      );
    }

    // 4. Update the room_allocations row
    const updates = [];
    const params = [];

    if (updateData.roomId !== undefined) {
      updates.push('room_id = ?');
      params.push(targetRoomId);
    }
    if (updateData.academicYear !== undefined) {
      updates.push('academic_year = ?');
      params.push(updateData.academicYear);
    }
    if (updateData.allocatedFrom !== undefined) {
      updates.push('allocated_from = ?');
      params.push(updateData.allocatedFrom);
    }
    if (updateData.allocatedTo !== undefined) {
      updates.push('allocated_to = ?');
      params.push(updateData.allocatedTo || null);
    }
    if (updateData.securityDeposit !== undefined) {
      updates.push('security_deposit = ?');
      params.push(parseFloat(updateData.securityDeposit) || 0.0);
    }
    if (updateData.status !== undefined) {
      updates.push('status = ?');
      params.push(targetStatus);
    }
    if (vacatedAt !== currentAlloc.vacated_at) {
      updates.push('vacated_at = ?');
      params.push(vacatedAt);
    }
    if (updateData.remarks !== undefined) {
      updates.push('remarks = ?');
      params.push(updateData.remarks);
    }

    if (updates.length > 0) {
      params.push(id);
      await connection.query(`UPDATE room_allocations SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // AUTOMATIC NOTIFICATION: Notify student of room transfer / check-out
    try {
      if (isTransfer && newRoom) {
        await notificationService.createNotification({
          userId: currentAlloc.user_id,
          title: 'Room Transferred',
          message: `You have been transferred to Room ${newRoom.room_number} in ${newRoom.hostel_name}.`,
          type: 'ROOM',
          relatedEntityType: 'ROOM_ALLOCATION',
          relatedEntityId: id,
          link: '/allocations',
          connection,
        });
      } else if ((targetStatus === 'VACATED' || targetStatus === 'CANCELLED') && currentAlloc.status === 'ACTIVE') {
        await notificationService.createNotification({
          userId: currentAlloc.user_id,
          title: 'Room Check-Out Completed',
          message: `Your check-out from Room ${currentAlloc.room_number} has been recorded.`,
          type: 'ROOM',
          relatedEntityType: 'ROOM_ALLOCATION',
          relatedEntityId: id,
          link: '/allocations',
          connection,
        });
      }
    } catch (notifErr) {
      console.warn('Could not dispatch allocation update notification:', notifErr.message);
    }

    await connection.commit();
    connection.release();

    return await getAllocationById(id);
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

/**
 * Delete or Cancel Allocation (Preserves history by marking as CANCELLED/VACATED)
 */
async function deleteAllocation(id) {
  return await updateAllocation(id, {
    status: 'CANCELLED',
    remarks: 'Allocation cancelled by administrator',
  });
}

module.exports = {
  getAllAllocations,
  getAvailableRooms,
  getAllocationById,
  createAllocation,
  updateAllocation,
  deleteAllocation,
};
