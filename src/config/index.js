require("dotenv").config();

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
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["*"],
};

module.exports = config;
