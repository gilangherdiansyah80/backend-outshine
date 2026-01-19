const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET || "default_secret";
const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const generateToken = (payload) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, secret, { expiresIn: refreshExpiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
};
