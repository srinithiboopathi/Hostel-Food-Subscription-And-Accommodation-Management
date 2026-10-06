const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'hostel_jwt_secret_key_production_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Generate JWT token with standard claims
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name,
    studentId: user.student_id || null,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Authenticate user with email and password against MySQL database
 */
async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Fetch user by email including student profile data if role is STUDENT
  const sql = `
    SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.phone, u.avatar_url, u.status,
           s.id AS student_id, s.roll_number, s.department, s.course, s.year_of_study
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    WHERE LOWER(u.email) = ?
    LIMIT 1
  `;

  const [users] = await query(sql, [normalizedEmail]);

  // 2. Constant-time protection / generic error
  if (!users || users.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const user = users[0];

  // 3. Check account status
  if (user.status !== 'ACTIVE') {
    const error = new Error(`Account is currently ${user.status.toLowerCase()}. Please contact administration.`);
    error.statusCode = 403;
    throw error;
  }

  // 4. Compare bcrypt password hash
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 5. Update last_login_at timestamp
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  // 6. Generate JWT token
  const token = generateToken(user);

  // 7. Format sanitized user object (never return password or password_hash)
  const safeUser = {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    avatarUrl: user.avatar_url || null,
  };

  if (user.student_id) {
    safeUser.studentDetails = {
      studentId: user.student_id,
      rollNumber: user.roll_number,
      department: user.department,
      course: user.course,
      yearOfStudy: user.year_of_study,
    };
  }

  return {
    token,
    user: safeUser,
  };
}

/**
 * Fetch authenticated user details from database
 */
async function getUserProfile(userId) {
  const sql = `
    SELECT u.id, u.full_name, u.email, u.role, u.phone, u.avatar_url, u.status, u.created_at, u.last_login_at,
           s.id AS student_id, s.roll_number, s.department, s.course, s.year_of_study,
           h.name AS hostel_name, r.room_number
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN hostels h ON s.current_hostel_id = h.id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    WHERE u.id = ?
    LIMIT 1
  `;

  const [rows] = await query(sql, [userId]);

  if (!rows || rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const user = rows[0];

  const safeProfile = {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    avatarUrl: user.avatar_url || null,
    status: user.status,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  };

  if (user.student_id) {
    safeProfile.studentDetails = {
      studentId: user.student_id,
      rollNumber: user.roll_number,
      department: user.department,
      course: user.course,
      yearOfStudy: user.year_of_study,
      hostelName: user.hostel_name || null,
      roomNumber: user.room_number || null,
    };
  }

  return safeProfile;
}

module.exports = {
  loginUser,
  getUserProfile,
  generateToken,
};
