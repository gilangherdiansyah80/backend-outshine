const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
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

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get("/me", userController.getProfile);
router.put("/me", userController.updateProfile);
router.put("/me/avatar", upload.single("avatar"), userController.updateAvatar);
router.delete("/me", userController.deleteAccount);

module.exports = router;
