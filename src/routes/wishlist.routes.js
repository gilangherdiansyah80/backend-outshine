const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlist.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Interact with wishlist
router.use(authMiddleware);

router.get("/", wishlistController.getWishlist);
router.post("/:productId", wishlistController.addToWishlist);
router.delete("/:productId", wishlistController.removeFromWishlist);

module.exports = router;
