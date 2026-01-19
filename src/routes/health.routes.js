const express = require("express");
const router = express.Router();
const healthController = require("../controllers/health.controller");

// GET /api/health - Basic health check
router.get("/", healthController.check);

// GET /api/health/db - Database connection check
router.get("/db", healthController.checkDatabase);

module.exports = router;
