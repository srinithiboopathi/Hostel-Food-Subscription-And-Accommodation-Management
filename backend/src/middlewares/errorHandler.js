const { sendError } = require('../utils/responseHelper');

function errorHandler(err, req, res, next) {
  console.error('[Global Error Handler]:', err.stack || err);

  // MySQL specific errors
  if (err.code === 'ER_DUP_ENTRY') {
    return sendError(res, 'A record with this unique value already exists.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return sendError(res, 'Referenced record (foreign key) does not exist.', 400);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return sendError(res, 'Cannot delete or modify record because it is referenced by other records.', 409);
  }

  // JSON parse error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Malformed JSON payload in request body', 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
}

function notFoundHandler(req, res) {
  return sendError(res, `API route not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
