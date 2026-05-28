// errorHandler.js
// Global Express error handler for fare-estimation-service.
// Logs unexpected 500 errors outside test environments and returns structured JSON error responses.

'use strict';

// Error handler — four-parameter signature required by Express
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log only unexpected server errors; suppress in test runs
  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}]`, err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
