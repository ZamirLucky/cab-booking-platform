// errorHandler.js
// Global Express error handler for customer-service.
// Catches errors passed via next(err) and returns a structured JSON response with the appropriate HTTP status code.
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (process.env.NODE_ENV !== "test") {
    console.error(`[${new Date().toISOString()}]`, err);
  }

  res.status(status).json({
    error: message
  });
}

module.exports = errorHandler;
