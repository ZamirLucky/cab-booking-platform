# fare-estimation-service

Calls the RapidAPI Taxi Fare Calculator and returns an estimated fare for a given pickup and drop-off location. No database — stateless API integration service.

## Status

Phase 5 — implemented and tested locally.

## Local Port

```text
3004
```

Run command:

```powershell
cd services\fare-estimation-service
npm run dev
```

Expected output:

```text
fare-estimation-service running on port 3004
```

## Environment Variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`.

| Variable | Description |
|---|---|
| `PORT` | Service port — set to `3004` |
| `NODE_ENV` | `development` locally |
| `FARE_API_KEY` | RapidAPI key from the RapidAPI console — never commit |
| `FARE_API_HOST` | RapidAPI host header value (e.g. `taxi-fare-calculator.p.rapidapi.com`) — never commit |

Example `.env` (do not commit):

```
PORT=3004
NODE_ENV=development
FARE_API_KEY=your_rapidapi_key_here
FARE_API_HOST=your_rapidapi_host_here
```

## Endpoints

### Public routes (no auth required)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/fare` | Call external fare API and return estimate |

### GET /fare

Query parameters:

| Parameter | Required | Description |
|---|---|---|
| `start_location` | Yes | Pickup address or location name |
| `end_location` | Yes | Drop-off address or location name |

**Why no requireAuth?** This service is called internally by Payment Service (Phase 6) as a service-to-service call — no user token is available in that context. The Gateway applies `requireAuth` to the `/api/fare` route so frontend users must be logged in. The service itself remains open for internal calls.

## Request / Response Examples

### Health check

```http
GET http://localhost:3004/health
```

Response:

```json
{
  "status": "ok",
  "service": "fare-estimation-service"
}
```

### Fare estimate — success

```http
GET http://localhost:3004/fare?start_location=Valletta&end_location=Sliema
```

Response (200):

```json
{
  "fare": {
    "journey": {
      "city_name": "...",
      "duration": 30,
      "distance": 20,
      "fares": [
        { "name": "by Day", "price_in_cents": 5040 }
      ]
    }
  }
}
```

The `fare` object shape depends on the RapidAPI response. It is returned as-is wrapped in a `fare` key.

### Missing query parameter — 400

```http
GET http://localhost:3004/fare?end_location=Sliema
```

Response (400):

```json
{
  "error": "start_location query parameter is required"
}
```

### External API unavailable — 503

```http
GET http://localhost:3004/fare?start_location=Valletta&end_location=Sliema
```

Response when RapidAPI is unreachable (503):

```json
{
  "error": "Fare API is currently unavailable"
}
```

Response when RapidAPI returns a non-2xx error (503):

```json
{
  "error": "Fare API returned an error",
  "detail": { ... }
}
```

## Error Handling

| Condition | HTTP status | Response |
|---|---|---|
| Missing `start_location` | 400 | `{ "error": "start_location query parameter is required" }` |
| Missing `end_location` | 400 | `{ "error": "end_location query parameter is required" }` |
| `FARE_API_KEY` not set | 500 | `{ "error": "Fare API is not configured" }` |
| RapidAPI returns non-2xx | 503 | `{ "error": "Fare API returned an error", "detail": ... }` |
| Network error (ECONNREFUSED etc.) | 503 | `{ "error": "Fare API is currently unavailable" }` |

External API errors are caught and returned as structured JSON. The service never crashes or exposes a raw Axios error stack trace to the caller.

## Test Commands

### Direct service tests (Newman)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-fare-newman-tests.ps1
```

Runs 8 requests: register+login, health, two validation checks, direct fare call, gateway auth check, and gateway fare call. Optionally prompts for the service-down test.

### Manual Postman test

1. Start fare-estimation-service on port 3004
2. `GET http://localhost:3004/health` → 200
3. `GET http://localhost:3004/fare?start_location=Valletta&end_location=Sliema` → 200 with fare data
4. `GET http://localhost:3004/fare?end_location=Sliema` → 400 (missing start_location)

### Via Gateway

1. Start customer-service (3001), fare-estimation-service (3004), gateway-service (4000)
2. Login via `POST http://localhost:4000/api/customers/login` → save token
3. `GET http://localhost:4000/api/fare?start_location=Valletta&end_location=Sliema` with `Authorization: Bearer <token>` → 200
4. Same request without Authorization → 401 from Gateway

## Files

```text
services/fare-estimation-service/
├── src/
│   ├── index.js                   entry point — middleware and route mounting
│   ├── middleware/
│   │   └── errorHandler.js        global JSON error handler (four-param)
│   └── routes/
│       └── fareRoutes.js          GET /fare — validates params, calls RapidAPI, returns fare
├── .env                           not committed
├── .env.example                   committed with placeholder values
└── package.json
```

## Sources

- Assignment brief: Task 3 — external API integration
- RapidAPI Taxi Fare Calculator: https://rapidapi.com/3b-data-3b-data-default/api/taxi-fare-calculator
- Axios HTTP client documentation: https://axios-http.com/docs/intro
- DECISION_LOG D-019: fare estimation as stateless microservice, no data persistence
