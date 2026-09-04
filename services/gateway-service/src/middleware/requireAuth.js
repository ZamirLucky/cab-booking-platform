// requireAuth.js
// Gateway-level JWT middleware — verifies the Bearer token before any request is forwarded.
// Sets req.user = { id, email } on success; returns 401 immediately on failure.
'use strict';

const jwt = require('jsonwebtoken');

/**
 * Gateway-level JWT verification.
 * Rejects requests with missing or invalid tokens before forwarding.
 * Sets req.user = { id, email } so route handlers can read the user identity.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];

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
