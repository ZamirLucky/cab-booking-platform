// Initialises and exports a shared PostgreSQL connection pool for customer-service.
// Reads DATABASE_URL and DB_SSL from environment variables loaded by dotenv.
const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Check your local .env file.");
}

const useSsl = process.env.DB_SSL === "true";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl
    ? {
        rejectUnauthorized: false
      }
    : false
});

module.exports = pool;
