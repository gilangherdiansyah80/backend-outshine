const { verifyToken } = require("../utils/jwt.util");
const { errorResponse } = require("../utils/response.util");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return errorResponse(res, "Authorization header missing", 401);
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return errorResponse(res, "Token missing", 401);
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return errorResponse(res, "Invalid or expired token", 401);
  }

  // Attach user info to request
  req.user = decoded;
  next();
};

module.exports = authMiddleware;
