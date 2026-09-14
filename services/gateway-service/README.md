# Gateway Service

The frontend-facing entry point for the Cab Booking Platform. It verifies JWTs on protected routes and forwards requests to the appropriate microservice using Axios. The frontend does not call the microservices directly.


---

## Quick Start

Use the [repository local setup](../../README.md#local-setup) for installation, environment files, ports, and startup.

## Environment Variables

[Shared configuration](../../README.md#deployment-configuration) owns port and JWT settings. The Gateway requires `CUSTOMER_SERVICE_URL`, `BOOKING_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `FARE_SERVICE_URL`, and `LOCATION_SERVICE_URL`. Their deployed values are defined by the [environment bindings](../../README.md#environment-bindings).

## Middleware

Express services parse JSON request bodies with `express.json()`, enable CORS, and register a four-argument error handler after routes.

The Gateway's `requireAuth` verifies the user JWT on protected routes; `forwardAuthHeader` passes it downstream. Customer, Booking, Payment, and Location verify JWTs again and enforce resource ownership. Fare requests require a JWT at the Gateway but no user token at the Fare service.

Cloud Run IAM operates separately from application middleware. Its [service authentication contract](../../README.md#identity-and-access) also protects direct health and internal routes in the hosted environment.

## Routes

| Path group | Contract owner |
| --- | --- |
| `GET /health` | Gateway; returns `{ "status": "ok", "service": "gateway-service" }` |
| `/api/customers` | [Customer endpoints](../customer-service/README.md#endpoints) |
| `/api/bookings` | [Booking endpoints](../booking-service/README.md#endpoints) |
| `/api/payments` | [Payment endpoints](../payment-service/README.md#endpoints) |
| `/api/fare` | [Fare endpoints](../fare-estimation-service/README.md#endpoints) |
| `/api/locations` | [Location endpoints](../location-service/README.md#endpoints) |

Each contract lists Gateway and direct-service paths, HTTP methods, authentication, and examples. The Gateway passes request bodies and downstream responses through; internal notification creation is not forwarded.

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
├── utils/
│   ├── cloudRunAuth.js        Cloud Run identity tokens
│   └── configureCloudRunAxios.js  Outbound authentication interceptor
└── index.js                  Express setup and route mounting
```

---

## Testing

[Postman and Newman](../../postman/README.md) describes the local Gateway and Booking workflows, prerequisites, and expected results.

## Current Development Limitations

- `cors()` currently allows all origins.
- Gateway Axios requests do not currently set a timeout.
- Required environment variables are not validated during startup.
- Unknown routes do not yet use the JSON error format.

---

## Deployment

See [Deployment](../../README.md#deployment) for the Gateway's role in the cloud architecture, internal service authentication, and container build process.

## Documentation and Sources

- [Repository README](../../README.md)
- [Postman and Newman Tests](../../postman/README.md)
