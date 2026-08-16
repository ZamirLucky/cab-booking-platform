// errorHandler.js
// Global Express error handler for location-service.
// Logs unexpected 500 errors and returns a structured JSON error response for all failures.
'use strict';

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log server errors only
  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}]`, err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;