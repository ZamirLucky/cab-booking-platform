// Global error handler

'use strict';

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Server errors
  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}]`, err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
