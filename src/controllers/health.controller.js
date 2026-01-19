const { successResponse, errorResponse } = require("../utils/response.util");
const { testConnection } = require("../config/database");

/**
 * Basic health check
 * GET /api/health
 */
const check = (req, res) => {
  return successResponse(
    res,
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    },
    "API is running",
  );
};

/**
 * Database connection health check
 * GET /api/health/db
 */
const checkDatabase = async (req, res) => {
  try {
    const result = await testConnection();

    if (result.success) {
      return successResponse(
        res,
        {
          status: "connected",
          timestamp: new Date().toISOString(),
        },
        result.message,
      );
    }

    return errorResponse(res, result.message, 503);
  } catch (error) {
    return errorResponse(res, "Database health check failed", 503);
  }
};

module.exports = {
  check,
  checkDatabase,
};
