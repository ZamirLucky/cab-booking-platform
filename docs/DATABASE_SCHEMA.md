# Database Schema

## Database

Google Cloud SQL PostgreSQL.

## Design Rule

Use normal relational columns for stable business data. Use JSONB only for flexible external API payloads, snapshots, and calculation breakdowns.

## Tables

### users

Stores registered users.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  discount_available BOOLEAN DEFAULT FALSE,
  discount_notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### notifications

Stores inbox messages.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  payload JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### bookings

Stores cab bookings.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  booking_datetime TIMESTAMP NOT NULL,
  passengers INT NOT NULL CHECK (passengers BETWEEN 1 AND 8),
  cab_type VARCHAR(30) NOT NULL CHECK (cab_type IN ('Economic', 'Premium', 'Executive')),
  status VARCHAR(30) NOT NULL DEFAULT 'current',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### payments

Stores payment audit trail.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL,
  user_id UUID NOT NULL,
  cab_fare NUMERIC(10,2) NOT NULL,
  cab_multiplier NUMERIC(4,2) NOT NULL,
  daytime_multiplier NUMERIC(4,2) NOT NULL,
  passengers_multiplier NUMERIC(4,2) NOT NULL,
  discount_multiplier NUMERIC(4,2) DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL,
  calculation_breakdown JSONB,
  fare_snapshot JSONB,
  status VARCHAR(30) NOT NULL DEFAULT 'paid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### favourite_locations

Stores user favourite pickup locations.

```sql
CREATE TABLE favourite_locations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  label VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  weather_snapshot JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## JSONB Columns

| Column | Reason |
|---|---|
| `notifications.payload` | stores ride details or discount details dynamically |
| `payments.calculation_breakdown` | stores formula components for audit/explanation |
| `payments.fare_snapshot` | stores external fare API result snapshot |
| `favourite_locations.weather_snapshot` | stores weather API result snapshot |

## Assignment Tasks Supported

- Task 1: users and notifications
- Task 2: bookings
- Task 3: payments
- Task 4: favourite locations/weather
- Task 9: cloud database persistence
- Task 14: database explanation
