const authService = require("../services/auth.service");
const { successResponse, errorResponse } = require("../utils/response.util");
const { verifyToken, generateToken } = require("../utils/jwt.util");

const register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName) {
      return errorResponse(res, "Please provide all required fields", 400);
    }

    const result = await authService.register({
      email,
      password,
      fullName,
      phone,
    });
    return successResponse(res, result, "User registered successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, "Please provide email and password", 400);
    }

    const result = await authService.login(email, password);
    return successResponse(res, result, "Login successful");
  } catch (error) {
    const statusCode = error.message.includes("belum aktif") ? 403 : 401;
    return errorResponse(res, error.message, statusCode);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return errorResponse(res, "Email and OTP code are required", 400);
    }

    const result = await authService.verifyOtp(email, otpCode);
    return successResponse(res, result, "Email verified successfully");
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, "Email is required", 400);
    }

    const result = await authService.resendOtp(email);
    return successResponse(res, result, "OTP resent successfully");
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const logout = async (req, res) => {
  // Since JWT is stateless, logout is mostly handled client-side by destroying the token.
  // Optionally blacklist token on server.
  return successResponse(res, null, "Logout successful");
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, "Refresh token required", 400);
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return errorResponse(res, "Invalid or expired refresh token", 401);
    }

    // In a real app, you might want to version tokens or check user status in DB
    const payload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    const newToken = generateToken(payload);

    return successResponse(
      res,
      { token: newToken },
      "Token refreshed successfully",
    );
  } catch (error) {
    return errorResponse(res, "Token refresh failed", 401);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  verifyOtp,
  resendOtp,
};
