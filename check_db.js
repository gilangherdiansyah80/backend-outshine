const { sql } = require("./src/config/database");

async function checkColumns() {
  try {
    const usersCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `;
    console.log(
      "Users Columns:",
      usersCols.map((c) => c.column_name),
    );

    const otpsCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_otps'
    `;
    console.log(
      "Email OTPs Columns:",
      otpsCols.map((c) => c.column_name),
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkColumns();
