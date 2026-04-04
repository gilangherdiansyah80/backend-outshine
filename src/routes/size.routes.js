const express = require("express");
const router = express.Router();
const sizeController = require("../controllers/size.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Public routes
router.get("/", sizeController.getAllSizes);

// Protected routes
router.post("/", authMiddleware, sizeController.createSize);
router.put("/:id", authMiddleware, sizeController.updateSize);
router.delete("/:id", authMiddleware, sizeController.deleteSize);

module.exports = router;
