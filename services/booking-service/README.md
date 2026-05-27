# booking-service

Handles cab bookings for the Cab Booking Platform. Creates bookings, tracks status, and emits events that trigger customer notifications.

## Status

Phase 4 — implemented and tested locally.

## Local Port

```text
3002
```

Run command:

```powershell
cd services\booking-service
npm run dev
```

Expected output:

```text
booking-service running on port 3002
```

## Environment Variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`.

| Variable | Description |
|---|---|
| `PORT` | Service port — set to `3002` |
| `NODE_ENV` | Set to `development` locally |
| `DATABASE_URL` | PostgreSQL connection string (Cloud SQL or local) |
| `DB_SSL` | Set to `true` for Cloud SQL, `false` for local |
| `JWT_SECRET` | Must match the JWT_SECRET in all other services exactly |
| `CUSTOMER_SERVICE_URL` | `http://localhost:3001` for local development |

## Endpoints

### Public

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | service health check |

### Protected (require `Authorization: Bearer <token>`)

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/bookings` | create a new booking |
| `GET` | `/bookings/current` | list bookings with status `current` for the logged-in user |
| `GET` | `/bookings/past` | list bookings with status `completed` or `cancelled` for the logged-in user |
| `GET` | `/bookings/:id` | get a single booking (ownership enforced) |
| `PATCH` | `/bookings/:id/status` | update a booking status to `completed` or `cancelled` |

All protected routes are verified with `requireAuth` inside this service as well as at the Gateway. This dual-verification pattern is documented in DECISION_LOG D-007.

## Validation Rules

### POST /bookings

| Field | Rule |
|---|---|
| `start_location` | required, non-empty string |
| `end_location` | required, non-empty string |
| `booking_datetime` | required |
| `passengers` | integer, must be between 1 and 8 inclusive |
| `cab_type` | must be exactly one of: `Economic`, `Premium`, `Executive` |

### PATCH /bookings/:id/status

| Field | Rule |
|---|---|
| `status` | must be exactly one of: `completed`, `cancelled` |

## Request and Response Examples

### POST /bookings

Request:

```http
POST /bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "start_location": "Valletta",
  "end_location": "Sliema",
  "booking_datetime": "2026-06-01T10:00:00.000Z",
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
  "booking_datetime": "2026-06-01T10:00:00.000Z",
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

### GET /bookings/current

```http
GET /bookings/current
Authorization: Bearer <token>
```

Success response (`200`) — array of booking objects with `status: "current"`.

### PATCH /bookings/:id/status

```http
PATCH /bookings/uuid/status
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "completed" }
```

Success response (`200`) — updated booking object.

## Events

Events are implemented in `src/events/bookingEvents.js` using Node.js `EventEmitter`.

### booking.created → cab-ready notification

Emitted inside `POST /bookings` after the booking is inserted. A `setTimeout` fires after 3 minutes and calls `POST /notifications` on Customer Service to create a `cab_ready` notification for the user. The route returns 201 immediately — the notification fires in the background.

### booking.completed → discount notification

Emitted inside `PATCH /bookings/:id/status` when the new status is `completed`. The handler counts the user's completed bookings. If the count reaches 3 or more and `discount_notification_sent` is still false, a discount notification is sent to Customer Service, and `discount_available` and `discount_notification_sent` are set to true in the `users` table. This ensures the discount is only awarded once.

## Middleware

| Middleware | Applied to | Purpose |
|---|---|---|
| `cors` | all routes | allows cross-origin requests |
| `express.json` | all routes | parses JSON request bodies |
| `requireAuth` | all `/bookings` routes | verifies JWT |
| `errorHandler` | all routes (mounted last) | returns consistent JSON error responses |

## Database Tables

| Table | Usage |
|---|---|
| `bookings` | all booking CRUD operations |
| `users` | discount flag reads and updates (`discount_available`, `discount_notification_sent`) |

## Running Tests

**Prerequisites:** Customer Service (port 3001), Booking Service (port 3002), and Gateway (port 4000) must all be running.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-booking-newman-tests.ps1
```

The script runs the normal flow suite (12 requests), registers a fresh test user per run so no database cleanup is needed. If all tests pass, it prompts whether to run the service-down test (stop Booking Service first, then answer `Y`). It also prompts for the cab-ready event test which waits 190 seconds for the delayed notification.

To run a single collection manually:

```powershell
newman run postman/cab-booking-booking-service.postman_collection.json `
  -e postman/cab-booking-local.postman_environment.json `
  --reporters cli --verbose
```

## Files

```text
services/booking-service/
├── src/
│   ├── index.js                        entry point — middleware, routes, event listeners
│   ├── middleware/
│   │   ├── requireAuth.js              JWT verification (same pattern as customer-service)
│   │   └── errorHandler.js             global JSON error handler
│   ├── routes/
│   │   └── bookingRoutes.js            all five booking endpoints
│   ├── events/
│   │   └── bookingEvents.js            EventEmitter: cab-ready (3 min) and discount events
│   └── db/
│       └── pool.js                     pg Pool using DATABASE_URL and DB_SSL
├── .env                                not committed
├── .env.example                        committed with placeholder values
└── package.json
```

## Sources

- DECISION_LOG D-007: dual JWT verification
- DECISION_LOG D-008: Express middleware, no separate middleware service
- Assignment brief: Task 2 (bookings), Task 5 (discount event), Task 6 (cab-ready event)
- Express.js routing documentation: https://expressjs.com/en/guide/routing.html
- Node.js EventEmitter documentation: https://nodejs.org/api/events.html
