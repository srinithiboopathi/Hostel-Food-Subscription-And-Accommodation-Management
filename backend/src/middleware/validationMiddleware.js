const { validationResult } = require('express-validator');
const { sendError } = require('../utils/responseHelper');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed for request data', 422, errors.array());
  }
  next();
}

module.exports = {
  validate,
};
