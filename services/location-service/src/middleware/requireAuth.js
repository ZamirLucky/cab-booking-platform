// requireAuth.js
// JWT verification middleware for location-service.
// Reads the Bearer token from Authorization header, verifies it, and sets req.user = { id, email }.
// Returns 401 immediately if the token is missing, malformed, or expired.
'use strict';

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // Header presence check
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];

  // Configuration guard
  if (!process.env.JWT_SECRET) {
    console.error('[requireAuth] JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Token verification
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id:    decoded.userId,
      email: decoded.email
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;