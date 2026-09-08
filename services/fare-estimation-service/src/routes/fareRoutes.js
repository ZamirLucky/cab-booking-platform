// Fare estimation routes
// Authentication is enforced at the gateway for frontend requests.
'use strict';

const express = require('express');
const axios = require('axios');

const router = express.Router();

// Fare lookup
router.get('/fare', async (req, res, next) => {
  const { start_location, end_location } = req.query;

  // Validation
  if (!start_location || !String(start_location).trim()) {
    return res.status(400).json({ error: 'start_location query parameter is required' });
  }
  if (!end_location || !String(end_location).trim()) {
    return res.status(400).json({ error: 'end_location query parameter is required' });
  }

  // Configuration
  const { FARE_API_URL, FARE_API_KEY, FARE_API_HOST, FARE_API_TIMEOUT_MS } = process.env;
  if (!FARE_API_URL || !FARE_API_KEY || !FARE_API_HOST) {
    console.error('[fareRoutes] FARE_API_URL, FARE_API_KEY, or FARE_API_HOST is not set');
    return res.status(500).json({ error: 'Fare API is not configured' });
  }

  try {
    // Fare service
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
    
    // Upstream response
    if (err.response) {
      console.error('[fareRoutes] RapidAPI error:', err.response.status, err.response.data);
      return res.status(503).json({
        error:  'Fare API returned an error',
        detail: err.response.data
      });
    }

    // Network failure
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') {
      console.error('[fareRoutes] Fare API unreachable:', err.message);
      return res.status(503).json({ error: 'Fare API is currently unavailable' });
    }

    // Timeout
    if (err.code === 'ECONNABORTED') {
      console.error('[fareRoutes] Fare API timed out');
      return res.status(503).json({ error: 'Fare API request timed out' });
    }

    next(err);
  }
});

module.exports = router;
