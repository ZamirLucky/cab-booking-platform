# Fare Estimation Service

Validates pickup and drop-off locations, calls the RapidAPI Taxi Fare Calculator, and returns the provider response under a `fare` property. Payment Service uses this response as the base for its payment calculation.

**Port:** `3004`

---

## Quick Start

From the repository root:

```powershell
cd services/fare-estimation-service
npm install
Copy-Item .env.example .env
# Replace every FARE_API_* placeholder with values from RapidAPI.
npm run dev
```

Expected output:

```text
fare-estimation-service running on port 3004
```

Health check:

```powershell
curl.exe http://localhost:3004/health
# { "status": "ok", "service": "fare-estimation-service" }
```

## Environment Variables

| Variable                | Required | Description                                                           |
| ----------------------- | -------- | --------------------------------------------------------------------- |
| `PORT`                | No       | Defaults to`3004`                                                   |
| `NODE_ENV`            | No       | Use`development` locally; `test` suppresses unexpected-error logs |
| `FARE_API_URL`        | Yes      | Full Taxi Fare Calculator endpoint URL from RapidAPI                  |
| `FARE_API_HOST`       | Yes      | RapidAPI host header for the Taxi Fare Calculator                     |
| `FARE_API_KEY`        | Yes      | RapidAPI key                                                          |
| `FARE_API_TIMEOUT_MS` | No       | Request timeout in milliseconds; defaults to`10000`                 |

## Endpoints

Frontend requests must go through the Gateway at `http://localhost:4000`. Payment Service calls Fare Estimation Service directly through its configured `FARE_SERVICE_URL`.

### Public

| Method  | Direct service route | Purpose              |
| ------- | -------------------- | -------------------- |
| `GET` | `/health`          | Service health check |

### Fare estimate

| Method  | Gateway route | Direct service route | Authentication                            | Purpose                     |
| ------- | ------------- | -------------------- | ----------------------------------------- | --------------------------- |
| `GET` | `/api/fare` | `/fare`            | Gateway: Bearer token; direct route: none | Return a live fare estimate |

The Gateway verifies the JWT before forwarding `GET /api/fare`. The direct `/fare` route has no `requireAuth` middleware so Payment Service can call it internally without a user token.

## Validation Rules

| Query parameter    | Current rule                                                          |
| ------------------ | --------------------------------------------------------------------- |
| `start_location` | Required, must contain non-whitespace text, and is trimmed before use |
| `end_location`   | Required, must contain non-whitespace text, and is trimmed before use |

The values are forwarded to RapidAPI as `start_address` and `end_address`. The service does not convert them into coordinates.

## Request and Response Examples

The example below uses the Gateway, which is the required entry point for the frontend.

### `GET /api/fare`

```http
GET http://localhost:4000/api/fare?start_location=Valletta&end_location=Sliema
Authorization: Bearer <token>
```

Abridged success response (`200`):

```json
{
  "fare": {
    "journey": {
      "fares": [
        {
          "price_in_cents": 850
        }
      ]
    }
  }
}
```

Configuration error (`500`):

```json
{ "error": "Fare API is not configured" }
```

### Response Statuses

| Status  | Meaning                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| `200` | Health check or fare estimate returned                                                   |
| `400` | `start_location` or `end_location` is missing or blank                               |
| `401` | Gateway request has a missing, invalid, or expired Bearer token                          |
| `500` | Required fare API configuration is missing, or an unexpected error occurs                |
| `503` | RapidAPI failed, was unreachable, timed out, or the Gateway could not reach this service |

## Middleware

| Middleware       | Applied to               | Purpose                                 |
| ---------------- | ------------------------ | --------------------------------------- |
| `cors`         | All routes               | Allows cross-origin requests            |
| `express.json` | All routes               | Parses JSON request bodies              |
| `errorHandler` | All routes, mounted last | Returns consistent JSON error responses |

Fare Estimation Service does not use `requireAuth`. Authentication for frontend requests is applied by the Gateway.

## No Database

This service has no database tables and stores no fare data. Every valid, configured fare request calls RapidAPI live. Payment Service stores the Fare Estimation Service response as a fare snapshot when it creates a payment.

## Running Tests

There is currently no fare-specific Newman collection. Use these manual checks after configuring and starting the required services:

```powershell
# Direct health check
curl.exe http://localhost:3004/health

# Direct fare request
curl.exe "http://localhost:3004/fare?start_location=Valletta&end_location=Sliema"

# Gateway request; requires Gateway Service and a valid JWT
curl.exe -H "Authorization: Bearer <token>" "http://localhost:4000/api/fare?start_location=Valletta&end_location=Sliema"
```

The health check returns `200`. A valid fare request returns `200` when RapidAPI succeeds, while a request without one of the location parameters returns `400`.

## Service Architecture

```text
services/fare-estimation-service/
|-- src/
|   |-- index.js                    Express setup and health route
|   |-- middleware/
|   |   `-- errorHandler.js         Global JSON error handler
|   `-- routes/
|       `-- fareRoutes.js           Validation and RapidAPI request
|-- .env.example                    Safe environment-variable template
|-- Dockerfile                      Deployment scaffold; not complete
|-- package.json                    Scripts and direct dependencies
|-- package-lock.json               Locked dependency versions
`-- README.md                       Service documentation
```

## Known Limitations and Future Improvements

- Every estimate uses the external API; there is no cache, retry, or fallback fare.
- RapidAPI availability, latency, and usage limits can affect fare estimation and payment processing.
- Location validation only checks for non-empty values; addresses are not verified or geocoded locally.
- Direct `/fare` access is unauthenticated. Production deployment should restrict ingress or add service-to-service authentication.
- The response contract follows the external provider, so provider changes may require updates in Fare Estimation Service and Payment Service.
- `pg` is installed but currently unused because this service has no database connection.

## Project Documentation

- [Main repository README](../../README.md)
- [Payment Service README](../payment-service/README.md)

---

## Deployment

The existing `Dockerfile` is only a scaffold: dependency installation and source-copy steps are not yet configured. Fare Estimation Service runs locally with `npm run dev`, but it is not yet ready for Docker or Google Cloud Run deployment.
