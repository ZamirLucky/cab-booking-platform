# Fare Estimation Service

Validates pickup and drop-off locations, calls the RapidAPI Taxi Fare Calculator, and returns the provider response under a `fare` property. Payment Service uses this response as the base for its payment calculation.


---

## Quick Start

Use the [repository local setup](../../README.md#local-setup) for installation, environment files, ports, and startup.

## Environment Variables

[Shared configuration](../../README.md#deployment-configuration) defines `PORT`, `NODE_ENV`, JWT settings, and database connection modes. Hosted values and secrets are listed in the [deployment bindings](../../README.md#environment-bindings).

| Variable | Purpose |
| --- | --- |
| `FARE_API_URL` | Full subscribed Taxi Fare Calculator endpoint |
| `FARE_API_HOST` | Provider's RapidAPI host header |
| `FARE_API_KEY` | Provider credential |
| `FARE_API_TIMEOUT_MS` | Request timeout in milliseconds; defaults to `10000` |

## Endpoints

Examples use local URLs. In Cloud Run, all direct routes, including `/health`, require IAM invocation. See the [service authentication model](../../README.md#identity-and-access).

Frontend requests must go through the Gateway at `http://localhost:4000`. Payment Service calls Fare Estimation Service directly through its configured `FARE_SERVICE_URL`.

### Routes without an application JWT

| Method  | Direct service route | Purpose              |
| ------- | -------------------- | -------------------- |
| `GET` | `/health`          | Service health check |

### Fare estimate

| Method  | Gateway route | Direct service route | Authentication                            | Purpose                     |
| ------- | ------------- | -------------------- | ----------------------------------------- | --------------------------- |
| `GET` | `/api/fare` | `/fare`            | Gateway: JWT; hosted direct route: IAM | Return a live fare estimate |

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

Standard request processing and Gateway JWT forwarding are documented in the [Gateway middleware contract](../gateway-service/README.md#middleware). The endpoint tables above identify this service's application authentication requirements.

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
|-- Dockerfile                      Cloud Run container build
|-- package.json                    Scripts and direct dependencies
|-- package-lock.json               Locked dependency versions
`-- README.md                       Service documentation
```

## Known Limitations and Future Improvements

- Every estimate uses the external API; there is no cache, retry, or fallback fare.
- RapidAPI availability, latency, and usage limits can affect fare estimation and payment processing.
- Location validation only checks for non-empty values; addresses are not verified or geocoded locally.
- The response contract follows the external provider, so provider changes may require updates in Fare Estimation Service and Payment Service.
- `pg` is installed but currently unused because this service has no database connection.

## Project Documentation

- [Main repository README](../../README.md)
- [Payment Service README](../payment-service/README.md)

---

## Deployment

See the [deployment architecture](../../README.md#architecture), [configuration bindings](../../README.md#environment-bindings), and [build and deployment](../../README.md#build-and-deployment) for this service's connections and deployment settings.
