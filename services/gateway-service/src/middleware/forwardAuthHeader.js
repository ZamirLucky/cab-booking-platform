/** Preserves the bearer token for downstream requests. */
'use strict';

function forwardAuthHeader(req, res, next) {
  req.authHeader = req.headers.authorization || '';
  next();
}

module.exports = forwardAuthHeader;
