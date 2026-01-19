const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const addressRoutes = require("./address.routes");
const categoryRoutes = require("./category.routes");

// Health check routes
router.use("/health", healthRoutes);

// Auth routes
router.use("/auth", authRoutes);

// User routes
router.use("/users", userRoutes);

// Address routes
router.use("/addresses", addressRoutes);

// Category routes
router.use("/categories", categoryRoutes);

module.exports = router;
