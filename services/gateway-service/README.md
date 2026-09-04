# Gateway Service

The frontend-facing entry point for the Cab Booking Platform. It verifies JWTs on protected routes and forwards requests to the appropriate microservice using Axios. The frontend does not call the microservices directly.

**Port:** `4000`

---

## Quick Start

From the repository root:

```bash
cd services/gateway-service
npm ci
cp .env.example .env
npm run dev
```

Downstream services must also be running before their forwarded routes can be used.

Expected output:

```text
gateway-service running on port 4000
```

Health check:

```bash
curl http://localhost:4000/health
# { "status": "ok", "service": "gateway-service" }
```

Use `npm start` to run without nodemon.

---

## Environment Variables

| Variable                 | Required | Description                                                       |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| `PORT`                 | No       | Gateway port; defaults to`4000`                                 |
| `JWT_SECRET`           | Yes      | Must match Customer Service and the protected downstream services |
| `CUSTOMER_SERVICE_URL` | Yes      | `http://localhost:3001` locally                                 |
| `BOOKING_SERVICE_URL`  | Yes      | `http://localhost:3002` locally                                 |
| `PAYMENT_SERVICE_URL`  | Yes      | `http://localhost:3003` locally                                 |
| `FARE_SERVICE_URL`     | Yes      | `http://localhost:3004` locally                                 |
| `LOCATION_SERVICE_URL` | Yes      | `http://localhost:3005` locally                                 |

## Middleware

| Middleware            | Applied to       | Purpose                                                          |
| --------------------- | ---------------- | ---------------------------------------------------------------- |
| `cors`              | All routes       | Allows requests from the browser frontend                        |
| `express.json`      | All routes       | Parses JSON request bodies                                       |
| `requireAuth`       | Protected routes | Verifies`Authorization: Bearer <token>`                        |
| `forwardAuthHeader` | Protected routes | Stores the header in`req.authHeader` for downstream forwarding |
| `errorHandler`      | Mounted last     | Returns`{ "error": "..." }` for handled application errors     |

Protected Customer, Booking, Payment, and Location requests are verified by both the Gateway and the downstream microservice. Fare requests are protected at the Gateway only because Payment Service also calls Fare Estimation Service internally without a user token.

---

## Routes

### Health

| Method | Gateway path | Auth | Forwards to            |
| ------ | ------------ | ---- | ---------------------- |
| GET    | `/health`  | None | Handled by the Gateway |

### Customer Service

| Method | Gateway path                              | Auth   | Forwards to                       |
| ------ | ----------------------------------------- | ------ | --------------------------------- |
| POST   | `/api/customers/register`               | None   | `POST /register`                |
| POST   | `/api/customers/login`                  | None   | `POST /login`                   |
| GET    | `/api/customers/account`                | Bearer | `GET /account`                  |
| GET    | `/api/customers/notifications`          | Bearer | `GET /notifications`            |
| PATCH  | `/api/customers/notifications/:id/read` | Bearer | `PATCH /notifications/:id/read` |

### Booking Service

| Method | Gateway path                 | Auth   | Forwards to                    |
| ------ | ---------------------------- | ------ | ------------------------------ |
| POST   | `/api/bookings`            | Bearer | `POST /bookings`             |
| GET    | `/api/bookings/current`    | Bearer | `GET /bookings/current`      |
| GET    | `/api/bookings/past`       | Bearer | `GET /bookings/past`         |
| GET    | `/api/bookings/:id`        | Bearer | `GET /bookings/:id`          |
| PATCH  | `/api/bookings/:id/status` | Bearer | `PATCH /bookings/:id/status` |

### Payment Service

| Method | Gateway path                 | Auth   | Forwards to                  |
| ------ | ---------------------------- | ------ | ---------------------------- |
| POST   | `/api/payments`            | Bearer | `POST /payments`           |
| GET    | `/api/payments/:bookingId` | Bearer | `GET /payments/:bookingId` |

### Fare Estimation Service

| Method | Gateway path                                      | Auth   | Forwards to                         |
| ------ | ------------------------------------------------- | ------ | ----------------------------------- |
| GET    | `/api/fare?start_location=...&end_location=...` | Bearer | `GET /fare` with query parameters |

### Location Service

| Method | Gateway path                   | Auth   | Forwards to                    |
| ------ | ------------------------------ | ------ | ------------------------------ |
| POST   | `/api/locations`             | Bearer | `POST /locations`            |
| GET    | `/api/locations`             | Bearer | `GET /locations`             |
| PATCH  | `/api/locations/:id`         | Bearer | `PATCH /locations/:id`       |
| DELETE | `/api/locations/:id`         | Bearer | `DELETE /locations/:id`      |
| GET    | `/api/locations/:id/weather` | Bearer | `GET /locations/:id/weather` |

Request bodies and JSON responses are passed between the client and the selected service. See each service README for its request fields and response formats.

### Authenticated Request Example

```bash
curl http://localhost:4000/api/bookings/current \
  -H "Authorization: Bearer <token>"
```

---

## Error Handling

Each router uses the same local `handleAxiosError` pattern:

| Condition                           | Gateway response                                       |
| ----------------------------------- | ------------------------------------------------------ |
| Downstream service returns an error | Forwards its HTTP status and JSON data                 |
| `ECONNREFUSED` or `ENOTFOUND`   | `503 { "error": "Service temporarily unavailable" }` |
| Unexpected error                    | Passes to`errorHandler`, normally returning `500`  |

Handled Gateway and downstream failures return JSON. Unknown routes currently use Express's default 404 response.

---

## Gateway Structure

```text
src/
├── middleware/
│   ├── requireAuth.js        Verifies JWTs before forwarding
│   ├── forwardAuthHeader.js  Prepares the Authorization header
│   └── errorHandler.js       Handles unexpected application errors
├── routes/
│   ├── customerRoutes.js     /api/customers/*
│   ├── bookingRoutes.js      /api/bookings/*
│   ├── paymentRoutes.js      /api/payments/*
│   ├── fareRoutes.js         /api/fare
│   └── locationRoutes.js     /api/locations/*
└── index.js                  Express setup and route mounting
```

---

## Testing

The Gateway Newman workflow covers customer forwarding, Gateway-level authentication, and the `503` response when Customer Service is unavailable.

Prerequisites:

- Gateway Service on port `4000`
- Customer Service on port `3001`
- Newman installed globally

Run from the repository root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-gateway-newman-tests.ps1
```

Booking routes are covered by:

```powershell
.\scripts\run-booking-newman-tests.ps1
```

See the [Postman documentation](../../postman/README.md) for collection details and expected results.

---

## Current Development Limitations

- `cors()` currently allows all origins.
- Gateway Axios requests do not currently set a timeout.
- Required environment variables are not validated during startup.
- Unknown routes do not yet use the JSON error format.

---

## Deployment

The Dockerfile is currently a placeholder. Google Cloud Run deployment and production CORS configuration are not yet complete.

---

## Documentation and Sources

- [Repository README](../../README.md)
- [Postman and Newman Tests](../../postman/README.md)
