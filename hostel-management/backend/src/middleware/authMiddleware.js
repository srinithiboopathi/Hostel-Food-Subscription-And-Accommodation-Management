const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'hostel_jwt_secret_key_production_2026';

/**
 * Authentication Middleware: Verify JWT Bearer token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Access denied. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.trim() === '') {
    return sendError(res, 'Access denied. Token is empty.', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token has expired. Please login again.', 401);
    }
    return sendError(res, 'Invalid authentication token.', 401);
  }
}

/**
 * Role Authorization Middleware
 * Usage: authorizeRoles('ADMIN', 'WARDEN')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 'Unauthenticated request. Please log in first.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required roles: [${allowedRoles.join(', ')}]`,
        403
      );
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles,
};
