# References

This file documents and references AI integrity, the technology,  and the documentation used for the project.

---

## 1. Runtime, Frameworks, and npm Packages

### Node.js

**Version:** 20 (as specified in each service's `Dockerfile`: `FROM node:20-alpine`)
**URL:** https://nodejs.org/

Used as the runtime for all six services: gateway-service, customer-service, booking-service, payment-service, fare-estimation-service, and location-service.

---

### express

**Version:** ^5.2.1 (recorded in each service's `package.json`)
**URL:** https://expressjs.com/

Used in all services to create the HTTP server, define routes with `express.Router()`, apply middleware with `app.use()`, parse JSON request bodies with `express.json()`, and return JSON responses with `res.status().json()`.

---

### cors

**Version:** ^2.8.6
**URL:** https://www.npmjs.com/package/cors

Used in all services to enable Cross-Origin Resource Sharing, allowing the frontend to call the Gateway API from a different origin. Applied with `app.use(cors())` before route handlers.

---

### dotenv

**Version:** ^17.4.2
**URL:** https://www.npmjs.com/package/dotenv

Used in all services. Loads environment variables from a local `.env` file into `process.env` at startup via `require('dotenv').config()`. Used to keep database credentials, JWT secrets, and API keys out of source code.

---

### axios

**Version:** ^1.16.1
**URL:** https://axios-http.com/

Used in gateway-service, booking-service, payment-service, fare-estimation-service, and location-service. Used for HTTP requests between services (Gateway forwarding to microservices, Payment Service calling Fare Estimation Service internally) and from microservices to external APIs. Error handling uses `err.response` for upstream HTTP errors and `err.code` for network-level failures such as `ECONNREFUSED`.

---

### pg (node-postgres)

**Version:** ^8.21.0
**URL:** https://node-postgres.com/

Used in customer-service, booking-service, payment-service, and location-service. The `Pool` class manages PostgreSQL connections. All queries use `$1`, `$2` positional parameters to prevent SQL injection. SSL is enabled for connections to Google Cloud SQL using `ssl: { rejectUnauthorized: false }`.

---

### bcrypt

**Version:** ^6.0.0
**URL:** https://www.npmjs.com/package/bcrypt

Used in customer-service only. `bcrypt.hash(password, 10)` hashes the user's password before storage. `bcrypt.compare(plain, hash)` verifies a login password against the stored hash. Plain-text passwords are never stored.

---

### jsonwebtoken

**Version:** ^9.0.3
**URL:** https://www.npmjs.com/package/jsonwebtoken

Used in customer-service to sign tokens, and in gateway-service, booking-service, payment-service, and location-service to verify them. Login issues a token via `jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' })`. Protected routes verify the token with `jwt.verify()` in `requireAuth` middleware.

Reference: https://jwt.io/introduction

---

### nodemon

**Version:** ^3.1.14 (devDependency)
**URL:** https://www.npmjs.com/package/nodemon

Used in all services during local development. Automatically restarts the service when source files change. Invoked via the `npm run dev` script. Not present in production containers.

---

## 2. Node.js Built-in Modules

### crypto.randomUUID()

**Docs:** https://nodejs.org/api/crypto.html#cryptorandomuuidoptions

Used in customer-service, booking-service, payment-service, and location-service to generate UUID v4 strings as primary keys for new database rows. Used in preference to an external package because `crypto.randomUUID()` has been built into Node.js since v15.

### EventEmitter

**Docs:** https://nodejs.org/api/events.html#class-eventemitter

Used in booking-service (`src/events/bookingEvents.js`). A single `EventEmitter` instance handles two internal events: `booking.created` and `booking.completed`. Listeners are registered at service startup. This decouples notification side effects from the HTTP route handler.

### setTimeout

**Docs:** https://nodejs.org/api/timers.html#settimeoutcallback-delay-args

Used in booking-service inside the `booking.created` event handler to delay the cab-ready notification by three minutes: `setTimeout(async () => { ... }, 3 * 60 * 1000)`. The route returns a response immediately; the notification fires in the background after the delay.

### process.env

**Docs:** https://nodejs.org/api/process.html#processenv

Used in all services to read runtime configuration: `PORT`, `JWT_SECRET`, `DATABASE_URL`, inter-service URLs, and external API keys. Values are supplied via `.env` files locally and would be supplied via environment variable configuration in any hosted environment.

---

## 3. Database and SQL References

### PostgreSQL — Data Types

**Docs:** https://www.postgresql.org/docs/current/datatype.html

Referenced for column type decisions across all tables: `UUID`, `VARCHAR`, `TEXT`, `BOOLEAN`, `NUMERIC`, `TIMESTAMP`, `INT`, and `JSONB`.

### PostgreSQL — JSONB

**Docs:** https://www.postgresql.org/docs/current/datatype-json.html

`JSONB` columns are used where data is structurally flexible or originates from an external API. Specifically:

- `notifications.payload` — variable notification data
- `payments.calculation_breakdown` — fare formula components stored for audit
- `payments.fare_snapshot` — raw response from the Taxi Fare API
- `favourite_locations.weather_snapshot` — raw response from WeatherAPI.com

Stable business data (names, amounts, statuses, foreign keys) uses normal typed columns.

### PostgreSQL — JSON Functions and Operators

**Docs:** https://www.postgresql.org/docs/current/functions-json.html

Referenced when querying JSONB columns in verification scripts and Cloud SQL Studio.

### PostgreSQL — INSERT … RETURNING

**Docs:** https://www.postgresql.org/docs/current/dml-returning.html

Used throughout to return the newly created or updated row immediately after an `INSERT` or `UPDATE`, avoiding a second `SELECT` query.

### PostgreSQL — Error Codes

**Docs:** https://www.postgresql.org/docs/current/errcodes-appendix.html

`23505` (unique_violation) is caught when a duplicate email is registered and returned as 409 Conflict. `23503` (foreign_key_violation) is caught when a notification references a non-existent user and returned as 404.

### node-postgres — Parameterised Queries

**Docs:** https://node-postgres.com/features/queries

All database queries use positional parameters (`$1`, `$2`, …) rather than string interpolation to prevent SQL injection.

---

## 4. Google Cloud and Local Infrastructure

Google Cloud SQL for PostgreSQL was used as the managed database. The database instance, database, and Google Cloud project  were created and configured via the Google Cloud console. Tables were created using Cloud SQL Studio.

All services connected to Cloud SQL from the local development environment using the `DATABASE_URL` environment variable and the `pg` package with SSL enabled.

**docs:** https://cloud.google.com/sql/docs/postgres

Dockerfiles (`FROM node:20-alpine`) were prepared for each service to standardise the local environment and prepare for future containerisation. The services have not been deployed to Google Cloud Run yet.

---

## 5. External APIs

### RapidAPI — Taxi Fare Calculator

**URL:** https://rapidapi.com/3b-data-3b-data-default/api/taxi-fare-calculator

Used by the Fare Estimation Service. The `GET /fare` route calls the RapidAPI endpoint via Axios with `start_location` and `end_location` parameters and returns a structured fare estimate. The Payment Service calls the Fare Estimation Service internally (service-to-service) to retrieve `base_fare` before applying the multiplier formula.

The API key is stored in `FARE_API_KEY` and the host string in `FARE_API_HOST`, both in the local `.env` file.

---

### WeatherAPI.com

**docs:** https://www.weatherapi.com/docs/

Used by the Location Service. The `GET /locations/:id/weather` route retrieves the saved address from `favourite_locations`, calls WeatherAPI.com via Axios, and stores the full raw JSON response in the `weather_snapshot` JSONB column. A structured summary of the response is returned to the caller.

**Endpoint used:**

```
GET https://api.weatherapi.com/v1/forecast.json
  ?key=<WEATHER_API_KEY>
  &q=<address>
  &days=1
  &aqi=no
  &alerts=no
```

The API key is stored in `WEATHER_API_KEY` in the local `.env` file.

---

## 6. Testing Tools

### Postman

**URL:** https://www.postman.com/

Used to test all service routes locally during development. Separate Postman collections were created for each service and for the Gateway, stored in the `postman/` directory:

- `cab-booking-customer-service.postman_collection.json`
- `cab-booking-gateway-customer-forwarding.postman_collection.json`
- `cab-booking-booking-service.postman_collection.json`
- `cab-booking-cab-ready-event.postman_collection.json`
- `cab-booking-discount-event.postman_collection.json`
- `cab-booking-booking-failure.postman_collection.json`
- `cab-booking-gateway-failure.postman_collection.json`
- `cab-booking-local.postman_environment.json`

### Newman

**URL:** https://www.npmjs.com/package/newman

Used to run Postman collections from the command line. Automated test runs were executed using the PowerShell scripts in `scripts/`:

- `run-booking-newman-tests.ps1`
- `run-gateway-newman-tests.ps1`

Newman was used to confirm service behaviour for booking flows, gateway forwarding, discount events, and failure scenarios.

---

## 7. AI Assistance Declaration

AI tools were used during this project for planning, debugging support, documentation drafting, and workflow structuring. All AI-generated suggestions were reviewed, edited, and tested manually before being accepted.

| Tool            | Used for                                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ChatGPT         | Initial architecture decisions; database schema design; authentication approach                                                                                                                                                  |
| Claude (Cowork) | Build order planning; documentation drafting; EventEmitter pattern design; Postman/Newman collection structuring; race condition diagnosis in event timing |

| Claude (Code) | Used coding solutions when a specific feature consumed more time from the developer |

Manual testing with Postman and Newman was used to confirm all service behaviour. No AI-generated code was accepted without being read and understood.


