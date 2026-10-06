const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function initDatabase() {
  console.log('====================================================');
  console.log(' Host Management System - Database Initialization   ');
  console.log('====================================================');

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'hostel_db';

  let connection;

  try {
    console.log(`[1/4] Connecting to MySQL server at ${host}:${port} as '${user}'...`);
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log(`[2/4] Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);

    // 1. Run schema.sql
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    console.log(`[3/4] Executing Schema from: ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('       Schema tables created successfully.');

    // 2. Run seed.sql
    const seedPath = path.join(__dirname, '../../../database/seed.sql');
    console.log(`[4/4] Seeding initial data from: ${seedPath}...`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);

    // Ensure all default users have correct hashed password for 'Password@123'
    const bcrypt = require('bcryptjs');
    const defaultHash = await bcrypt.hash('Password@123', 10);
    await connection.query('UPDATE users SET password_hash = ?', [defaultHash]);
    console.log('       Seed data and password hashes calibrated successfully.');

    // Verification
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n====================================================');
    console.log(` Database '${dbName}' is Ready with ${tables.length} Tables:`);
    console.log('====================================================');
    tables.forEach((t, i) => {
      const tableName = Object.values(t)[0];
      console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${tableName}`);
    });

    // Verification counts
    const [userCount] = await connection.query('SELECT COUNT(*) AS count FROM users');
    const [hostelCount] = await connection.query('SELECT COUNT(*) AS count FROM hostels');
    const [roomCount] = await connection.query('SELECT COUNT(*) AS count FROM rooms');
    const [studentCount] = await connection.query('SELECT COUNT(*) AS count FROM students');
    const [menuCount] = await connection.query('SELECT COUNT(*) AS count FROM mess_menu');

    console.log('\n Initial Record Counts:');
    console.log(`  - Users: ${userCount[0].count} (Admin, Warden, Mess Manager, Accountant, Students)`);
    console.log(`  - Hostels: ${hostelCount[0].count}`);
    console.log(`  - Rooms: ${roomCount[0].count}`);
    console.log(`  - Student Profiles: ${studentCount[0].count}`);
    console.log(`  - Mess Menu Items: ${menuCount[0].count}`);
    console.log('====================================================\n');

  } catch (error) {
    console.error('\n❌ Database initialization error:', error.message);
    if (error.sql) {
      console.error('Failed SQL Query:', error.sql.substring(0, 200) + '...');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
