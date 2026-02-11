const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Webhook (Public)
router.post("/midtrans/webhook", paymentController.handleWebhook);

// Protected
router.use(authMiddleware);
router.post("/midtrans", paymentController.createMidtransPayment); // Manual trigger
router.post("/manual", paymentController.createManualPayment);
router.post(
  "/proof",
  upload.single("proof"),
  paymentController.uploadPaymentProof,
);
router.get("/:orderId", paymentController.getPaymentsByOrder);
router.patch("/proofs/:id/verify", paymentController.verifyPaymentProof);

module.exports = router;
