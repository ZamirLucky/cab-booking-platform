// locationRoutes.js
// Forwards all location-service requests from the gateway to the downstream service.
// All five routes are protected — requireAuth runs before forwardAuthHeader.
'use strict';

const express    = require('express');
const axios      = require('axios');
const requireAuth       = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

// Read URL at call time so changes to process.env after startup are picked up
const LOCATION_URL = () => process.env.LOCATION_SERVICE_URL;

// Centralised error handling for all axios calls
function handleAxiosError(err, res, next) {
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next(err);
}

// POST /api/locations — add a favourite location
router.post('/', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.post(`${LOCATION_URL()}/locations`, req.body, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// GET /api/locations — list favourite locations 
router.get('/', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(`${LOCATION_URL()}/locations`, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// PATCH /api/locations/:id — update a favourite location
router.patch('/:id', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.patch(
      `${LOCATION_URL()}/locations/${req.params.id}`,
      req.body,
      { headers: { Authorization: req.authHeader } }
    );
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// DELETE /api/locations/:id — remove a favourite location
router.delete('/:id', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.delete(
      `${LOCATION_URL()}/locations/${req.params.id}`,
      { headers: { Authorization: req.authHeader } }
    );
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// GET /api/locations/:id/weather — weather for a saved location
// Must be defined after /:id routes but uses the more-specific path /:id/weather —
// Express matches by declaration order within the same specificity, so this is safe.
router.get('/:id/weather', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(
      `${LOCATION_URL()}/locations/${req.params.id}/weather`,
      { headers: { Authorization: req.authHeader } }
    );
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

module.exports = router;
