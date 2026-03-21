const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Reviews usually accessed via product, but DELETE /reviews/:id is global
// Prompt:
// PUT    /reviews/:id  (Update review? Not implemented in service yet but in controller.. wait, controller deleteReview matches prompt DELETE)
// DELETE /reviews/:id

router.use(authMiddleware);

// Admin: Get all reviews from all products
router.get("/all", reviewController.getAllReviews);

router.delete("/:id", reviewController.deleteReview);
router.put(
  "/:id",
  upload.array("images", 5), // Allow adding more images
  reviewController.updateReview,
);

module.exports = router;
