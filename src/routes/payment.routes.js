const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Webhook (Public)
router.post("/midtrans/webhook", paymentController.handleWebhook);

// Protected
router.use(authMiddleware);
router.post("/midtrans", paymentController.createMidtransPayment); // Manual trigger
router.get("/:orderId", paymentController.getPaymentsByOrder);

module.exports = router;
