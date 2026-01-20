const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.use(authMiddleware);

router.get("/", cartController.getCart);
router.post("/items", cartController.addToCart);
router.put("/items", cartController.updateCartItem);
router.delete("/items", cartController.removeCartItem);

module.exports = router;
