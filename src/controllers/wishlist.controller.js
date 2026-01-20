const wishlistService = require("../services/wishlist.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlist = await wishlistService.getWishlist(userId);
    return successResponse(res, wishlist, "Wishlist retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const item = await wishlistService.addToWishlist(userId, productId);
    return successResponse(res, item, "Product added to wishlist", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    await wishlistService.removeFromWishlist(userId, productId);
    return successResponse(res, null, "Product removed from wishlist");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
