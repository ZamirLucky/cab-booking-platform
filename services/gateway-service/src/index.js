// Entry point for gateway-service.
// Initialises Express, mounts all service routes, and registers the global error handler.
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const customerRoutes = require('./routes/customerRoutes');
const bookingRoutes  = require('./routes/bookingRoutes');
const fareRoutes     = require('./routes/fareRoutes');
const paymentRoutes  = require('./routes/paymentRoutes');
const errorHandler   = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway-service' });
});

// Customer service routes
app.use('/api/customers', customerRoutes);

// Booking service routes
app.use('/api/bookings', bookingRoutes);

// Fare estimation routes
app.use('/api/fare', fareRoutes);

// Payment service routes
app.use('/api/payments',  paymentRoutes);

// Error handler — must be last
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`gateway-service running on port ${PORT}`);
});
