// Customer service entry point
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

// Health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "customer-service"
  });
});

// API routes
app.use("/", authRoutes);
app.use("/", notificationRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`customer-service running on port ${PORT}`);
});
