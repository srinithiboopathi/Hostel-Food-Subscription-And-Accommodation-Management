const { sendError } = require('../utils/responseHelper');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Accepts array of allowed roles, e.g. authorizeRoles('ADMIN', 'WARDEN')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 'Unauthorized access - user context not found', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]`,
        403
      );
    }

    next();
  };
}

module.exports = {
  authorizeRoles,
};
