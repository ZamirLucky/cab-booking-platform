// fareRoutes.js
// Forwards GET /api/fare requests from the gateway to fare-estimation-service.
// Protected — requireAuth ensures only logged-in users can request a fare estimate.
'use strict';

const express          = require('express');
const axios            = require('axios');
const requireAuth      = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

const FARE_URL = () => process.env.FARE_SERVICE_URL;

// ─── Helper: forward Axios errors correctly ───────────────────────────────────
function handleAxiosError(err, res, next) {
  if (err.response) {
    // Downstream service responded with a non-2xx — forward unchanged
    return res.status(err.response.status).json(err.response.data);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next(err);
}

// ─── GET /api/fare?start_location=...&end_location=... (protected) ────────────
router.get('/', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(`${FARE_URL()}/fare`, {
      params:  req.query,        // forward start_location and end_location as-is
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

module.exports = router;
