// Entry point for booking-service.
// Initialises Express, registers event listeners at startup, mounts booking routes, and starts the server.
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const bookingRoutes = require('./routes/bookingRoutes');
const errorHandler = require('./middleware/errorHandler');

// Register event listeners at startup
require('./events/bookingEvents');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'booking-service' });
});

// Booking routes
app.use('/', bookingRoutes);

// Error handler — must be registered after all routes
app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`booking-service running on port ${PORT}`);
});
