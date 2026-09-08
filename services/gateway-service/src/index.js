// Gateway entry point
'use strict';

// Configuration
require('dotenv').config();
require('./utils/configureCloudRunAxios')();

const express = require('express');
const cors = require('cors');

const customerRoutes  = require('./routes/customerRoutes');
const bookingRoutes   = require('./routes/bookingRoutes');
const paymentRoutes   = require('./routes/paymentRoutes');
const fareRoutes      = require('./routes/fareRoutes');
const locationRoutes  = require('./routes/locationRoutes');
const errorHandler    = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway-service' });
});

// API routes
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fare', fareRoutes);
app.use('/api/locations', locationRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`gateway-service running on port ${PORT}`);
});
