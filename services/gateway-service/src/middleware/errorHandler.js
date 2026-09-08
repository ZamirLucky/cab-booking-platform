// Global error handler
'use strict';

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status === 500) {
    console.error('[gateway errorHandler]', err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
