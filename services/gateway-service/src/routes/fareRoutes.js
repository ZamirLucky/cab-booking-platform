// Fare proxy routes
'use strict';

const express = require('express');
const axios   = require('axios');
const requireAuth      = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

const FARE_URL = () => process.env.FARE_SERVICE_URL;

function handleAxiosError(err, res, next) {
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next(err);
}

// Fare lookup
router.get('/', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(`${FARE_URL()}/fare`, {
      params:  req.query,
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

module.exports = router;
