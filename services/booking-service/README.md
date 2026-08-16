# Booking Service

Creates and retrieves user-owned cab bookings, updates booking statuses, and emits booking-related notification events through Node.js `EventEmitter`. The service schedules a cab-ready notification three minutes after a booking is created and checks discount eligibility when a booking is marked as completed through this service.

**Port:** `3002`

---

## Quick Start

From the repository root:

```powershell
cd services/booking-service
npm install
Copy-Item .env.example .env
# Fill .env with real local values before starting the service.
npm run dev
```

Expected output:

```text
booking-service running on port 3002
```

Health check:

```powershell
curl.exe http://localhost:3002/health
# { "status": "ok", "service": "booking-service" }
```

---

## Environment Variables

Copy `.env.example` to `.env` and replace its placeholder values.

| Variable                 | Required    | Description                                                                                                               |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                 | No          | Defaults to`3002`                                                                                                       |
| `NODE_ENV`             | No          | Use`development` locally; `test` suppresses unexpected-error logging                                                  |
| `JWT_SECRET`           | Yes         | Must match the secret used by Customer Service and Gateway Service                                                        |
| `DATABASE_URL`         | Yes         | PostgreSQL connection string; the service fails at startup when it is absent                                              |
| `DB_SSL`               | No          | Set to`true` for the current Cloud SQL connection or `false` for local PostgreSQL; omitted values behave as `false` |
| `CUSTOMER_SERVICE_URL` | Conditional | Required by the cab-ready and discount handlers; use`http://localhost:3001` locally                                     |

## Endpoints

Frontend and external client requests should go through the Gateway at `http://localhost:4000`. The `/bookings` paths are direct Booking Service routes and are mainly useful for isolated service testing.

### Public

| Method  | Direct service route | Purpose              |
| ------- | -------------------- | -------------------- |
| `GET` | `/health`          | Service health check |

### Protected (require `Authorization: Bearer <token>`)

| Method    | Gateway route                | Direct service route     | Purpose                                                  |
| --------- | ---------------------------- | ------------------------ | -------------------------------------------------------- |
| `POST`  | `/api/bookings`            | `/bookings`            | Create a new booking                                     |
| `GET`   | `/api/bookings/current`    | `/bookings/current`    | List the logged-in user's`current` bookings            |
| `GET`   | `/api/bookings/past`       | `/bookings/past`       | List the logged-in user's non-current bookings           |
| `GET`   | `/api/bookings/:id`        | `/bookings/:id`        | Get one owned booking                                    |
| `PATCH` | `/api/bookings/:id/status` | `/bookings/:id/status` | Change an owned booking to`completed` or `cancelled` |

Requests made through the Gateway are verified there before forwarding. Booking Service verifies the JWT again with its own `requireAuth` middleware. A direct service request bypasses the Gateway but still requires a valid token.

## Validation Rules

### `POST /bookings`

| Field                | Current rule                                                                         |
| -------------------- | ------------------------------------------------------------------------------------ |
| `start_location`   | Required; clients should send a non-empty string, which is trimmed before storage    |
| `end_location`     | Required; clients should send a non-empty string, which is trimmed before storage    |
| `booking_datetime` | Required, but its format and whether it is in the future are not currently validated |
| `passengers`       | Required; parsed with`parseInt`, and the resulting value must be between 1 and 8   |
| `cab_type`         | Must be exactly one of`Economic`, `Premium`, or `Executive`                    |

The current implementation assumes both location values are strings when it calls `.trim()`. It also does not perform strict integer-type validation before parsing `passengers`. These are recorded under [Known Limitations and Future Improvements](#known-limitations-and-future-improvements).

### `PATCH /bookings/:id/status`

| Field      | Current rule                                         |
| ---------- | ---------------------------------------------------- |
| `status` | Must be exactly one of`completed` or `cancelled` |

The route enforces ownership but does not enforce a full state-transition model. For example, a previously completed or cancelled booking can be patched again.

## Request and Response Examples

Examples below use the Gateway, which is the required entry point for the frontend.

### `POST /api/bookings`

Request:

```http
POST http://localhost:4000/api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "start_location": "Valletta",
  "end_location": "Sliema",
  "booking_datetime": "2027-06-01T10:00:00.000Z",
  "passengers": 2,
  "cab_type": "Economic"
}
```

Success response (`201`):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "start_location": "Valletta",
  "end_location": "Sliema",
  "booking_datetime": "2027-06-01T10:00:00.000Z",
  "passengers": 2,
  "cab_type": "Economic",
  "status": "current",
  "created_at": "timestamp"
}
```

Validation error (`400`):

```json
{ "error": "cab_type must be one of: Economic, Premium, Executive" }
```

### `GET /api/bookings/current`

```http
GET http://localhost:4000/api/bookings/current
Authorization: Bearer <token>
```

Success response (`200`) — an array of booking objects with `status: "current"`.

### `PATCH /api/bookings/:id/status`

```http
PATCH http://localhost:4000/api/bookings/uuid/status
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "completed" }
```

Success response (`200`) — the updated booking object.

### Response Statuses

| Status  | Meaning                                                          |
| ------- | ---------------------------------------------------------------- |
| `200` | Booking retrieved, list returned, or status updated              |
| `201` | Booking created                                                  |
| `400` | Request validation failed                                        |
| `401` | Bearer token is missing, invalid, or expired                     |
| `404` | Booking does not exist or is not owned by the authenticated user |
| `500` | Unexpected Booking Service or database error                     |
| `503` | Gateway could not reach Booking Service                          |

## Events

Events are implemented in `src/events/bookingEvents.js` using Node.js `EventEmitter`.

### `booking.created` → cab-ready notification

Emitted inside `POST /bookings` after the booking is inserted. A `setTimeout` fires after three minutes and calls `POST /notifications` on Customer Service to create a `cab_ready` notification containing the cab type, start location, end location, and passenger count. The booking route returns `201` immediately while the delayed work continues in the background.

### `booking.completed` → discount notification

Emitted inside `PATCH /bookings/:id/status` when the new status is `completed`. The handler counts the user's completed bookings. If the count is three or more and `discount_notification_sent` is false, it sends a discount notification through Customer Service and sets `discount_available` and `discount_notification_sent` to `true`.

The database flag prevents later sequential events from awarding another discount. It is not an atomic exactly-once guarantee if multiple completion events are processed concurrently.

## Middleware

| Middleware       | Applied to               | Purpose                                 |
| ---------------- | ------------------------ | --------------------------------------- |
| `cors`         | All routes               | Allows cross-origin requests            |
| `express.json` | All routes               | Parses JSON request bodies              |
| `requireAuth`  | All`/bookings` routes  | Verifies JWT and populates`req.user`  |
| `errorHandler` | All routes, mounted last | Returns consistent JSON error responses |

## Database Tables

| Table        | Usage                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `bookings` | Booking creation, retrieval, listing, status updates, and completed-ride counting                |
| `users`    | Discount flag reads and updates through`discount_available` and `discount_notification_sent` |

## Running Tests

Run the test runner from the repository root, not from `services/booking-service`.

Prerequisites:

- Customer Service running on port `3001`
- Booking Service running on port `3002`
- Gateway Service running on port `4000`
- Newman installed globally with `npm install -g newman`

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-booking-newman-tests.ps1
```

The runner contains four stages:

| Stage               | Requests | Behaviour                                                                                                           |
| ------------------- | -------: | ------------------------------------------------------------------------------------------------------------------- |
| Normal booking flow |       12 | Registers a fresh user, logs in, validates booking creation and errors, retrieves bookings, and completes a booking |
| Service-down test   |        1 | Optional; Booking Service must be stopped, and the Gateway must return`503`                                       |
| Cab-ready event     |        2 | Optional; creates a booking, waits 190 seconds, and checks for the delayed notification                             |
| Discount event      |       12 | Optional; uses a fresh user, completes four booking cycles, and confirms that only one discount notification exists |

The normal stage always runs. The remaining stages are prompted. Restart Booking Service after the service-down stage before running either event stage. Fresh users make the normal and discount workflows repeatable without database cleanup.

## Service Structure

```text
services/booking-service/
|-- src/
|   |-- index.js                    Express setup, health route, event registration
|   |-- db/
|   |   |-- pool.js                 PostgreSQL connection pool
|   |   `-- testConnection.js       One-off database connection check
|   |-- events/
|   |   `-- bookingEvents.js        Cab-ready and discount listeners
|   |-- middleware/
|   |   |-- errorHandler.js         Global JSON error handler
|   |   `-- requireAuth.js          JWT verification
|   `-- routes/
|       `-- bookingRoutes.js        Five booking endpoints
|-- .env.example                    Safe environment-variable template
|-- Dockerfile                      Deployment scaffold; not complete
|-- package.json                    Scripts and direct dependencies
|-- package-lock.json               Locked dependency versions
`-- README.md                       Service documentation
```

## Limitations and Future Improvements

- `EventEmitter` and `setTimeout` run inside the Booking Service process. Restarting the service during the three-minute window permanently loses the pending cab-ready notification.
- Failed calls to Customer Service are logged but are not retried.
- Cancelling a booking during the three-minute window does not cancel its already scheduled cab-ready notification.
- Payment Service completion does not emit `booking.completed`; therefore, it does not currently trigger the discount handler.
- The discount check and flag update are not atomic, so simultaneous completion events are not protected by a strict exactly-once mechanism.
- Start and end locations are free-text strings. A future version could add address autocomplete, geocoding, and coordinates.
- `booking_datetime` is required but is not currently checked for a valid date or a future time.
- Passenger parsing and location type validation could be made stricter.
- The status route accepts only `completed` and `cancelled`, but it does not enforce allowed transitions from the booking's existing status.

## Project documentation

- [Main repository README](../../README.md)

---

## Deployment

The existing `Dockerfile` is only a scaffold: dependency installation and source-copy steps are not yet configured. The service runs locally with `npm run dev`, but it is not yet ready for Docker or Google Cloud Run deployment.
