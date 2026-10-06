const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hostel_management',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00',
  multipleStatements: false,
};

// Create reusable connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection and return boolean + details
async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 AS health_check, DATABASE() as db_name, VERSION() as version');
    connection.release();
    return {
      connected: true,
      database: rows[0].db_name,
      version: rows[0].version,
    };
  } catch (error) {
    console.error('[Database Error] Connection check failed:', error.message);
    return {
      connected: false,
      error: error.message,
    };
  }
}

// Graceful pool shutdown helper
async function closePool() {
  try {
    await pool.end();
    console.log('[Database] MySQL pool closed successfully.');
  } catch (err) {
    console.error('[Database] Error closing MySQL pool:', err.message);
  }
}

module.exports = {
  pool,
  query: (sql, params) => pool.query(sql, params),
  execute: (sql, params) => pool.execute(sql, params),
  checkDatabaseConnection,
  closePool,
};
