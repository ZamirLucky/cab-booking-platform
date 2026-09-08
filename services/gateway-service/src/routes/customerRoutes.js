// Customer proxy routes
'use strict';

const express = require('express');
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

const CUSTOMER_URL = () => process.env.CUSTOMER_SERVICE_URL;

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

// Registration
router.post('/register', async (req, res, next) => {
  try {
    const response = await axios.post(`${CUSTOMER_URL()}/register`, req.body);
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const response = await axios.post(`${CUSTOMER_URL()}/login`, req.body);
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// Account
router.get('/account', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(`${CUSTOMER_URL()}/account`, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// Notifications
router.get('/notifications', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const response = await axios.get(`${CUSTOMER_URL()}/notifications`, {
      headers: { Authorization: req.authHeader }
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// Notification status
router.patch('/notifications/:id/read', requireAuth, forwardAuthHeader, async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await axios.patch(
      `${CUSTOMER_URL()}/notifications/${id}/read`,
      {},
      { headers: { Authorization: req.authHeader } }
    );
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

module.exports = router;
