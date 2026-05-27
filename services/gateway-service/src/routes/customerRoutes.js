// customerRoutes.js
// Forwards all customer-service requests from the gateway to the downstream service.
// Public routes (register, login) are forwarded directly; protected routes require JWT verification first.
'use strict';

const express = require('express');
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const forwardAuthHeader = require('../middleware/forwardAuthHeader');

const router = express.Router();

const CUSTOMER_URL = () => process.env.CUSTOMER_SERVICE_URL;

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

// POST /register (public)
router.post('/register', async (req, res, next) => {
  try {
    const response = await axios.post(`${CUSTOMER_URL()}/register`, req.body);
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// POST /login (public)
router.post('/login', async (req, res, next) => {
  try {
    const response = await axios.post(`${CUSTOMER_URL()}/login`, req.body);
    return res.status(response.status).json(response.data);
  } catch (err) {
    handleAxiosError(err, res, next);
  }
});

// GET /account (protected)
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

// GET /notifications (protected)
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

// PATCH /notifications/:id/read (protected)
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
