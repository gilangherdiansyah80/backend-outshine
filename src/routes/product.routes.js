const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const multer = require("multer");

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
});

// Public
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// Protected
router.use(authMiddleware);

router.post("/", productController.createProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Image management
router.post(
  "/:id/images",
  upload.single("image"),
  productController.addProductImage,
);
router.delete("/images/:id", productController.deleteProductImage);
router.patch("/images/:id/primary", productController.setPrimaryImage);

module.exports = router;
