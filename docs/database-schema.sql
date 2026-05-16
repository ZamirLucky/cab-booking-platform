-- Cab Booking Platform - Planned Database Schema
-- Google Cloud SQL PostgreSQL
-- TODO: Complete final SQL during database implementation phase

-- TODO: users table
-- Stores customer accounts (id, email, password_hash, name, phone, created_at)

-- TODO: notifications table
-- Stores notification records per user (id, user_id, payload JSONB, read, created_at)

-- TODO: bookings table
-- Stores ride bookings (id, user_id, pickup, dropoff, status, fare, created_at)

-- TODO: payments table
-- Stores payment records (id, booking_id, amount, breakdown JSONB, status, created_at)

-- TODO: favourite_locations table
-- Stores saved locations per user (id, user_id, label, lat, lng)

-- TODO: event_log table
-- Stores audit/event records for event-driven flows (id, event_type, payload JSONB, created_at)
