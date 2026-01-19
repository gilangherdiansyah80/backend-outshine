const postgres = require("postgres");
const config = require("./index");

// Initialize PostgreSQL connection using Transaction Pooler
let sql = null;

/**
 * Get PostgreSQL client instance
 * Uses Supabase Transaction Pooler - ideal for serverless functions
 */
const getPostgresClient = () => {
  if (!sql) {
    // Use individual parameters instead of URL to avoid encoding issues
    sql = postgres({
      host: "aws-1-ap-southeast-2.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      username: "postgres.uvetcjmswzqmhcwtkynx",
      password: process.env.DB_PASSWORD || "9YmjeMis9/Ku5mK",
      ssl: "require",
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Transaction pooler doesn't support prepared statements
    });
  }

  return sql;
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const client = getPostgresClient();
    if (!client) {
      return { success: false, message: "PostgreSQL client not initialized" };
    }

    // Simple query to test connection
    const result = await client`SELECT NOW() as current_time`;

    return {
      success: true,
      message: "Database connection successful",
      timestamp: result[0].current_time,
    };
  } catch (error) {
    console.error("Database connection error:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Close database connection
 * Call this when shutting down the server
 */
const closeConnection = async () => {
  if (sql) {
    await sql.end();
    sql = null;
  }
};

module.exports = {
  getPostgresClient,
  testConnection,
  closeConnection,
  // Export sql directly for convenience
  get sql() {
    return getPostgresClient();
  },
};
