const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const addressRoutes = require("./address.routes");
const categoryRoutes = require("./category.routes");
const productRoutes = require("./product.routes");
const tagRoutes = require("./tag.routes");
const discountRoutes = require("./discount.routes");
const sizeRoutes = require("./size.routes");
const sizeGuideRoutes = require("./size-guide.routes");
const wishlistRoutes = require("./wishlist.routes");
const collectionRoutes = require("./collection.routes");
const reviewRoutes = require("./review.routes");
const cartRoutes = require("./cart.routes");
const orderRoutes = require("./order.routes");
const paymentRoutes = require("./payment.routes");
const heroSectionRoutes = require("./hero-section.routes");
const dashboardRoutes = require("./dashboard.routes");

// Health check routes
router.use("/health", healthRoutes);

// Auth routes
router.use("/auth", authRoutes);

// User routes
router.use("/users", userRoutes);

// Address routes
router.use("/addresses", addressRoutes);

// Category routes
router.use("/categories", categoryRoutes);

// Product routes
router.use("/products", productRoutes);

// Tag routes
router.use("/tags", tagRoutes);

// Discount routes
router.use("/discounts", discountRoutes);
router.use("/sizes", sizeRoutes);
router.use("/size-guide", sizeGuideRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/collections", collectionRoutes);
router.use("/reviews", reviewRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/hero-sections", heroSectionRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
