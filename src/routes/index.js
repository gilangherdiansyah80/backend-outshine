const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");

// Health check routes
router.use("/health", healthRoutes);

// Add more routes here as needed
// router.use('/users', userRoutes);
// router.use('/products', productRoutes);

module.exports = router;
