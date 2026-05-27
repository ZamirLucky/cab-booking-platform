// bookingRoutes.js
// Forwards all booking-service requests from the gateway to the downstream service.
// All routes are protected — requireAuth runs before forwardAuthHeader.
'use strict';

const express = require('express');
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

const BOOKING_URL = () => process.env.BOOKING_SERVICE_URL;

// Helper: forward Axios errors correctly
function handleAxiosError(err, res, next) {
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next(err);
}

// POST /api/bookings — create a new booking (protected)
router.post('/', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.post(`${BOOKING_URL()}/bookings`, req.body, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// GET /api/bookings/current — list current bookings (protected)
// Must be defined before /:id to prevent Express matching 'current' as an id parameter.
router.get('/current', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(`${BOOKING_URL()}/bookings/current`, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// GET /api/bookings/past — list completed and cancelled bookings (protected)
router.get('/past', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(`${BOOKING_URL()}/bookings/past`, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// GET /api/bookings/:id — retrieve a single booking by ID (protected)
router.get('/:id', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(`${BOOKING_URL()}/bookings/${req.params.id}`, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// PATCH /api/bookings/:id/status — update booking status (protected)
router.patch('/:id/status', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.patch(
      `${BOOKING_URL()}/bookings/${req.params.id}/status`,
      req.body,
      { headers: { Authorization: req.authHeader } }
    );
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

module.exports = router;
