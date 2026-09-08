// Booking event handlers

'use strict';

const EventEmitter = require('events');
const axios = require('axios');
const pool = require('../db/pool');

const {
  getCloudRunAuthHeaders
} = require('../utils/cloudRunAuth');

// Notifications
async function sendCustomerNotification(notification) {
  const customerUrl = String(
    process.env.CUSTOMER_SERVICE_URL || ''
  ).replace(/\/+$/, '');

  if (!customerUrl) {
    throw new Error('CUSTOMER_SERVICE_URL is not configured');
  }

  const headers = await getCloudRunAuthHeaders(customerUrl);

  await axios.post(
    `${customerUrl}/notifications`,
    notification,
    { headers }
  );
}

const bookingEmitter = new EventEmitter();

// Cab-ready event
bookingEmitter.on('booking.created', (booking) => {
  const delay = 3 * 60 * 1000; // Three minutes

  setTimeout(async () => {
    try {
      await sendCustomerNotification({
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

// Discount event
bookingEmitter.on('booking.completed', async ({ userId }) => {
  try {
    // Eligibility
    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM bookings WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    const completedCount = parseInt(countResult.rows[0].count, 10);

    const userResult = await pool.query(
      `SELECT discount_notification_sent FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const { discount_notification_sent } = userResult.rows[0];

    if (completedCount >= 3 && !discount_notification_sent) {
      await sendCustomerNotification({
        user_id: userId,
        type: 'discount',
        title: 'You have earned a discount!',
        message: 'Congratulations! You have completed 3 rides. A 10% discount has been applied to your account.'
      });

      // Discount state
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
