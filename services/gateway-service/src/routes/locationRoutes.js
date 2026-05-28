// locationRoutes.js
// Forwards favourite-location requests from the gateway to location-service.
// All routes are protected — requireAuth verifies the JWT, forwardAuthHeader passes it downstream.
'use strict';

const express = require('express');
const axios   = require('axios');
const requireAuth      = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

const LOCATION_URL = () => process.env.LOCATION_SERVICE_URL;

function handleAxiosError(err, res, next) {
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next(err);
}

// POST /api/locations — save a new favourite location (protected)
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

// GET /api/locations — list all favourite locations for the user (protected)
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

// GET /api/locations/:id/weather — get weather for a saved location (protected)
// Must be defined before /:id to prevent Express matching 'weather' as the id segment.
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

// PATCH /api/locations/:id — partially update a favourite location (protected)
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

// DELETE /api/locations/:id — remove a favourite location (protected)
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

module.exports = router;
