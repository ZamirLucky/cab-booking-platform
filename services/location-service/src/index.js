// Entry point for location-service.
// Initialises Express, mounts favourite-location and weather routes, and registers the global error handler.
'use strict';

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const locationRoutes = require('./routes/locationRoutes');
const errorHandler   = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'location-service' });
});

// Location routes — CRUD + weather
app.use('/', locationRoutes);

// Error handler — must be last
app.use(errorHandler);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`location-service running on port ${PORT}`);
});
