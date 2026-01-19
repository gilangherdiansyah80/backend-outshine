require("dotenv").config();
const app = require("../src/app");

const PORT = process.env.PORT || 3000;

// For local development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}

// Export for Vercel serverless function
module.exports = app;
