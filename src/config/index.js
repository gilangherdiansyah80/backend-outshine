const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Database Direct Connection
  databaseUrl: process.env.DATABASE_URL,

  // CORS
  corsOrigins: process.env.CORS_ORIGINS
    ? [
        ...process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://outshine-store.vercel.app",
      ]
    : ["*"],

  // Mail
  mail: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
};

module.exports = config;
