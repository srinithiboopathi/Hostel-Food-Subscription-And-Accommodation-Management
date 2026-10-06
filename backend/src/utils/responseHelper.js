/**
 * Standardized API Response Helpers
 */

function sendSuccess(res, data = null, message = 'Operation successful', statusCode = 200) {
  const response = {
    success: true,
    message,
  };
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
}

function sendError(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message,
  };
  if (errors && process.env.NODE_ENV === 'development') {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
}

function sendPaginated(res, data = [], total = 0, page = 1, limit = 10, message = 'Data fetched successfully') {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
};
