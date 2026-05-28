# gateway-service

The API Gateway is the single entry point for all client requests from the web-app. It verifies JWT tokens on protected routes and forwards requests to the appropriate downstream microservice using Axios.

## Status

Phase 6 — Payment Service forwarding: implemented. Newman tests written. Pending local test run.

## Local Port

```text
4000
```

Run command:

```powershell
cd services\gateway-service
npm run dev
```

Expected output:

```text
gateway-service running on port 4000
```

## Environment Variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`.

| Variable | Description |
|---|---|
| `PORT` | Gateway port — set to `4000` |
| `JWT_SECRET` | Must match the JWT_SECRET in all other services exactly |
| `CUSTOMER_SERVICE_URL` | `http://localhost:3001` for local development |
| `BOOKING_SERVICE_URL` | `http://localhost:3002` for local development |
| `PAYMENT_SERVICE_URL` | `http://localhost:3003` for local development |
| `FARE_SERVICE_URL` | `http://localhost:3004` for local development |
| `LOCATION_SERVICE_URL` | `http://localhost:3005` for local development |

## Middleware

| Middleware | Applied to | Purpose |
|---|---|---|
| `cors` | all routes | allows cross-origin requests from the frontend |
| `express.json` | all routes | parses JSON request bodies |
| `requireAuth` | protected routes only | verifies JWT before forwarding |
| `forwardAuthHeader` | protected routes only | copies Authorization header to `req.authHeader` |
| `errorHandler` | all routes (mounted last) | returns consistent JSON error responses |

### Why `requireAuth` runs at the Gateway

The Gateway is the first service the frontend contacts. Verifying the token at the Gateway prevents invalid tokens from ever reaching downstream microservices, reducing unnecessary traffic.

### Why microservices also verify JWT independently

Cloud Run gives each deployed service its own public HTTPS URL. A caller who knows the direct URL of a microservice could bypass the Gateway entirely. Each microservice runs its own `requireAuth` so protected routes remain secure regardless of how they are called. This is documented in DECISION_LOG D-007.

## Implemented Routes

### Public routes

| Method | Gateway route | Forwards to |
|---|---|---|
| `GET` | `/health` | — (local response) |
| `POST` | `/api/customers/register` | Customer Service `/register` |
| `POST` | `/api/customers/login` | Customer Service `/login` |

### Protected routes — Customer Service (require `Authorization: Bearer <token>`)

| Method | Gateway route | Forwards to |
|---|---|---|
| `GET` | `/api/customers/account` | Customer Service `/account` |
| `GET` | `/api/customers/notifications` | Customer Service `/notifications` |
| `PATCH` | `/api/customers/notifications/:id/read` | Customer Service `/notifications/:id/read` |

### Protected routes — Booking Service (require `Authorization: Bearer <token>`)

| Method | Gateway route | Forwards to |
|---|---|---|
| `POST` | `/api/bookings` | Booking Service `/bookings` |
| `GET` | `/api/bookings/current` | Booking Service `/bookings/current` |
| `GET` | `/api/bookings/past` | Booking Service `/bookings/past` |
| `GET` | `/api/bookings/:id` | Booking Service `/bookings/:id` |
| `PATCH` | `/api/bookings/:id/status` | Booking Service `/bookings/:id/status` |

**Route path note:** The booking router is mounted at `/api/bookings`. Route definitions use only the suffix after the mount point (`/`, `/current`, `/:id`, etc.) — not the full path. Repeating `/bookings` in the route definition would produce a double-prefix path like `POST /api/bookings/bookings` and cause 404 errors.

### Protected routes — Fare Estimation Service (require `Authorization: Bearer <token>`)

| Method | Gateway route | Forwards to |
|---|---|---|
| `GET` | `/api/fare?start_location=...&end_location=...` | Fare Estimation Service `/fare` |

The fare router is mounted at `/api/fare`. The route inside the router is `GET /` — not `GET /fare`. Forwarding passes `params: req.query` so `start_location` and `end_location` are forwarded to the service automatically.

The fare-estimation-service itself has no `requireAuth`. This protects the Gateway-facing endpoint for frontend users while allowing Payment Service to call the service internally without a token.

### Protected routes — Payment Service (require `Authorization: Bearer <token>`)

| Method | Gateway route | Forwards to |
|---|---|---|
| `POST` | `/api/payments` | Payment Service `/payments` |
| `GET` | `/api/payments/:bookingId` | Payment Service `/payments/:bookingId` |

## Planned Routes (future phases)

| Prefix | Forwards to |
|---|---|
| `/api/locations` | Location Service |

## Axios Error Forwarding

All route handlers use a shared `handleAxiosError` helper:

| Condition | Gateway response |
|---|---|
| Downstream returned 4xx or 5xx | Forward exact status and body unchanged |
| Service is unreachable (`ECONNREFUSED` or `ENOTFOUND`) | `503 { "error": "Service temporarily unavailable" }` |
| Unexpected error | `next(err)` — reaches global `errorHandler` |

The `err.response` check is required. Without it, a 404 or 401 from a downstream service would be treated as an unexpected error and returned to the client as a 500.

## Running Tests — Newman (fast, repeatable)

Newman is the command-line Postman runner. It executes all requests in sequence automatically.

**Start both services first:**

```powershell
# Terminal 1
cd services\customer-service
npm run dev

# Terminal 2
cd services\gateway-service
npm run dev
```

**Allow scripts and run:**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-gateway-newman-tests.ps1
```

The script runs the 9-request forwarding suite. If all pass, it pauses and asks whether to run the service-down test. Answer `Y` after stopping Customer Service (Gateway must stay running).

**Run Booking Service tests (Phase 4):**

```powershell
.\scripts\run-booking-newman-tests.ps1
```

All three services must be running (Customer on 3001, Booking on 3002, Gateway on 4000). The script runs the 12-request normal flow, then optionally the service-down test and cab-ready event test.

**Run Fare Estimation tests (Phase 5):**

```powershell
.\scripts\run-fare-newman-tests.ps1
```

Customer Service (3001), Fare Estimation (3004), and Gateway (4000) must be running. The script registers a fresh user, runs the 8-request normal flow, then optionally the service-down test.

**Run Payment Service tests (Phase 6):**

```powershell
.\scripts\run-payment-service-newman-tests.ps1
```

All five services must be running: Customer (3001), Booking (3002), Payment (3003), Fare Estimation (3004), and Gateway (4000). The script registers two fresh users, runs the 9-request normal flow (health, create booking, auth, validation, wrong-owner, valid payment, get payment, duplicate payment, booking in past), then optionally the service-down test.

**Run a single collection manually:**

```powershell
newman run postman/cab-booking-gateway-customer-forwarding.postman_collection.json `
  -e postman/cab-booking-local.postman_environment.json `
  --reporters cli --verbose
```

## Test Instructions (Postman UI — manual alternative)

Use environment `Cab Booking Local` with `gatewayUrl = http://localhost:4000`. Both services must be running.

1. `GET {{gatewayUrl}}/health` → `200 { "status": "ok", "service": "gateway-service" }`
2. `POST {{gatewayUrl}}/api/customers/register` → `201`
3. `POST {{gatewayUrl}}/api/customers/login` → `200` with `token`
4. `GET {{gatewayUrl}}/api/customers/account` (no Authorization) → `401` — Gateway's own `requireAuth` rejects; Customer Service never receives this
5. `GET {{gatewayUrl}}/api/customers/account` (with token) → `200`
6. `GET {{gatewayUrl}}/api/customers/notifications` (with token) → `200`
7. `PATCH {{gatewayUrl}}/api/customers/notifications/:id/read` (with token) → `200`
8. Stop Customer Service. `GET {{gatewayUrl}}/api/customers/account` → `503` — Gateway must not crash

Test 4 confirms Gateway-level auth enforcement. Test 8 confirms the `ECONNREFUSED` handling in `handleAxiosError`.

## Files

```text
services/gateway-service/
├── src/
│   ├── index.js                        entry point — middleware and route mounting
│   ├── middleware/
│   │   ├── errorHandler.js             global JSON error handler
│   │   ├── requireAuth.js              JWT verification middleware
│   │   └── forwardAuthHeader.js        copies Authorization header to req.authHeader
│   └── routes/
│       ├── customerRoutes.js           forwards /api/customers/* to customer-service
│       ├── bookingRoutes.js            forwards /api/bookings/* to booking-service (phase 4)
│       ├── fareRoutes.js               forwards /api/fare to fare-estimation-service (phase 5)
│       ├── paymentRoutes.js            forwards /api/payments/* to payment-service (phase 6)
│       └── locationRoutes.js           stub (to be implemented)
├── .env                                not committed
├── .env.example                        committed with placeholder values
└── package.json
```

## Sources

- DECISION_LOG D-005: Gateway as single API entry point
- DECISION_LOG D-007: dual JWT verification rationale
- Assignment brief: Task 7 (web app through Gateway API), Task 11 (hosted communication)
- Express.js routing documentation: https://expressjs.com/en/guide/routing.html
- Axios HTTP client documentation: https://axios-http.com/docs/intro
