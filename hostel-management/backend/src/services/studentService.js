const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/database');

/**
 * Get all students with search, filters, and pagination
 */
async function getAllStudents({
  page = 1,
  limit = 10,
  search = '',
  department = '',
  year = '',
  status = '',
  hostelId = '',
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const params = [];

  if (search && search.trim() !== '') {
    const searchParam = `%${search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(u.full_name) LIKE ? OR LOWER(s.roll_number) LIKE ? OR LOWER(u.email) LIKE ?)');
    params.push(searchParam, searchParam, searchParam);
  }

  if (department && department.trim() !== '') {
    whereClauses.push('s.department = ?');
    params.push(department.trim());
  }

  if (year && year.toString().trim() !== '') {
    whereClauses.push('s.year_of_study = ?');
    params.push(parseInt(year, 10));
  }

  if (status && status.trim() !== '') {
    whereClauses.push('s.status = ?');
    params.push(status.trim());
  }

  if (hostelId && hostelId.toString().trim() !== '') {
    whereClauses.push('s.current_hostel_id = ?');
    params.push(parseInt(hostelId, 10));
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Get total count
  const countSQL = `
    SELECT COUNT(*) AS total
    FROM students s
    JOIN users u ON s.user_id = u.id
    ${whereSQL}
  `;
  const [countRows] = await query(countSQL, params);
  const total = countRows[0]?.total || 0;

  // 2. Fetch paginated rows with user & hostel & room joins
  const dataSQL = `
    SELECT 
      s.id,
      s.user_id,
      s.roll_number,
      u.full_name AS name,
      u.email,
      u.phone,
      u.avatar_url,
      s.department,
      s.course,
      s.year_of_study,
      s.gender,
      s.dob,
      s.blood_group,
      s.guardian_name,
      s.guardian_phone,
      s.guardian_relation,
      s.permanent_address,
      s.admission_date,
      s.status,
      s.created_at,
      s.updated_at,
      h.id AS hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      r.id AS room_id,
      r.room_number,
      r.room_type,
      r.floor
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    ${whereSQL}
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limitNum, offset];
  const [rows] = await query(dataSQL, queryParams);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    students: rows,
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
 * Get student by ID with full accommodation, fee, and complaint summary
 */
async function getStudentById(id) {
  const sql = `
    SELECT 
      s.id,
      s.user_id,
      s.roll_number,
      u.full_name AS name,
      u.email,
      u.phone,
      u.avatar_url,
      u.status AS user_status,
      s.department,
      s.course,
      s.year_of_study,
      s.gender,
      s.dob,
      s.blood_group,
      s.guardian_name,
      s.guardian_phone,
      s.guardian_relation,
      s.permanent_address,
      s.admission_date,
      s.status,
      s.created_at,
      s.updated_at,
      h.id AS hostel_id,
      h.name AS hostel_name,
      h.code AS hostel_code,
      h.type AS hostel_type,
      r.id AS room_id,
      r.room_number,
      r.room_type,
      r.floor,
      r.base_rent,
      ra.id AS allocation_id,
      ra.academic_year AS allocation_year,
      ra.allocated_from,
      ra.allocated_to,
      ra.security_deposit,
      ra.status AS allocation_status
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.status = 'ACTIVE'
    WHERE s.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [id]);

  if (!rows || rows.length === 0) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const student = rows[0];

  // Fetch summary of recent fees
  const [feeRows] = await query(`
    SELECT sf.id, sf.bill_number, ft.name AS fee_type, sf.term_name, sf.amount_due, sf.amount_paid, sf.status, sf.due_date
    FROM student_fees sf
    JOIN fee_types ft ON sf.fee_type_id = ft.id
    WHERE sf.student_id = ?
    ORDER BY sf.due_date DESC
    LIMIT 5
  `, [id]);

  // Fetch summary of recent complaints
  const [complaintRows] = await query(`
    SELECT id, ticket_number, category, title, priority, status, created_at
    FROM complaints
    WHERE student_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [id]);

  student.feesSummary = feeRows || [];
  student.complaintsSummary = complaintRows || [];

  return student;
}

/**
 * Create a new student (atomic transaction in users + students)
 */
async function createStudent(data) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      name,
      email,
      password = 'Student@123',
      phone,
      rollNumber,
      department,
      course = 'B.Tech',
      yearOfStudy = 1,
      gender = 'MALE',
      dob,
      bloodGroup,
      guardianName,
      guardianPhone,
      guardianRelation = 'Parent',
      permanentAddress,
      admissionDate = new Date().toISOString().split('T')[0],
      hostelId = null,
      roomId = null,
      status = 'ACTIVE',
    } = data;

    const cleanEmail = email.trim().toLowerCase();
    const cleanRoll = rollNumber.trim().toUpperCase();

    // 1. Check duplicate email in users
    const [dupEmail] = await connection.query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (dupEmail.length > 0) {
      const error = new Error('A user with this email address already exists');
      error.statusCode = 409;
      throw error;
    }

    // 2. Check duplicate roll number in students
    const [dupRoll] = await connection.query('SELECT id FROM students WHERE UPPER(roll_number) = ?', [cleanRoll]);
    if (dupRoll.length > 0) {
      const error = new Error('A student with this roll number already exists');
      error.statusCode = 409;
      throw error;
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Insert into users table
    const [userRes] = await connection.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, status)
       VALUES (?, ?, ?, 'STUDENT', ?, 'ACTIVE')`,
      [name.trim(), cleanEmail, passwordHash, phone || null]
    );

    const userId = userRes.insertId;

    // 5. Insert into students table
    const [studentRes] = await connection.query(
      `INSERT INTO students (
        user_id, roll_number, department, course, year_of_study, gender, dob,
        blood_group, guardian_name, guardian_phone, guardian_relation, permanent_address,
        current_hostel_id, current_room_id, admission_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        cleanRoll,
        department.trim(),
        course.trim(),
        parseInt(yearOfStudy, 10) || 1,
        gender,
        dob || null,
        bloodGroup || null,
        guardianName.trim(),
        guardianPhone.trim(),
        guardianRelation.trim(),
        permanentAddress.trim(),
        hostelId ? parseInt(hostelId, 10) : null,
        roomId ? parseInt(roomId, 10) : null,
        admissionDate,
        status,
      ]
    );

    const studentId = studentRes.insertId;

    // 6. Create welcome notification
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Welcome to Hostel Portal', 'Your student profile has been created successfully. Roll No: ' ?, 'SYSTEM')`,
      [userId, cleanRoll]
    );

    await connection.commit();

    // Fetch and return the newly created student record
    return await getStudentById(studentId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Update student information
 */
async function updateStudent(id, data) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify student exists
    const [existing] = await connection.query(
      'SELECT id, user_id, roll_number FROM students WHERE id = ?',
      [id]
    );

    if (!existing || existing.length === 0) {
      const error = new Error('Student not found');
      error.statusCode = 404;
      throw error;
    }

    const studentRecord = existing[0];
    const userId = studentRecord.user_id;

    // 2. Check roll number collision if rollNumber is changed
    if (data.rollNumber && data.rollNumber.trim().toUpperCase() !== studentRecord.roll_number) {
      const cleanRoll = data.rollNumber.trim().toUpperCase();
      const [dupRoll] = await connection.query(
        'SELECT id FROM students WHERE UPPER(roll_number) = ? AND id != ?',
        [cleanRoll, id]
      );
      if (dupRoll.length > 0) {
        const error = new Error('Another student already exists with this roll number');
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Update users table fields (name, email, phone, status)
    const userUpdates = [];
    const userParams = [];

    if (data.name !== undefined) {
      userUpdates.push('full_name = ?');
      userParams.push(data.name.trim());
    }
    if (data.email !== undefined) {
      const cleanEmail = data.email.trim().toLowerCase();
      // check duplicate email
      const [dupEmail] = await connection.query('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [cleanEmail, userId]);
      if (dupEmail.length > 0) {
        const error = new Error('Another user already exists with this email address');
        error.statusCode = 409;
        throw error;
      }
      userUpdates.push('email = ?');
      userParams.push(cleanEmail);
    }
    if (data.phone !== undefined) {
      userUpdates.push('phone = ?');
      userParams.push(data.phone);
    }
    if (data.status !== undefined) {
      userUpdates.push('status = ?');
      userParams.push(data.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
    }

    if (userUpdates.length > 0) {
      userParams.push(userId);
      await connection.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    // 4. Update students table fields
    const studentUpdates = [];
    const studentParams = [];

    if (data.rollNumber !== undefined) {
      studentUpdates.push('roll_number = ?');
      studentParams.push(data.rollNumber.trim().toUpperCase());
    }
    if (data.department !== undefined) {
      studentUpdates.push('department = ?');
      studentParams.push(data.department.trim());
    }
    if (data.course !== undefined) {
      studentUpdates.push('course = ?');
      studentParams.push(data.course.trim());
    }
    if (data.yearOfStudy !== undefined) {
      studentUpdates.push('year_of_study = ?');
      studentParams.push(parseInt(data.yearOfStudy, 10));
    }
    if (data.gender !== undefined) {
      studentUpdates.push('gender = ?');
      studentParams.push(data.gender);
    }
    if (data.dob !== undefined) {
      studentUpdates.push('dob = ?');
      studentParams.push(data.dob || null);
    }
    if (data.bloodGroup !== undefined) {
      studentUpdates.push('blood_group = ?');
      studentParams.push(data.bloodGroup || null);
    }
    if (data.guardianName !== undefined) {
      studentUpdates.push('guardian_name = ?');
      studentParams.push(data.guardianName.trim());
    }
    if (data.guardianPhone !== undefined) {
      studentUpdates.push('guardian_phone = ?');
      studentParams.push(data.guardianPhone.trim());
    }
    if (data.guardianRelation !== undefined) {
      studentUpdates.push('guardian_relation = ?');
      studentParams.push(data.guardianRelation.trim());
    }
    if (data.permanentAddress !== undefined) {
      studentUpdates.push('permanent_address = ?');
      studentParams.push(data.permanentAddress.trim());
    }
    if (data.status !== undefined) {
      studentUpdates.push('status = ?');
      studentParams.push(data.status);
    }
    if (data.hostelId !== undefined) {
      studentUpdates.push('current_hostel_id = ?');
      studentParams.push(data.hostelId ? parseInt(data.hostelId, 10) : null);
    }
    if (data.roomId !== undefined) {
      studentUpdates.push('current_room_id = ?');
      studentParams.push(data.roomId ? parseInt(data.roomId, 10) : null);
    }

    if (studentUpdates.length > 0) {
      studentParams.push(id);
      await connection.query(`UPDATE students SET ${studentUpdates.join(', ')} WHERE id = ?`, studentParams);
    }

    await connection.commit();

    return await getStudentById(id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Deactivate a student (Soft deactivation: sets status to VACATED / INACTIVE)
 */
async function deactivateStudent(id, newStatus = 'VACATED') {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT id, user_id FROM students WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      const error = new Error('Student not found');
      error.statusCode = 404;
      throw error;
    }

    const userId = existing[0].user_id;

    // Update student status
    await connection.query('UPDATE students SET status = ? WHERE id = ?', [newStatus, id]);

    // Update user status
    await connection.query('UPDATE users SET status = "INACTIVE" WHERE id = ?', [userId]);

    // If room allocation was active, mark it vacated
    await connection.query(
      'UPDATE room_allocations SET status = "VACATED", vacated_at = NOW() WHERE student_id = ? AND status = "ACTIVE"',
      [id]
    );

    await connection.commit();
    return { id, status: newStatus, message: `Student status updated to ${newStatus}` };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deactivateStudent,
};
