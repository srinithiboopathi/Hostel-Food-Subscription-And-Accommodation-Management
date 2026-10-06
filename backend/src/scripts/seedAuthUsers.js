const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const sampleUsers = [
  {
    email: 'admin@hostel.local',
    fullName: 'System Administrator (Local)',
    password: 'Admin@123',
    role: 'ADMIN',
    phone: '+91 98765 43210',
  },
  {
    email: 'warden@hostel.local',
    fullName: 'Prof. Robert Vance (Local)',
    password: 'Warden@123',
    role: 'WARDEN',
    phone: '+91 98765 43211',
  },
  {
    email: 'mess@hostel.local',
    fullName: 'Suresh Kumar Sharma (Local)',
    password: 'Mess@123',
    role: 'MESS_MANAGER',
    phone: '+91 98765 43212',
  },
  {
    email: 'accountant@hostel.local',
    fullName: 'Meenakshi Sundaram Iyer (Local)',
    password: 'Accountant@123',
    role: 'ACCOUNTANT',
    phone: '+91 98765 43213',
  },
  {
    email: 'student@hostel.local',
    fullName: 'Aarav Patel (Local Student)',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+91 98111 22334',
    rollNumber: 'CS2023001-LOC',
  },
  {
    email: 'admin@hostel.edu',
    fullName: 'Dr. Arvind Swaminathan',
    password: 'Admin@123',
    role: 'ADMIN',
    phone: '+91 98765 43210',
  },
  {
    email: 'warden@hostel.edu',
    fullName: 'Prof. Robert Vance',
    password: 'Warden@123',
    role: 'WARDEN',
    phone: '+91 98765 43211',
  },
  {
    email: 'mess@hostel.edu',
    fullName: 'Suresh Kumar Sharma',
    password: 'Mess@123',
    role: 'MESS_MANAGER',
    phone: '+91 98765 43212',
  },
  {
    email: 'accounts@hostel.edu',
    fullName: 'Meenakshi Sundaram Iyer',
    password: 'Accountant@123',
    role: 'ACCOUNTANT',
    phone: '+91 98765 43213',
  },
  {
    email: 'aarav.patel@student.edu',
    fullName: 'Aarav Patel',
    password: 'Student@123',
    role: 'STUDENT',
    phone: '+91 98111 22334',
  },
];

async function seedAuthUsers() {
  console.log('==================================================================');
  console.log(' Calibrating Development Bcrypt Passwords in hostel_management... ');
  console.log('==================================================================');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'hostel_management',
  });

  try {
    for (const u of sampleUsers) {
      const hash = await bcrypt.hash(u.password, 10);
      
      const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [u.email]);
      let userId;
      if (existing.length > 0) {
        userId = existing[0].id;
        await connection.query('UPDATE users SET password_hash = ?, full_name = ?, role = ?, status = "ACTIVE" WHERE id = ?', [
          hash,
          u.fullName,
          u.role,
          userId,
        ]);
        console.log(` ✅ Updated: ${u.email.padEnd(30)} [${u.role.padEnd(12)}] -> Password: ${u.password}`);
      } else {
        const [res] = await connection.query(
          'INSERT INTO users (full_name, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, "ACTIVE")',
          [u.fullName, u.email, hash, u.role, u.phone]
        );
        userId = res.insertId;
        console.log(` ➕ Inserted: ${u.email.padEnd(30)} [${u.role.padEnd(12)}] -> Password: ${u.password}`);
      }

      // If user is STUDENT and has rollNumber and not yet in students table, link them
      if (u.role === 'STUDENT' && u.rollNumber) {
        const [st] = await connection.query('SELECT id FROM students WHERE user_id = ?', [userId]);
        if (st.length === 0) {
          await connection.query(`
            INSERT INTO students (
              user_id, roll_number, department, course, year_of_study, gender,
              guardian_name, guardian_phone, guardian_relation, permanent_address, admission_date, status
            ) VALUES (?, ?, 'Computer Science & Engineering', 'B.Tech CSE', 3, 'MALE', 'Mahesh Patel', '+91 99887 76655', 'Father', '42, Shanti Nagar, Ahmedabad', CURDATE(), 'ACTIVE')
          `, [userId, u.rollNumber]);
        }
      }
    }
    console.log('==================================================================\n');
  } catch (error) {
    console.error('❌ Error seeding auth users:', error);
  } finally {
    await connection.end();
  }
}

seedAuthUsers();
