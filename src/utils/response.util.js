/**
 * Standardized success response
 * @param {Response} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const successResponse = (
  res,
  data = null,
  message = "Success",
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standardized error response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} errors - Additional error details
 */
const errorResponse = (
  res,
  message = "Error",
  statusCode = 400,
  errors = null,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

/**
 * Standardized paginated response
 * @param {Response} res - Express response object
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
const paginatedResponse = (res, data, pagination, message = "Success") => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
};
