const { verifyToken } = require('../utils/tokenHelper');
const { sendError } = require('../utils/responseHelper');
const db = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token missing or invalid', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token has expired. Please login again.', 401);
      }
      return sendError(res, 'Invalid authentication token', 401);
    }

    // Check user active status in database
    const [rows] = await db.execute(
      'SELECT id, full_name, email, role, phone, avatar_url, status FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (!rows || rows.length === 0) {
      return sendError(res, 'User account not found', 401);
    }

    const user = rows[0];
    if (user.status !== 'ACTIVE') {
      return sendError(res, `Account is ${user.status.toLowerCase()}. Please contact administration.`, 403);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return sendError(res, 'Authentication failed', 500);
  }
}

module.exports = {
  authenticate,
};
