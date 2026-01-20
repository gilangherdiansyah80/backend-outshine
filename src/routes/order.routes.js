const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Public (none?)

// Protected
router.use(authMiddleware);

router.post("/checkout", orderController.checkout);
router.get("/", orderController.getUserOrders);
router.get("/:id", orderController.getOrderById);

// Admin Routes (should separate middleware for admin check really)
router.get("/admin/all", orderController.getAllOrders); // Adjusted path to verify
router.put("/admin/:id/status", orderController.updateOrderStatus);

module.exports = router;
