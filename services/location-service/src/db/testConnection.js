// Database connectivity check
const pool = require("./pool");

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");

    console.log("DB connected successfully.");
    console.log("Server time:", result.rows[0].server_time);
  } catch (error) {
    console.error("DB connection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
