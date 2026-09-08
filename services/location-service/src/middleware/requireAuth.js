/** Verifies the bearer token and assigns the authenticated user. */
'use strict';

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // Header validation
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];

  // Configuration
  if (!process.env.JWT_SECRET) {
    console.error('[requireAuth] JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Verification
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
