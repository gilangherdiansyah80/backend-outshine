const express = require("express");
const router = express.Router();
const addressController = require("../controllers/address.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get("/", addressController.getAddresses);
router.post("/", addressController.addAddress);
router.put("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);
router.patch("/:id/default", addressController.setDefaultAddress);

module.exports = router;
