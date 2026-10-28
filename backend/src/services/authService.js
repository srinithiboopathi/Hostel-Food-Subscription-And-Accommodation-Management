const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const tokenHelper = require('../utils/tokenHelper');

const knownDemoPasswords = new Set([
  'Password@123',
  'Admin@123',
  'Warden@123',
  'Mess@123',
  'Accountant@123',
]);

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

  return tokenHelper.generateToken(payload);
}

/**
 * Authenticate user with email or roll number and password against MySQL database
 */
async function loginUser(identifier, password, requiredRole = null) {
  const cleanEmail = (identifier || '').trim().toLowerCase();
  const cleanRoll = (identifier || '').trim().toUpperCase();

  // 1. Fetch user by email OR student roll_number including student profile data if role is STUDENT
  const sql = `
    SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.phone, u.avatar_url, u.status,
           s.id AS student_id, s.roll_number, s.department, s.course, s.year_of_study
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    WHERE LOWER(u.email) = ? OR UPPER(s.roll_number) = ?
    LIMIT 1
  `;

  const [users] = await query(sql, [cleanEmail, cleanRoll]);

  // 2. Constant-time protection / generic error
  if (!users || users.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const user = users[0];

  if (
    process.env.NODE_ENV === 'production' &&
    user.role !== 'STUDENT' &&
    knownDemoPasswords.has(password)
  ) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

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

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const studentProfileRequired = allowedRoles.includes('STUDENT');
    if (
      !allowedRoles.includes(user.role) ||
      (studentProfileRequired && user.role === 'STUDENT' && !user.student_id)
    ) {
      const error = new Error(
        studentProfileRequired ? 'Invalid student ID or password' : 'Invalid email or password'
      );
      error.statusCode = 401;
      throw error;
    }
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

/**
 * Register a new student and generate authentication token
 */
async function registerStudent(data) {
  const studentService = require('./studentService');
  if (!data.password) {
    const error = new Error('A student password is required');
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    name: data.fullName || data.name,
    email: data.email,
    password: data.password,
    phone: data.phone,
    rollNumber: data.rollNumber,
    department: data.department || 'General',
    course: data.course || 'B.Tech',
    yearOfStudy: parseInt(data.yearOfStudy, 10) || 1,
    gender: data.gender || 'MALE',
    dob: data.dob || null,
    bloodGroup: data.bloodGroup || null,
    guardianName: data.guardianName || 'Guardian',
    guardianPhone: data.guardianPhone || '',
    guardianRelation: data.guardianRelation || 'Parent',
    permanentAddress: data.permanentAddress || 'Campus',
  };

  const newStudent = await studentService.createStudent(payload);

  // Fetch created user & student details for session
  const [users] = await query(
    `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.avatar_url, u.status,
            s.id AS student_id, s.roll_number, s.department, s.course, s.year_of_study
     FROM users u
     JOIN students s ON u.id = s.user_id
     WHERE s.id = ?
     LIMIT 1`,
    [newStudent.id]
  );

  const user = users[0];
  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: 'STUDENT',
      studentDetails: {
        studentId: user.student_id,
        rollNumber: user.roll_number,
        department: user.department,
        course: user.course,
        yearOfStudy: user.year_of_study,
      },
    },
  };
}

module.exports = {
  loginUser,
  getUserProfile,
  registerStudent,
  generateToken,
};
