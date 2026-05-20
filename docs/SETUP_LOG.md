## Step 1.9 — Create Cloud SQL PostgreSQL Tables

### Status

Completed

### Google Cloud Project

mCabs

### Cloud SQL Instance

dp-cab-postgres

### Database

cab_booking_db

user : cap_app_user

### Tool Used

Cloud SQL Studio

### What was done

Created the database tables for the Cab Booking Platform:

- users
- notifications
- bookings
- payments
- favourite_locations
- event_log

Created indexes for common lookup fields such as user_id, email, booking status, booking date, and event name.

### Reason

The assignment requires user account details, notifications, bookings, payment details, and system data to be stored in a cloud-based database.

### Why this is good for the assignment

This provides persistent storage for the microservices and gives visible Cloud SQL evidence for the final deployment demonstration.

### Verification Query

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;


```


## Step 1.10 — PostgreSQL Pool and Connection Test

### Status

Completed

### What was done

Created `src/db/pool.js` and `src/db/testConnection.js` for:

- customer-service
- booking-service
- payment-service
- location-service

### Reason

These services need database access to store users, notifications, bookings, payments, and favourite locations.

### Verification

Each service was tested using:

```powershell
npm run db:test
```
