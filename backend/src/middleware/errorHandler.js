const { sendError } = require('../utils/responseHelper');

function errorHandler(err, req, res, next) {
  // Log internal error for debugging (without passwords/sensitive data)
  console.error(`[Error] [${req.method} ${req.originalUrl}]:`, err.message || err);

  // SyntaxError from body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Malformed JSON payload in request body', 400);
  }

  // Database specific errors (safe sanitized client messages)
  if (err.code === 'ER_DUP_ENTRY') {
    return sendError(res, 'A record with this unique identifier already exists.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return sendError(res, 'Referenced parent record does not exist.', 400);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return sendError(res, 'Cannot delete or update record because it is referenced by other records.', 409);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    return sendError(res, 'Database connection is temporarily unavailable. Please try again later.', 503);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An internal server error occurred';

  return sendError(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
}

function notFoundHandler(req, res) {
  return sendError(res, `Endpoint not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
