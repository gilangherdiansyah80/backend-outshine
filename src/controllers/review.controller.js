const reviewService = require("../services/review.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await reviewService.getReviewsByProduct(id);
    return successResponse(res, reviews, "Reviews retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getProductRating = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = await reviewService.getProductRatingSummary(id);
    return successResponse(res, rating, "Rating retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Product ID
    const { rating, comment } = req.body;
    const files = req.files; // Multer array

    if (!rating) return errorResponse(res, "Rating is required", 400);

    const newReview = await reviewService.createReview(
      userId,
      id,
      rating,
      comment,
      files,
    );
    return successResponse(res, newReview, "Review created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Review ID
    await reviewService.deleteReview(userId, id);
    return successResponse(res, null, "Review deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Review ID
    const { rating, comment } = req.body;
    const files = req.files;

    const updatedReview = await reviewService.updateReview(
      userId,
      id,
      rating,
      comment,
      files,
    );
    return successResponse(res, updatedReview, "Review updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getAllReviews = async (req, res) => {
  try {
    const reviews = await reviewService.getAllReviews();
    return successResponse(res, reviews, "All reviews retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getProductReviews,
  getProductRating,
  createReview,
  deleteReview,
  updateReview,
  getAllReviews,
};
