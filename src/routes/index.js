const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");

// Health check routes
router.use("/health", healthRoutes);

// Auth routes
router.use("/auth", authRoutes);

module.exports = router;
