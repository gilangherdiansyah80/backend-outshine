const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const discountController = require("../controllers/discount.controller");
const sizeController = require("../controllers/size.controller");
const sizeGuideController = require("../controllers/size-guide.controller");
const reviewController = require("../controllers/review.controller");
const productSpecController = require("../controllers/product-spec.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Helper middleware for optional auth
const optionalAuth = (req, res, next) => {
  // If auth header exists, try running authMiddleware, else next()
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }
  next();
};

// Product Routes
// Public (with optional auth for wishlist status)
router.get("/", productController.getAllProducts); // Maybe optional auth here too for list wishlist check? Skipping for now.
router.get("/:id", optionalAuth, productController.getProductById);

// Nested Resources (Public)
router.get("/:id/sizes", sizeController.getSizesByProduct);
router.get("/:id/size-guide", sizeGuideController.getSizeGuideByProduct); // Single/List
router.get("/:id/specs", productSpecController.getSpecsByProduct);

// Protected Routes
router.use(authMiddleware);

// Product CRUD
router.post("/", productController.createProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Image Management
router.post(
  "/:id/images",
  upload.single("image"),
  productController.addProductImage,
);
router.delete("/images/:id", productController.deleteProductImage);
router.patch("/images/:id/primary", productController.setPrimaryImage);

// Tag Management
router.post("/:id/tags", productController.addProductTag);
router.delete("/:id/tags/:tagId", productController.removeProductTag);

// Spec Management
router.post("/:id/specs", productSpecController.createSpec);
router.put("/specs/:id", productSpecController.updateSpec);
router.delete("/specs/:id", productSpecController.deleteSpec);

// Discount Management
router.get("/:id/discount", discountController.getDiscountsByProduct);
router.post("/:id/discount", discountController.createDiscount);

// Size Management
router.post("/:id/sizes", sizeController.addProductSize);
router.put("/:id/sizes/:sizeId", sizeController.updateProductSize);

// Size Guide Management
router.post(
  "/:id/size-guide",
  upload.single("image"),
  sizeGuideController.createSizeGuide,
);

// Review Management
router.get("/:id/reviews", reviewController.getProductReviews);
router.get("/:id/rating", reviewController.getProductRating);
router.post(
  "/:id/reviews",
  upload.array("images", 5), // Max 5 images
  reviewController.createReview,
);

module.exports = router;
