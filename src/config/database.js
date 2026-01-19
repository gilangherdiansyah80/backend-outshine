const { createClient } = require("@supabase/supabase-js");
const config = require("./index");

// Initialize Supabase client
let supabase = null;

const getSupabaseClient = () => {
  if (!supabase) {
    if (!config.supabase.url || !config.supabase.anonKey) {
      console.warn(
        "⚠️ Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.",
      );
      return null;
    }

    supabase = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
  }

  return supabase;
};

// Get Supabase Admin client (with service role key for admin operations)
let supabaseAdmin = null;

const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      console.warn(
        "⚠️ Supabase admin credentials not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your environment.",
      );
      return null;
    }

    supabaseAdmin = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseAdmin;
};

// Test database connection
const testConnection = async () => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: "Supabase client not initialized" };
    }

    // Simple query to test connection
    const { data, error } = await client
      .from("_test_connection")
      .select("*")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 means table doesn't exist, which is fine for connection test
      throw error;
    }

    return { success: true, message: "Database connection successful" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = {
  getSupabaseClient,
  getSupabaseAdmin,
  testConnection,
};
