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
    const userAgent = req.headers["user-agent"];
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!email || !password) {
      return errorResponse(res, "Please provide email and password", 400);
    }

    const result = await authService.login(email, password, {
      userAgent,
      ipAddress,
    });
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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, "Email is required", 400);
    }

    const result = await authService.forgotPassword(email);
    return successResponse(res, result, result.message);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return errorResponse(res, "Email and OTP are required", 400);
    }

    const result = await authService.verifyResetOtp(email, otp);
    return successResponse(res, result, result.message);
  } catch (error) {
    return errorResponse(res, "Invalid or expired OTP", 400);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return errorResponse(
        res,
        "Email, OTP, and new password are required",
        400,
      );
    }

    const result = await authService.resetPassword(email, otp, newPassword);
    return successResponse(res, result, result.message);
  } catch (error) {
    return errorResponse(
      res,
      error.message.includes("OTP") ? "Invalid or expired OTP" : error.message,
      400,
    );
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    return successResponse(res, null, "Logout successful");
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userAgent = req.headers["user-agent"];
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!refreshToken) {
      return errorResponse(res, "Refresh token required", 400);
    }

    const result = await authService.refreshToken(refreshToken, {
      userAgent,
      ipAddress,
    });

    return successResponse(res, result, "Token refreshed successfully");
  } catch (error) {
    return errorResponse(res, error.message, 401);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
