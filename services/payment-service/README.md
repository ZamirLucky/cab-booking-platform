# payment-service

Payment Service for the Cab Booking Platform. Processes payments for cab bookings, applies fare multipliers, stores a JSONB calculation breakdown for audit and demonstration, and exposes payment retrieval.

## Status

Phase 6 — implemented. Newman tests written. Pending local test run (requires all 5 services running).

## Local Port

```text
3003
```

Run command:

```powershell
cd services\payment-service
npm run dev
```

Expected output:

```text
payment-service running on port 3003
```

## Environment Variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`.

| Variable | Description |
|---|---|
| `PORT` | Payment Service port — set to `3003` |
| `JWT_SECRET` | Must match the JWT_SECRET in all other services exactly |
| `DATABASE_URL` | Full PostgreSQL connection string for Cloud SQL |
| `DB_SSL` | Set to `true` for Cloud SQL, `false` for local |
| `FARE_SERVICE_URL` | `http://localhost:3004` for local development |

## Endpoints

### Public

| Method | Route | Response |
|---|---|---|
| `GET` | `/health` | `200 { "status": "ok", "service": "payment-service" }` |

### Protected (require `Authorization: Bearer <token>`)

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/payments` | Process payment for a booking |
| `GET` | `/payments/:bookingId` | Retrieve payment for a booking |

All protected routes require a valid JWT in the `Authorization: Bearer <token>` header. The service verifies the JWT independently from the Gateway (dual verification — D-007).

## POST /payments — Request and Response

### Request body

```json
{
  "booking_id": "uuid-of-booking"
}
```

### Validation and error responses

| Condition | Status | Response |
|---|---:|---|
| Missing `booking_id` | 400 | `{ "error": "booking_id is required" }` |
| Booking not found or not owned by user | 404 | `{ "error": "Booking not found" }` |
| Payment already exists for this booking | 409 | `{ "error": "Payment already exists for this booking" }` |
| Booking status is not `current` | 400 | `{ "error": "Cannot process payment for a booking with status '...'" }` |
| Fare service unreachable | 503 | `{ "error": "Fare estimation service is unavailable" }` |
| Fare API returned no usable fare | 502 | `{ "error": "Fare API did not return a usable fare estimate" }` |
| Missing `FARE_SERVICE_URL` env var | 500 | `{ "error": "Server configuration error" }` |

### Successful response — 201

```json
{
  "id": "uuid",
  "booking_id": "uuid",
  "user_id": "uuid",
  "cab_fare": 12.50,
  "cab_multiplier": 1.20,
  "daytime_multiplier": 1.00,
  "passengers_multiplier": 1.00,
  "discount_multiplier": 1.00,
  "total_price": 15.00,
  "calculation_breakdown": { ... },
  "fare_snapshot": { ... },
  "status": "paid",
  "created_at": "2026-05-28T12:00:00.000Z"
}
```

## Payment Calculation Logic

```text
total_price = base_fare × cab_multiplier × daytime_multiplier × passengers_multiplier × discount_multiplier
```

### Multiplier values (assignment brief)

| Multiplier | Values |
|---|---|
| `cab_multiplier` | Economic = 1.00, Premium = 1.20, Executive = 1.40 |
| `daytime_multiplier` | 1.00 (reserved for future time-based pricing) |
| `passengers_multiplier` | 1–4 passengers = 1.00, 5–8 passengers = 2.00 |
| `discount_multiplier` | 0.90 if `users.discount_available = true`, otherwise 1.00 |

### Base fare source

Payment Service calls Fare Estimation Service at `GET /fare?start_location=...&end_location=...`. The base fare is extracted from `fares[0].price_in_cents / 100`. This is an internal service-to-service call — no user token is required because Fare Estimation Service has no `requireAuth`.

### JSONB calculation_breakdown

Stored in the `payments.calculation_breakdown` column. Contains:

```json
{
  "base_fare_from_api": 12.50,
  "cab_type": "Premium",
  "cab_multiplier": 1.20,
  "daytime_multiplier": 1.00,
  "passengers": 2,
  "passengers_multiplier": 1.00,
  "discount_applied": false,
  "discount_multiplier": 1.00,
  "total_price": 15.00,
  "currency_note": "price_in_cents divided by 100",
  "start_location": "Dublin Airport",
  "end_location": "Trinity College Dublin"
}
```

## GET /payments/:bookingId

Returns the payment for the given booking ID. Ownership is enforced — the payment must belong to the logged-in user.

### Successful response — 200

```json
{
  "id": "uuid",
  "booking_id": "uuid",
  "user_id": "uuid",
  "cab_fare": 12.50,
  "cab_multiplier": 1.20,
  "daytime_multiplier": 1.00,
  "passengers_multiplier": 1.00,
  "discount_multiplier": 1.00,
  "total_price": 15.00,
  "calculation_breakdown": { ... },
  "status": "paid",
  "created_at": "2026-05-28T12:00:00.000Z"
}
```

### Error responses

| Condition | Status | Response |
|---|---:|---|
| Not found or not owned by user | 404 | `{ "error": "Payment not found" }` |

## Side Effects of POST /payments

After a successful payment:

1. `bookings.status` is updated to `'completed'` for the paid booking.
2. If `discount_available = true` was used, `users.discount_available` is reset to `false`.

The `booking.completed` event (discount notification) is **not** emitted here. That event is emitted only by `PATCH /bookings/:id/status` in Booking Service.

## Running Tests — Newman

Start all five services first:

```powershell
# Terminal 1
cd services\customer-service && npm run dev

# Terminal 2
cd services\booking-service && npm run dev

# Terminal 3
cd services\fare-estimation-service && npm run dev

# Terminal 4
cd services\payment-service && npm run dev

# Terminal 5
cd services\gateway-service && npm run dev
```

Then run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-payment-service-newman-tests.ps1
```

## Middleware

| Middleware | Purpose |
|---|---|
| `requireAuth` | Verifies JWT; attaches `req.user = { id, email }` |
| `errorHandler` | Four-parameter Express error handler; returns `{ "error": message }` |

## Database Tables Used

| Table | Purpose |
|---|---|
| `payments` | INSERT payment, SELECT for duplicate check and retrieval |
| `bookings` | SELECT ownership check, UPDATE status to `completed` |
| `users` | SELECT `discount_available`, UPDATE to false if used |

## Files

```text
services/payment-service/
├── src/
│   ├── index.js                        entry point — middleware, route mounting, PORT 3003
│   ├── db/
│   │   └── pool.js                     PostgreSQL connection pool (DATABASE_URL + DB_SSL)
│   ├── middleware/
│   │   ├── errorHandler.js             global JSON error handler
│   │   └── requireAuth.js              JWT verification middleware
│   └── routes/
│       └── paymentRoutes.js            POST /payments and GET /payments/:bookingId
├── .env                                not committed
├── .env.example                        committed with placeholder values
└── package.json
```

## Sources

- Assignment brief: Task 3 (payment microservice, calculation formula, multiplier values)
- DECISION_LOG D-007: dual JWT verification
- DECISION_LOG D-020: JSONB for payment breakdown
- Express.js routing: https://expressjs.com/en/guide/routing.html
- Axios HTTP client: https://axios-http.com/docs/intro
- PostgreSQL pg module: https://node-postgres.com/
- RapidAPI Taxi Fare Calculator: used by Fare Estimation Service for base fare
