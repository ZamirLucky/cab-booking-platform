// requireAuth.js
// Booking-service JWT middleware — verifies the Bearer token on all protected booking routes.
// Sets req.user = { id, email } on success; returns 401 immediately on failure.

'use strict';

const jwt = require('jsonwebtoken');

/**
 * Booking-service JWT verification.
 * Rejects requests with missing or invalid tokens.
 * Sets req.user = { id, email } for downstream handlers.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    console.error('[requireAuth] JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;
