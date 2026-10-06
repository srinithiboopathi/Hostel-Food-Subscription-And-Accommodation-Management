const { pool, query } = require('../config/database');

/**
 * Get all hostels with search, filters, and real calculated occupancy
 */
async function getAllHostels({ search = '', status = '', type = '' } = {}) {
  const whereClauses = [];
  const params = [];

  if (search && search.trim() !== '') {
    const searchParam = `%${search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(h.name) LIKE ? OR LOWER(h.code) LIKE ? OR LOWER(h.address) LIKE ?)');
    params.push(searchParam, searchParam, searchParam);
  }

  if (status && status.trim() !== '') {
    whereClauses.push('h.status = ?');
    params.push(status.trim());
  }

  if (type && type.trim() !== '') {
    whereClauses.push('h.type = ?');
    params.push(type.trim());
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      h.id,
      h.name,
      h.code,
      h.type,
      h.total_floors,
      h.warden_id,
      u.full_name AS warden_name,
      u.email AS warden_email,
      u.phone AS warden_phone,
      h.address,
      h.contact_phone,
      h.status,
      h.created_at,
      h.updated_at,
      COALESCE(r_stats.total_rooms, 0) AS total_rooms,
      COALESCE(r_stats.total_capacity, 0) AS total_capacity,
      COALESCE(r_stats.occupied_beds, 0) AS occupied_beds,
      (COALESCE(r_stats.total_capacity, 0) - COALESCE(r_stats.occupied_beds, 0)) AS available_beds,
      ROUND(
        CASE 
          WHEN COALESCE(r_stats.total_capacity, 0) > 0 
          THEN (COALESCE(r_stats.occupied_beds, 0) / r_stats.total_capacity) * 100 
          ELSE 0 
        END, 1
      ) AS occupancy_percentage
    FROM hostels h
    LEFT JOIN users u ON h.warden_id = u.id
    LEFT JOIN (
      SELECT 
        r.hostel_id,
        COUNT(r.id) AS total_rooms,
        SUM(r.capacity) AS total_capacity,
        SUM(COALESCE(ra_count.active_allocs, 0)) AS occupied_beds
      FROM rooms r
      LEFT JOIN (
        SELECT room_id, COUNT(*) AS active_allocs
        FROM room_allocations
        WHERE status = 'ACTIVE'
        GROUP BY room_id
      ) ra_count ON r.id = ra_count.room_id
      GROUP BY r.hostel_id
    ) r_stats ON h.id = r_stats.hostel_id
    ${whereSQL}
    ORDER BY h.id ASC
  `;

  const [rows] = await query(sql, params);
  return rows || [];
}

/**
 * Get single hostel by ID with calculated stats and complete room breakdown
 */
async function getHostelById(id) {
  const sql = `
    SELECT 
      h.id,
      h.name,
      h.code,
      h.type,
      h.total_floors,
      h.warden_id,
      u.full_name AS warden_name,
      u.email AS warden_email,
      u.phone AS warden_phone,
      h.address,
      h.contact_phone,
      h.status,
      h.created_at,
      h.updated_at,
      COALESCE(r_stats.total_rooms, 0) AS total_rooms,
      COALESCE(r_stats.total_capacity, 0) AS total_capacity,
      COALESCE(r_stats.occupied_beds, 0) AS occupied_beds,
      (COALESCE(r_stats.total_capacity, 0) - COALESCE(r_stats.occupied_beds, 0)) AS available_beds,
      ROUND(
        CASE 
          WHEN COALESCE(r_stats.total_capacity, 0) > 0 
          THEN (COALESCE(r_stats.occupied_beds, 0) / r_stats.total_capacity) * 100 
          ELSE 0 
        END, 1
      ) AS occupancy_percentage
    FROM hostels h
    LEFT JOIN users u ON h.warden_id = u.id
    LEFT JOIN (
      SELECT 
        r.hostel_id,
        COUNT(r.id) AS total_rooms,
        SUM(r.capacity) AS total_capacity,
        SUM(COALESCE(ra_count.active_allocs, 0)) AS occupied_beds
      FROM rooms r
      LEFT JOIN (
        SELECT room_id, COUNT(*) AS active_allocs
        FROM room_allocations
        WHERE status = 'ACTIVE'
        GROUP BY room_id
      ) ra_count ON r.id = ra_count.room_id
      GROUP BY r.hostel_id
    ) r_stats ON h.id = r_stats.hostel_id
    WHERE h.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);
  if (!rows || rows.length === 0) {
    const error = new Error('Hostel not found');
    error.statusCode = 404;
    throw error;
  }

  const hostel = rows[0];

  // Fetch rooms in this hostel with their real occupancy
  const [roomRows] = await query(`
    SELECT 
      r.id,
      r.hostel_id,
      r.room_number,
      r.floor,
      r.room_type,
      r.capacity,
      r.base_rent,
      r.amenities,
      r.status AS configured_status,
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
    LEFT JOIN (
      SELECT room_id, COUNT(*) AS active_allocs
      FROM room_allocations
      WHERE status = 'ACTIVE'
      GROUP BY room_id
    ) ra_count ON r.id = ra_count.room_id
    WHERE r.hostel_id = ?
    ORDER BY r.floor ASC, r.room_number ASC
  `, [id]);

  hostel.rooms = roomRows || [];
  return hostel;
}

/**
 * Create a new hostel block
 */
async function createHostel(data) {
  const {
    name,
    code,
    type = 'BOYS',
    totalFloors = 1,
    wardenId = null,
    address = null,
    contactPhone = null,
    status = 'ACTIVE',
  } = data;

  const cleanName = name.trim();
  const cleanCode = code.trim().toUpperCase();

  // 1. Check duplicate name
  const [dupName] = await query('SELECT id FROM hostels WHERE LOWER(name) = ?', [cleanName.toLowerCase()]);
  if (dupName.length > 0) {
    const error = new Error('A hostel with this name already exists');
    error.statusCode = 409;
    throw error;
  }

  // 2. Check duplicate code
  const [dupCode] = await query('SELECT id FROM hostels WHERE UPPER(code) = ?', [cleanCode]);
  if (dupCode.length > 0) {
    const error = new Error('A hostel with this code already exists');
    error.statusCode = 409;
    throw error;
  }

  // 3. Verify warden exists if provided
  if (wardenId) {
    const [warden] = await query('SELECT id, role FROM users WHERE id = ?', [wardenId]);
    if (warden.length === 0) {
      const error = new Error('Warden user does not exist');
      error.statusCode = 400;
      throw error;
    }
  }

  const [result] = await query(
    `INSERT INTO hostels (name, code, type, total_floors, warden_id, address, contact_phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanName,
      cleanCode,
      type,
      parseInt(totalFloors, 10) || 1,
      wardenId ? parseInt(wardenId, 10) : null,
      address ? address.trim() : null,
      contactPhone ? contactPhone.trim() : null,
      status,
    ]
  );

  return await getHostelById(result.insertId);
}

/**
 * Update hostel details
 */
async function updateHostel(id, data) {
  // 1. Verify existence
  const [existing] = await query('SELECT id, name, code FROM hostels WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Hostel not found');
    error.statusCode = 404;
    throw error;
  }

  const current = existing[0];

  // 2. Check duplicate name if changed
  if (data.name && data.name.trim().toLowerCase() !== current.name.toLowerCase()) {
    const [dupName] = await query('SELECT id FROM hostels WHERE LOWER(name) = ? AND id != ?', [
      data.name.trim().toLowerCase(),
      id,
    ]);
    if (dupName.length > 0) {
      const error = new Error('Another hostel with this name already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  // 3. Check duplicate code if changed
  if (data.code && data.code.trim().toUpperCase() !== current.code.toUpperCase()) {
    const [dupCode] = await query('SELECT id FROM hostels WHERE UPPER(code) = ? AND id != ?', [
      data.code.trim().toUpperCase(),
      id,
    ]);
    if (dupCode.length > 0) {
      const error = new Error('Another hostel with this code already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  const updates = [];
  const params = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.code !== undefined) {
    updates.push('code = ?');
    params.push(data.code.trim().toUpperCase());
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    params.push(data.type);
  }
  if (data.totalFloors !== undefined) {
    updates.push('total_floors = ?');
    params.push(parseInt(data.totalFloors, 10));
  }
  if (data.wardenId !== undefined) {
    updates.push('warden_id = ?');
    params.push(data.wardenId ? parseInt(data.wardenId, 10) : null);
  }
  if (data.address !== undefined) {
    updates.push('address = ?');
    params.push(data.address ? data.address.trim() : null);
  }
  if (data.contactPhone !== undefined) {
    updates.push('contact_phone = ?');
    params.push(data.contactPhone ? data.contactPhone.trim() : null);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE hostels SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return await getHostelById(id);
}

/**
 * Delete / Deactivate hostel safely
 */
async function deleteHostel(id) {
  // 1. Verify existence
  const [existing] = await query('SELECT id, name FROM hostels WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    const error = new Error('Hostel not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Check if hostel has rooms with active student allocations
  const [activeAllocs] = await query(`
    SELECT ra.id
    FROM room_allocations ra
    JOIN rooms r ON ra.room_id = r.id
    WHERE r.hostel_id = ? AND ra.status = 'ACTIVE'
    LIMIT 1
  `, [id]);

  if (activeAllocs.length > 0) {
    const error = new Error('Hostel cannot be deleted because it contains rooms with active student allocations.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Check if active students are registered under this hostel
  const [activeStudents] = await query(
    'SELECT id FROM students WHERE current_hostel_id = ? AND status = "ACTIVE" LIMIT 1',
    [id]
  );
  if (activeStudents.length > 0) {
    const error = new Error('Hostel cannot be deleted because active students are assigned to this hostel.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Safe delete or deactivate: Delete hostel (cascades to empty rooms if any)
  await query('DELETE FROM hostels WHERE id = ?', [id]);

  return { id, message: `Hostel "${existing[0].name}" deleted successfully.` };
}

module.exports = {
  getAllHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
};
