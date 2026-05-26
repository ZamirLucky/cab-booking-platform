// Entry point for customer-service.
// Initialises Express, applies CORS and JSON middleware, mounts auth and notification routes, and starts the server.
'use strict';

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "customer-service"
  });
});

// Routes
app.use("/", authRoutes);
app.use("/", notificationRoutes);

// Error handler - must be last middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`customer-service running on port ${PORT}`);
});
