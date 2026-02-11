const express = require("express");
const router = express.Router();
const paymentMethodController = require("../controllers/payment-method.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Public (e.g. for checkout dropdown)
router.get("/", paymentMethodController.getAllMethods);
router.get("/:id", paymentMethodController.getMethodById);

// Protected (Admin Management)
router.use(authMiddleware);
router.post("/", paymentMethodController.createMethod);
router.put("/:id", paymentMethodController.updateMethod);
router.delete("/:id", paymentMethodController.deleteMethod);

module.exports = router;
