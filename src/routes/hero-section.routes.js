const express = require("express");
const router = express.Router();
const heroSectionController = require("../controllers/hero-section.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const multer = require("multer");

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
});

// Public Routes
router.get("/", heroSectionController.getAllHeroSections);
router.get("/:id", heroSectionController.getHeroSectionById);

// Protected Routes
router.use(authMiddleware);

router.post(
  "/",
  upload.single("background_image"),
  heroSectionController.createHeroSection,
);
router.put(
  "/:id",
  upload.single("background_image"),
  heroSectionController.updateHeroSection,
);
router.delete("/:id", heroSectionController.deleteHeroSection);

module.exports = router;
