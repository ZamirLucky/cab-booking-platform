// Booking service entry point
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const bookingRoutes = require('./routes/bookingRoutes');
const errorHandler = require('./middleware/errorHandler');

// Event registration
require('./events/bookingEvents');

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'booking-service' });
});

// API routes
app.use('/', bookingRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`booking-service running on port ${PORT}`);
});
