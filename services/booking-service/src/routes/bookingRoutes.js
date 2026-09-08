// Booking routes

'use strict';

const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const bookingEmitter = require('../events/bookingEvents');

const router = express.Router();

const VALID_CAB_TYPES = ['Economic', 'Premium', 'Executive'];
const VALID_STATUSES = ['completed', 'cancelled'];

// Booking creation
router.post('/bookings', requireAuth, async (req, res, next) => {
  try {
    const { start_location, end_location, booking_datetime, passengers, cab_type } = req.body;

    // Validation
    if (!start_location || !String(start_location).trim()) {
      return res.status(400).json({ error: 'start_location is required' });
    }
    if (!end_location || !String(end_location).trim()) {
      return res.status(400).json({ error: 'end_location is required' });
    }
    if (!booking_datetime) {
      return res.status(400).json({ error: 'booking_datetime is required' });
    }
    if (passengers === undefined || passengers === null) {
      return res.status(400).json({ error: 'passengers is required' });
    }
    const passengerCount = parseInt(passengers, 10);
    if (isNaN(passengerCount) || passengerCount < 1 || passengerCount > 8) {
      return res.status(400).json({ error: 'passengers must be a number between 1 and 8' });
    }
    if (!cab_type || !VALID_CAB_TYPES.includes(cab_type)) {
      return res.status(400).json({ error: `cab_type must be one of: ${VALID_CAB_TYPES.join(', ')}` });
    }

    const id = crypto.randomUUID();
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO bookings (id, user_id, start_location, end_location, booking_datetime, passengers, cab_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'current')
       RETURNING id, user_id, start_location, end_location, booking_datetime, passengers, cab_type, status, created_at`,
      [id, userId, start_location.trim(), end_location.trim(), booking_datetime, passengerCount, cab_type]
    );

    const booking = result.rows[0];

    // Cab-ready notification
    bookingEmitter.emit('booking.created', booking);

    return res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

// Current bookings
// Route order: static paths must precede /:id.
router.get('/bookings/current', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, start_location, end_location, booking_datetime, passengers, cab_type, status, created_at
       FROM bookings
       WHERE user_id = $1 AND status = 'current'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Past bookings
router.get('/bookings/past', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, start_location, end_location, booking_datetime, passengers, cab_type, status, created_at
       FROM bookings
       WHERE user_id = $1 AND status != 'current'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Booking lookup
router.get('/bookings/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, start_location, end_location, booking_datetime, passengers, cab_type, status, created_at
       FROM bookings
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Status updates
router.patch('/bookings/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, start_location, end_location, booking_datetime, passengers, cab_type, status, created_at`,
      [status, req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    // Discount eligibility
    if (status === 'completed') {
      bookingEmitter.emit('booking.completed', { userId: req.user.id });
    }

    return res.status(200).json(booking);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
