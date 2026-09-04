// bookingEvents.js
// Event-driven side effects for booking-service using Node.js EventEmitter.
// booking.created   → sends a cab-ready notification to customer-service after a 3-minute delay (setTimeout)
// booking.completed → sends a one-time discount notification when a user completes 3 or more rides

'use strict';

const EventEmitter = require('events');
const axios = require('axios');
const pool = require('../db/pool');

const bookingEmitter = new EventEmitter();

// Event 1: booking.created → cab-ready notification
// Fires 3 minutes after a booking is created.
// Calls customer-service POST /notifications (internal, no auth required).
bookingEmitter.on('booking.created', (booking) => {
  const delay = 3 * 60 * 1000; // 3 minutes in milliseconds

  setTimeout(async () => {
    try {
      const CUSTOMER_URL = process.env.CUSTOMER_SERVICE_URL;
      await axios.post(`${CUSTOMER_URL}/notifications`, {
        user_id: booking.user_id,
        type: 'cab_ready',
        title: 'Your cab is ready',
        message: `Your ${booking.cab_type} cab is on its way. ` +
                 `From: ${booking.start_location}. To: ${booking.end_location}. ` +
                 `Passengers: ${booking.passengers}.`
      });
      console.log(`[bookingEvents] cab_ready notification sent for booking ${booking.id}`);
    } catch (err) {
      console.error('[bookingEvents] Failed to send cab_ready notification:', err.message);
    }
  }, delay);
});

// Event 2: booking.completed → discount notification
// Fires when a booking status is changed to 'completed'.
// Checks if the user has exactly 3 completed bookings and has not yet received a discount.
// If so, sends a discount notification and marks discount_notification_sent = true.
bookingEmitter.on('booking.completed', async ({ userId }) => {
  try {
    // Count completed bookings for this user
    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM bookings WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    const completedCount = parseInt(countResult.rows[0].count, 10);

    // Check if discount notification already sent
    const userResult = await pool.query(
      `SELECT discount_notification_sent FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const { discount_notification_sent } = userResult.rows[0];

    if (completedCount >= 3 && !discount_notification_sent) {
      const CUSTOMER_URL = process.env.CUSTOMER_SERVICE_URL;

      // Create discount notification
      await axios.post(`${CUSTOMER_URL}/notifications`, {
        user_id: userId,
        type: 'discount',
        title: 'You have earned a discount!',
        message: 'Congratulations! You have completed 3 rides. A 10% discount has been applied to your account.'
      });

      // Mark discount notification as sent and activate discount
      await pool.query(
        `UPDATE users SET discount_notification_sent = true, discount_available = true WHERE id = $1`,
        [userId]
      );

      console.log(`[bookingEvents] discount notification sent for user ${userId}`);
    }
  } catch (err) {
    console.error('[bookingEvents] Failed to process discount event:', err.message);
  }
});

module.exports = bookingEmitter;

