// bookingRoutes.js
// Handles all booking CRUD operations and status updates for booking-service.
// POST   /bookings             — create a new booking and emit booking.created event
// GET    /bookings/current     — list bookings with status 'current' for the authenticated user
// GET    /bookings/past        — list bookings with status 'completed' or 'cancelled'
// GET    /bookings/:id         — get a single booking (ownership enforced)
// PATCH  /bookings/:id/status  — update status to 'completed' or 'cancelled'; emits booking.completed on completion

'use strict';

const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const bookingEmitter = require('../events/bookingEvents');

const router = express.Router();

const VALID_CAB_TYPES = ['Economic', 'Premium', 'Executive'];
const VALID_STATUSES = ['completed', 'cancelled'];

// POST /bookings — create a new booking
router.post('/bookings', requireAuth, async (req, res, next) => {
  try {
    const { start_location, end_location, booking_datetime, passengers, cab_type } = req.body;

    // Validate required fields
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

    // Emit booking.created event for cab-ready notification (fires after 3 minutes)
    bookingEmitter.emit('booking.created', booking);

    return res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

// GET /bookings/current — list current bookings for logged-in user
// IMPORTANT: This route must be defined before GET /bookings/:id
// Otherwise Express matches "current" as the :id parameter.
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

// GET /bookings/past — list completed/cancelled bookings
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

// GET /bookings/:id — get a single booking (ownership enforced)
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

// PATCH /bookings/:id/status — update booking status
// Used for demo and testing (complete or cancel a booking).
// Also triggers the discount event when status becomes 'completed'.
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

    // Emit booking.completed for discount check
    if (status === 'completed') {
      bookingEmitter.emit('booking.completed', { userId: req.user.id });
    }

    return res.status(200).json(booking);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

