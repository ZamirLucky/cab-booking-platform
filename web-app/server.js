'use strict';

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const GATEWAY_URL =
  process.env.GATEWAY_URL || 'http://localhost:4000';

// Generate the browser configuration from the Cloud Run environment variable.
app.get('/js/config.js', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('application/javascript');
  res.send(
    `const GATEWAY_URL = ${JSON.stringify(GATEWAY_URL)};\n`
  );
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'web-app'
  });
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`web-app running on port ${PORT}`);
});