'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'customer-service' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`customer-service running on port ${PORT}`);
});
