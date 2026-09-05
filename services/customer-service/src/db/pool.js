// Configures PostgreSQL for Cloud SQL or local development.

'use strict';

const { Pool } = require('pg');
require('dotenv').config();

const instanceConnectionName =
  process.env.INSTANCE_CONNECTION_NAME;

let poolConfig;

if (instanceConnectionName) {
  // Cloud Run exposes attached Cloud SQL instances through a Unix socket.
  const requiredVariables = [
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  ];

  const missingVariables = requiredVariables.filter(
    variableName => !process.env[variableName]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing database variables: ${missingVariables.join(', ')}`
    );
  }

  poolConfig = {
    host: `/cloudsql/${instanceConnectionName}`,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432,
    max: 5,
    idleTimeoutMillis: 30000
  };
} else {
  // Local and direct connections use DATABASE_URL with optional SSL.
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is missing. Check your local .env file.'
    );
  }

  const useSsl = process.env.DB_SSL === 'true';

  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl
      ? {
          rejectUnauthorized: false
        }
      : false,
    max: 5,
    idleTimeoutMillis: 30000
  };
}

// Export one shared pool for all database queries in this service.
module.exports = new Pool(poolConfig);
