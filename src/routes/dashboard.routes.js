const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
// const { authenticate, authorize } = require("../middlewares/auth.middleware");

// GET /api/v1/dashboard/stats
// For now, let's keep it public, but eventually, it should be admin-only
router.get("/stats", dashboardController.getStats);

module.exports = router;
