// fareRoutes.js
// Handles fare estimation by calling the external RapidAPI Taxi Fare Calculator.
// GET /fare — validates query params, calls external API, and returns a structured fare estimate.
// No requireAuth here — payment-service calls this route internally without a user token.
// The Gateway applies requireAuth for all frontend-facing requests.
'use strict';

const express = require('express');
const axios = require('axios');

const router = express.Router();

// GET /fare — estimate fare between two locations
router.get('/fare', async (req, res, next) => {
  const { start_location, end_location } = req.query;

  // Validate required query parameters
  if (!start_location || !String(start_location).trim()) {
    return res.status(400).json({ error: 'start_location query parameter is required' });
  }
  if (!end_location || !String(end_location).trim()) {
    return res.status(400).json({ error: 'end_location query parameter is required' });
  }

  // Guard: fail fast if API credentials are missing
  const { FARE_API_URL, FARE_API_KEY, FARE_API_HOST, FARE_API_TIMEOUT_MS } = process.env;
  if (!FARE_API_URL || !FARE_API_KEY || !FARE_API_HOST) {
    console.error('[fareRoutes] FARE_API_URL, FARE_API_KEY, or FARE_API_HOST is not set');
    return res.status(500).json({ error: 'Fare API is not configured' });
  }

  try {
    // Call external Taxi Fare API
    const response = await axios.get(FARE_API_URL, {
      params: {
        start_address: start_location.trim(),
        end_address:   end_location.trim()
      },
      headers: {
        'X-RapidAPI-Key':  FARE_API_KEY,
        'X-RapidAPI-Host': FARE_API_HOST
      },
      timeout: parseInt(FARE_API_TIMEOUT_MS || '10000', 10)
    });

    return res.status(200).json({ fare: response.data });

  } catch (err) {
    
    // RapidAPI returned a non-2xx (bad key, quota exceeded, invalid params, etc.)
    if (err.response) {
      console.error('[fareRoutes] RapidAPI error:', err.response.status, err.response.data);
      return res.status(503).json({
        error:  'Fare API returned an error',
        detail: err.response.data
      });
    }

    // Network-level failure reaching RapidAPI
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') {
      console.error('[fareRoutes] Fare API unreachable:', err.message);
      return res.status(503).json({ error: 'Fare API is currently unavailable' });
    }

    // Request timed out
    if (err.code === 'ECONNABORTED') {
      console.error('[fareRoutes] Fare API timed out');
      return res.status(503).json({ error: 'Fare API request timed out' });
    }

    // Unexpected error — forward to global errorHandler
    next(err);
  }
});

module.exports = router;
