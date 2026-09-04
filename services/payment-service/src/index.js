'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const paymentRoutes = require('./routes/paymentRoutes');
const errorHandler  = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

// Payment routes
app.use('/', paymentRoutes);

// Error handler — must be last
app.use(errorHandler);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`payment-service running on port ${PORT}`);
});
