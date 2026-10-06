const { checkDatabaseConnection, query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Main Health Check
 * GET /api/health
 * Verifies Express server and MySQL database connection
 */
async function getHealth(req, res) {
  const dbStatus = await checkDatabaseConnection();

  if (!dbStatus.connected) {
    return res.status(503).json({
      success: false,
      message: 'Hostel Management API is running but database is unreachable',
      database: 'disconnected',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Hostel Management API is running',
    database: 'connected',
  });
}

/**
 * Dedicated Database Health Check
 * GET /api/health/database
 * Executes a live query (SELECT 1) and inspects table counts
 */
async function getDatabaseHealth(req, res, next) {
  try {
    const [rows] = await query('SELECT 1 AS live_test, DATABASE() as active_database, VERSION() as version');
    const [tables] = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    return sendSuccess(res, {
      databaseStatus: 'connected',
      activeDatabase: rows[0].active_database,
      mysqlVersion: rows[0].version,
      totalTables: tables.length,
      tables: tables.map((t) => t.table_name || t.TABLE_NAME),
    }, 'Database connection verified successfully');
  } catch (error) {
    return sendError(res, 'Database health check failed: ' + error.message, 500);
  }
}

module.exports = {
  getHealth,
  getDatabaseHealth,
};
