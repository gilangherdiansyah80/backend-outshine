const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const discountController = require("../controllers/discount.controller");
const sizeController = require("../controllers/size.controller");
const sizeGuideController = require("../controllers/size-guide.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Product Routes
// Public
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// Nested Resources (Public)
router.get("/:id/sizes", sizeController.getSizesByProduct);
router.get("/:id/size-guide", sizeGuideController.getSizeGuideByProduct); // Single/List

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
router.delete("/images/:imageId", productController.deleteProductImage);
router.patch("/images/:imageId/primary", productController.setPrimaryImage);

// Tag Management
router.post("/:id/tags", productController.addProductTag);
router.delete("/:id/tags/:tagId", productController.removeProductTag);

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

module.exports = router;
