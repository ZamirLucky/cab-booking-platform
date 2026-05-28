// Entry point for fare-estimation-service.
// Initialises Express, mounts the fare route, and starts the server. No database connection needed.
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const fareRoutes   = require('./routes/fareRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'fare-estimation-service' });
});

// Fare routes
app.use('/', fareRoutes);

// Error handler — must be last
app.use(errorHandler);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`fare-estimation-service running on port ${PORT}`);
});
