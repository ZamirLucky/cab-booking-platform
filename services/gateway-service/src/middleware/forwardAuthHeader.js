// forwardAuthHeader.js
// Copies the incoming Authorization header onto req.authHeader so route handlers
// can pass it explicitly to downstream services via Axios.
'use strict';

function forwardAuthHeader(req, res, next) {
  req.authHeader = req.headers.authorization || '';
  next();
}

module.exports = forwardAuthHeader;
