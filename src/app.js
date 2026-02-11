const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const paymentMethodRoutes = require("./routes/payment-method.routes");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");
const { corsOptions } = require("./middlewares/cors.middleware");

// Load environment variables
require("dotenv").config();

const app = express();

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/v1", routes);
app.use("/api/v1/payment-methods", paymentMethodRoutes);
// app.use("/api/v1/settings", settingsRoutes); // If we implement settings later

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Outshine API",
    version: "1.0.0",
    documentation: "/api/docs",
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
