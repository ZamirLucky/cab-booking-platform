# Payment Service

Processes payments for user-owned cab bookings. The service retrieves a live base fare from Fare Estimation Service, applies the multipliers, stores an auditable payment record, marks the booking as completed, and consumes an available discount when used.

**Port:** `3003`

---

## Quick Start

From the repository root:

```powershell
cd services/payment-service
npm install
Copy-Item .env.example .env
# Replace every placeholder in .env before continuing.
npm run db:test
npm run dev
```

Expected output:

```text
payment-service running on port 3003
```

Health check:

```powershell
curl.exe http://localhost:3003/health
# { "status": "ok", "service": "payment-service" }
```

## Environment Variables

| Variable             | Required | Description                                                                                                               |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PORT`             | No       | Defaults to`3003`                                                                                                       |
| `NODE_ENV`         | No       | Use`development` locally; `test` suppresses unexpected-error logging                                                  |
| `JWT_SECRET`       | Yes      | Must match Customer Service, Gateway Service, and the other protected microservices                                       |
| `DATABASE_URL`     | Yes      | PostgreSQL connection string; the service fails at startup when it is absent                                              |
| `DB_SSL`           | No       | Set to`true` for the current Cloud SQL connection or `false` for local PostgreSQL; omitted values behave as `false` |
| `FARE_SERVICE_URL` | Yes      | Direct Fare Estimation Service URL used by`POST /payments`; use `http://localhost:3004` locally                       |

## Endpoints

Frontend requests must go through the Gateway at `http://localhost:4000`. Direct Payment Service routes on port `3003` are intended for isolated service testing.

### Public

| Method  | Gateway route | Direct service route | Purpose              |
| ------- | ------------- | -------------------- | -------------------- |
| `GET` | —            | `/health`          | Service health check |

### Protected (require `Authorization: Bearer <token>`)

| Method   | Gateway route                | Direct service route     | Purpose                              |
| -------- | ---------------------------- | ------------------------ | ------------------------------------ |
| `POST` | `/api/payments`            | `/payments`            | Process payment for an owned booking |
| `GET`  | `/api/payments/:bookingId` | `/payments/:bookingId` | Retrieve an owned booking's payment  |

The Gateway verifies protected requests before forwarding them. Payment Service verifies the JWT again with its own `requireAuth` middleware.

## Payment Rules

### `POST /payments`

The request body must contain a non-empty `booking_id`. Payment Service then:

1. Confirms that the booking belongs to the authenticated user.
2. Returns `409` if a payment already exists for that booking.
3. Requires the booking status to be `current`.
4. Calls `GET FARE_SERVICE_URL/fare` directly with the booking locations.
5. Converts the first `price_in_cents` fare to a decimal base fare.
6. Applies the configured multipliers and stores the payment.
7. Updates the booking status to `completed`.
8. Resets `users.discount_available` when a discount was used.

Fare Estimation Service is called directly rather than through the Gateway because this is an internal service-to-service request.

## Request and Response Examples

Examples below use the Gateway, which is the required entry point for the frontend.

### `POST /api/payments`

```http
POST http://localhost:4000/api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "booking_id": "booking-uuid"
}
```

Success response (`201`):

```json
{
  "id": "payment-uuid",
  "booking_id": "booking-uuid",
  "user_id": "user-uuid",
  "cab_fare": "8.50",
  "cab_multiplier": "1.20",
  "daytime_multiplier": "1.00",
  "passengers_multiplier": "1.00",
  "discount_multiplier": "1.00",
  "total_price": "10.20",
  "calculation_breakdown": {
    "base_fare_from_api": 8.5,
    "cab_type": "Premium",
    "cab_multiplier": 1.2,
    "daytime_multiplier": 1,
    "passengers": 2,
    "passengers_multiplier": 1,
    "discount_applied": false,
    "discount_multiplier": 1,
    "total_price": 10.2,
    "currency_note": "price_in_cents divided by 100",
    "start_location": "Valletta",
    "end_location": "Sliema"
  },
  "fare_snapshot": {
    "fare": {
      "journey": {
        "fares": [
          {
            "price_in_cents": 850
          }
        ]
      }
    }
  },
  "status": "paid",
  "created_at": "timestamp"
}
```

PostgreSQL `NUMERIC` columns are returned as strings by the current `pg` configuration. Values inside the JSONB calculation breakdown remain JSON numbers.

### `GET /api/payments/:bookingId`

```http
GET http://localhost:4000/api/payments/booking-uuid
Authorization: Bearer <token>
```

A successful `200` response contains the payment and user IDs, all fare and multiplier columns, `calculation_breakdown`, `status`, and `created_at`. The GET route does not return `fare_snapshot`.

### Response Statuses

| Status  | Meaning                                                                             |
| ------- | ----------------------------------------------------------------------------------- |
| `200` | Payment record returned                                                             |
| `201` | Payment processed and stored                                                        |
| `400` | `booking_id` is missing or the booking is not `current`                         |
| `401` | Bearer token is missing, invalid, or expired                                        |
| `404` | Booking or payment does not exist, or is not owned by the authenticated user        |
| `409` | A payment already exists for the booking                                            |
| `500` | Required configuration is missing, or an unexpected service/database error occurs   |
| `502` | Fare Estimation Service returned no usable fare                                     |
| `503` | Fare Estimation Service is unavailable, or the Gateway cannot reach Payment Service |

## Middleware

| Middleware       | Applied to               | Purpose                                       |
| ---------------- | ------------------------ | --------------------------------------------- |
| `cors`         | All routes               | Allows cross-origin requests                  |
| `express.json` | All routes               | Parses JSON request bodies                    |
| `requireAuth`  | Both`/payments` routes | Verifies JWT and populates`req.user`        |
| `errorHandler` | All routes, mounted last | Returns consistent`{ "error": "..." }` JSON |

## Database Tables

| Table        | Usage                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| `payments` | Stores the payment, multiplier columns, JSONB calculation breakdown, and fare snapshot |
| `bookings` | Supplies booking details and is updated to`completed` after payment                  |
| `users`    | Supplies and resets`discount_available`                                              |

### `payments` columns

| Column                    | Type          | Purpose                                |
| ------------------------- | ------------- | -------------------------------------- |
| `id`                    | UUID          | Primary key                            |
| `booking_id`            | UUID          | Foreign key to`bookings.id`          |
| `user_id`               | UUID          | Foreign key to`users.id`             |
| `cab_fare`              | NUMERIC(10,2) | Base fare from Fare Estimation Service |
| `cab_multiplier`        | NUMERIC(4,2)  | Multiplier for the selected cab type   |
| `daytime_multiplier`    | NUMERIC(4,2)  | Current daytime multiplier             |
| `passengers_multiplier` | NUMERIC(4,2)  | Multiplier based on passenger count    |
| `discount_multiplier`   | NUMERIC(4,2)  | Applied discount or`1.00`            |
| `total_price`           | NUMERIC(10,2) | Final rounded price                    |
| `calculation_breakdown` | JSONB         | Formula inputs and result              |
| `fare_snapshot`         | JSONB         | Fare response used for the calculation |
| `status`                | VARCHAR(30)   | Set to`paid`                         |
| `created_at`            | TIMESTAMP     | Payment creation time                  |

## Running Tests

Run commands from the repository root.

Prerequisites:

- Customer Service on port `3001`
- Booking Service on port `3002`
- Payment Service on port `3003`
- Fare Estimation Service on port `3004`
- Gateway Service on port `4000`
- A valid JWT and an owned booking with status `current`

There is currently no payment-specific Newman collection or runner in the repository. Use the Gateway for a manual integration check:

```powershell
$headers = @{ Authorization = 'Bearer <token>' }
$body = @{ booking_id = '<current-booking-id>' } | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:4000/api/payments' `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body $body

Invoke-RestMethod -Method Get `
  -Uri 'http://localhost:4000/api/payments/<current-booking-id>' `
  -Headers $headers
```

Confirm that the POST returns `201`, the GET returns the stored payment, the booking status becomes `completed`, and a repeated POST returns `409`.

## Service Structure

```text
services/payment-service/
|-- src/
|   |-- index.js                    Express setup and health route
|   |-- db/
|   |   |-- pool.js                 PostgreSQL connection pool
|   |   `-- testConnection.js       One-off database connection check
|   |-- middleware/
|   |   |-- errorHandler.js         Global JSON error handler
|   |   `-- requireAuth.js          JWT verification
|   `-- routes/
|       `-- paymentRoutes.js        Payment processing and retrieval
|-- .env.example                    Safe environment-variable template
|-- Dockerfile                      Deployment scaffold; not complete
|-- package.json                    Scripts and direct dependencies
|-- package-lock.json               Locked dependency versions
`-- README.md                       Service documentation
```

## Known Limitations and Future Improvements

- The service records a simulated paid transaction; it does not call a real payment provider.
- `booking_id` is checked for presence but is not currently validated as a UUID before the database query.
- Payment insertion, booking completion, and discount reset are separate queries rather than one database transaction.
- Duplicate prevention uses an application-level check and is not protected by a unique database constraint during concurrent requests.
- Payment completion updates the booking directly and does not emit Booking Service's `booking.completed` event.
- The base fare is converted from `price_in_cents`, but there is no dedicated currency field in the payment columns or calculation breakdown.

## Project Documentation

- [Main repository README
  ](../../README.md)

---

## Deployment

The existing `Dockerfile` is only a scaffold: dependency installation and source-copy steps are not yet configured. Payment Service runs locally with `npm run dev`, but it is not yet ready for Docker or Google Cloud Run deployment.
