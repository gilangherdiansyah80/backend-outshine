const express = require("express");
const router = express.Router();
const sizeGuideController = require("../controllers/size-guide.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Protected routes for managing specific size guides
router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  sizeGuideController.updateSizeGuide,
);
router.delete("/:id", authMiddleware, sizeGuideController.deleteSizeGuide);

module.exports = router;
