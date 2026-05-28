// paymentRoutes.js
// Forwards payment requests from the Gateway to payment-service.
// Both routes are protected — requireAuth runs before forwardAuthHeader.
'use strict';

const express = require('express');
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

const PAYMENT_URL = () => process.env.PAYMENT_SERVICE_URL;

function handleAxiosError(err, res, next) {
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next(err);
}

// POST /api/payments — process payment for a booking
router.post('/', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.post(`${PAYMENT_URL()}/payments`, req.body, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// GET /api/payments/:bookingId — retrieve payment for a booking
router.get('/:bookingId', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(
      `${PAYMENT_URL()}/payments/${req.params.bookingId}`,
      { headers: { Authorization: req.authHeader } }
    );
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

module.exports = router;

