const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userService.getProfile(userId);
    return successResponse(res, user, "User profile retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 404);
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone } = req.body;

    const updatedUser = await userService.updateProfile(userId, {
      fullName,
      phone,
    });
    return successResponse(
      res,
      updatedUser,
      "User profile updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return errorResponse(res, "No image file uploaded", 400);
    }

    const result = await userService.updateAvatar(userId, file);
    return successResponse(res, result, "Avatar updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await userService.deleteAccount(userId);
    return successResponse(res, result, "Account deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  deleteAccount,
};
