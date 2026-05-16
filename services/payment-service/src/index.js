'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`payment-service running on port ${PORT}`);
});
