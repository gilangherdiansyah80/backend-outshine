const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tag.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Public
router.get("/", tagController.getAllTags);

// Protected
router.use(authMiddleware);
router.post("/", tagController.createTag);
router.put("/:id", tagController.updateTag);
router.delete("/:id", tagController.deleteTag);

module.exports = router;
