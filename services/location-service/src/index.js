// Location service entry point
'use strict';

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const locationRoutes = require('./routes/locationRoutes');
const errorHandler   = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'location-service' });
});

// API routes
app.use('/', locationRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`location-service running on port ${PORT}`);
});
