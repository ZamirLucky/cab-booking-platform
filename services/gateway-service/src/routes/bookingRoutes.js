// Booking proxy routes
'use strict';

const express = require('express');
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

const BOOKING_URL = () => process.env.BOOKING_SERVICE_URL;

// Downstream errors
function handleAxiosError(err, res, next) {
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next(err);
}

// Booking creation
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

// Current bookings
// Route order: static paths must precede /:id.
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

// Past bookings
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

// Booking lookup
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

// Booking status
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
