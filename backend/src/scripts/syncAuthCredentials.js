const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function syncAuth() {
  const hash = await bcrypt.hash('Password@123', 10);

  // Update existing users to Password@123
  await pool.query('UPDATE users SET password_hash = ?', [hash]);

  const defaultUsers = [
    { name: 'Administrator', email: 'admin@hostel.com', role: 'ADMIN' },
    { name: 'Hostel Warden', email: 'warden@hostel.com', role: 'WARDEN' },
    { name: 'Senior Accountant', email: 'accountant@hostel.com', role: 'ACCOUNTANT' },
    { name: 'Mess Manager', email: 'mess@hostel.com', role: 'MESS_MANAGER' },
    { name: 'Aarav Student', email: 'student@hostel.com', role: 'STUDENT' },
    { name: 'Admin Local', email: 'admin@hostel.local', role: 'ADMIN' },
    { name: 'Warden Local', email: 'warden@hostel.local', role: 'WARDEN' },
    { name: 'Mess Local', email: 'mess@hostel.local', role: 'MESS_MANAGER' },
    { name: 'Student Local', email: 'student@hostel.local', role: 'STUDENT' }
  ];

  for (const u of defaultUsers) {
    await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'ACTIVE')
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'ACTIVE'
    `, [u.name, u.email, hash, u.role]);
  }

  // Also ensure student record exists for student@hostel.com if needed
  const [studentUsers] = await pool.query("SELECT id FROM users WHERE email = 'student@hostel.com'");
  if (studentUsers.length > 0) {
    const sId = studentUsers[0].id;
    await pool.query(`
      INSERT INTO students (user_id, roll_number, department, course, year_of_study, gender, guardian_name, guardian_phone, permanent_address, admission_date, status)
      VALUES (?, 'ROLL-STD-001', 'Computer Science', 'B.Tech', 3, 'MALE', 'Guardian Name', '+91 99999 88888', 'Hostel Campus', CURDATE(), 'ACTIVE')
      ON DUPLICATE KEY UPDATE status = 'ACTIVE'
    `, [sId]);
  }

  console.log('✅ All login accounts successfully synchronized with password: Password@123');
  process.exit(0);
}

syncAuth().catch(err => {
  console.error('Error syncing auth:', err);
  process.exit(1);
});
