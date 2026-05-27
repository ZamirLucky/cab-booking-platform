// Entry point for gateway-service.
// Initialises Express, mounts customer-service routes under /api/customers, and registers the global error handler.
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const customerRoutes = require('./routes/customerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const errorHandler = require('./middleware/errorHandler');

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

// Error handler - must be registered after all routes
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`gateway-service running on port ${PORT}`);
});
