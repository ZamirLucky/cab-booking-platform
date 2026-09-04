// authRoutes.js
// Handles customer registration, login, and account retrieval for customer-service.
// POST /register — create a new account with a bcrypt-hashed password
// POST /login    — verify credentials and return a signed JWT
// GET  /account  — return the authenticated customer's profile (protected)
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../db/pool");
const jwt = require("jsonwebtoken");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// POST / register
router.post("/register", async (req, res, next) => {
  try {
    const { first_name, surname, email, password } = req.body;

    if (
      !first_name ||
      !surname ||
      !email ||
      !password ||
      String(first_name).trim() === "" ||
      String(surname).trim() === "" ||
      String(email).trim() === "" ||
      String(password).trim() === ""
    ) {
      return next(
        createError(
          400,
          "first_name, surname, email, and password are required"
        )
      );
    }

    const trimmedFirstName = String(first_name).trim();
    const trimmedSurname = String(surname).trim();
    const normalisedEmail = String(email).trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalisedEmail)) {
      return next(createError(400, "Invalid email format"));
    }

    if (String(password).length < 8) {
      return next(
        createError(400, "Password must be at least 8 characters")
      );
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalisedEmail]
    );

    if (existingUser.rowCount > 0) {
      return next(createError(409, "Email already registered"));
    }

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
        INSERT INTO users (
          id,
          first_name,
          surname,
          email,
          password_hash
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        userId,
        trimmedFirstName,
        trimmedSurname,
        normalisedEmail,
        passwordHash
      ]
    );

    return res.status(201).json({
      message: "Registration successful",
      userId: result.rows[0].id
    });
  } catch (err) {
    if (err.code === "23505") {
      return next(createError(409, "Email already registered"));
    }

    return next(err);
  }
});

// POST /login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      !email ||
      !password ||
      String(email).trim() === "" ||
      String(password).trim() === ""
    ) {
      return next(createError(400, "Email and password are required"));
    }

    if (!process.env.JWT_SECRET) {
      return next(createError(500, "JWT_SECRET is not configured"));
    }

    const normalisedEmail = String(email).trim().toLowerCase();

    const result = await pool.query(
      `
        SELECT
          id,
          email,
          password_hash
        FROM users
        WHERE email = $1
      `,
      [normalisedEmail]
    );

    if (result.rowCount === 0) {
      return next(createError(401, "Invalid email or password"));
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return next(createError(401, "Invalid email or password"));
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h"
      }
    );

    return res.status(200).json({
      token,
      userId: user.id,
      email: user.email
    });
  } catch (err) {
    return next(err);
  }
});

// GET / account
router.get("/account", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id,
          first_name,
          surname,
          email,
          discount_available,
          created_at
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return next(createError(404, "User not found"));
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;