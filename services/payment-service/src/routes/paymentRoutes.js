// Payment routes

'use strict';

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const {
  getCloudRunAuthHeaders
} = require('../utils/cloudRunAuth');

const router = express.Router();

// Pricing rules
const CAB_MULTIPLIERS = {
  Economic:  1.00,
  Premium:   1.20,
  Executive: 1.40
};

function getPassengersMultiplier(passengers) {
  return passengers <= 4 ? 1.00 : 2.00;
}

function getDaytimeMultiplier() {
  return 1.00;
}

// Payment creation
router.post('/payments', requireAuth, async (req, res, next) => {
  try {
    const { booking_id } = req.body;
    const userId = req.user.id;

    // Validation
    if (!booking_id || !String(booking_id).trim()) {
      return res.status(400).json({ error: 'booking_id is required' });
    }

    // Booking ownership
    const bookingResult = await pool.query(
      `SELECT id, user_id, start_location, end_location, booking_datetime,
              passengers, cab_type, status
       FROM bookings
       WHERE id = $1 AND user_id = $2`,
      [booking_id, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Idempotency
    const existingPayment = await pool.query(
      'SELECT id FROM payments WHERE booking_id = $1', [booking_id]
    );
    if (existingPayment.rows.length > 0) {
      return res.status(409).json({ error: 'Payment already exists for this booking' });
    }

    // Booking state
    if (booking.status !== 'current') {
      return res.status(400).json({
        error: `Cannot process payment for a booking with status '${booking.status}'`
      });
    }

    // Fare service
    const fareUrl = String(
      process.env.FARE_SERVICE_URL || ''
    ).replace(/\/+$/, '');

    if (!fareUrl) {
      console.error('[paymentRoutes] FARE_SERVICE_URL is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let fareData;
    let fareSnapshot;

    try {
      const cloudRunHeaders = await getCloudRunAuthHeaders(fareUrl);

      const fareResponse = await axios.get(`${fareUrl}/fare`, {
        params: {
          start_location: booking.start_location,
          end_location: booking.end_location
        },
        headers: cloudRunHeaders
      });

      fareSnapshot = fareResponse.data;
      fareData = fareResponse.data.fare;

    } catch (fareErr) {
      console.error('[paymentRoutes] Fare service error:', fareErr.message);
      if (fareErr.response) {
        return res.status(503).json({ error: 'Fare estimation service returned an error' });
      }
      return res.status(503).json({ error: 'Fare estimation service is unavailable' });
    }

    // Fare normalization
    const fares = fareData?.journey?.fares;
    if (!fares || fares.length === 0 || fares[0].price_in_cents === 'n/a') {
      return res.status(502).json({ error: 'Fare API did not return a usable fare estimate' });
    }

    const cabFare = parseFloat((fares[0].price_in_cents / 100).toFixed(2));

    // Multipliers
    const cabMultiplier       = CAB_MULTIPLIERS[booking.cab_type] ?? 1.00;
    const daytimeMultiplier   = getDaytimeMultiplier();
    const passengersMultiplier = getPassengersMultiplier(booking.passengers);

    // Discount
    const userResult = await pool.query(
      'SELECT discount_available FROM users WHERE id = $1',
      [userId]
    );
    const discountAvailable = userResult.rows[0]?.discount_available ?? false;
    const discountMultiplier = discountAvailable ? 0.90 : 1.00;

    // Total
    const totalPrice = parseFloat(
      (cabFare * cabMultiplier * daytimeMultiplier * passengersMultiplier * discountMultiplier).toFixed(2)
    );

    // Audit snapshot
    const calculationBreakdown = {
      base_fare_from_api: cabFare,
      cab_type:           booking.cab_type,
      cab_multiplier:     cabMultiplier,
      daytime_multiplier: daytimeMultiplier,
      passengers:         booking.passengers,
      passengers_multiplier: passengersMultiplier,
      discount_applied:   discountAvailable,
      discount_multiplier: discountMultiplier,
      total_price:        totalPrice,
      currency_note:      'price_in_cents divided by 100',
      start_location:     booking.start_location,
      end_location:       booking.end_location
    };

    // Payment persistence
    const paymentId = crypto.randomUUID();

    const paymentResult = await pool.query(
      `INSERT INTO payments
         (id, booking_id, user_id, cab_fare, cab_multiplier, daytime_multiplier,
          passengers_multiplier, discount_multiplier, total_price,
          calculation_breakdown, fare_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'paid')
       RETURNING *`,
      [
        paymentId,
        booking_id,
        userId,
        cabFare,
        cabMultiplier,
        daytimeMultiplier,
        passengersMultiplier,
        discountMultiplier,
        totalPrice,
        JSON.stringify(calculationBreakdown),
        JSON.stringify(fareSnapshot)
      ]
    );

    // Booking completion
    await pool.query(
      `UPDATE bookings SET status = 'completed' WHERE id = $1 AND user_id = $2`,
      [booking_id, userId]
    );

    // Discount redemption
    if (discountAvailable) {
      await pool.query(
        'UPDATE users SET discount_available = false WHERE id = $1',
        [userId]
      );
    }

    return res.status(201).json(paymentResult.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Payment lookup
router.get('/payments/:bookingId', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, booking_id, user_id, cab_fare, cab_multiplier, daytime_multiplier,
              passengers_multiplier, discount_multiplier, total_price,
              calculation_breakdown, status, created_at
       FROM payments
       WHERE booking_id = $1 AND user_id = $2`,
      [req.params.bookingId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
