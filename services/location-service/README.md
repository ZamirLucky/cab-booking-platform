# location-service

Location Service for the Cab Booking Platform.

Manages favourite pickup locations for authenticated users. Calls WeatherAPI.com to retrieve live weather conditions for any saved location.

## Port

Runs on port `3005` locally.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Defaults to 3005; Cloud Run injects this automatically |
| `JWT_SECRET` | Yes | Must match the secret used in Customer Service and Gateway |
| `DATABASE_URL` | Yes | Cloud SQL PostgreSQL connection string |
| `DB_SSL` | No | Set to `true` for Cloud SQL; omit for local without SSL |
| `WEATHER_API_KEY` | Yes | WeatherAPI.com API key — never commit this value |

## Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | No | Service health check |
| `POST` | `/locations` | Yes | Save a favourite pickup location |
| `GET` | `/locations` | Yes | List all locations for the logged-in user |
| `PATCH` | `/locations/:id` | Yes | Update label and/or address (ownership enforced) |
| `DELETE` | `/locations/:id` | Yes | Delete a location (ownership enforced) |
| `GET` | `/locations/:id/weather` | Yes | Get live weather for the saved address |

All routes except `/health` require `Authorization: Bearer <token>`.

The service is not called directly by the frontend. All traffic goes through the Gateway at `/api/locations/*`.

## Request and Response Examples

### POST /locations

Request:
```json
{
  "label": "Home",
  "address": "123 Main Street, London"
}
```

Response `201`:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "label": "Home",
  "address": "123 Main Street, London",
  "created_at": "2026-05-28T14:00:00.000Z"
}
```

### GET /locations

Response `200`:
```json
[
  {
    "id": "uuid",
    "label": "Home",
    "address": "123 Main Street, London",
    "weather_snapshot": null,
    "created_at": "2026-05-28T14:00:00.000Z"
  }
]
```

### PATCH /locations/:id

Request (partial update — label and/or address, at least one required):
```json
{
  "label": "New Home"
}
```

Response `200` with the updated row.

### DELETE /locations/:id

Response `200`:
```json
{ "message": "Location deleted" }
```

Returns `404` if not found or owned by a different user.

### GET /locations/:id/weather

Response `200`:
```json
{
  "location": {
    "id": "uuid",
    "label": "Home",
    "address": "123 Main Street, London"
  },
  "weather": {
    "temp_c": 18.0,
    "temp_f": 64.4,
    "condition": "Partly cloudy",
    "humidity": 62,
    "wind_kph": 14.4
  }
}
```

Returns `503` if WeatherAPI.com is unreachable.

## Validation Rules

| Field | Rule | Error |
|---|---|---|
| `label` | Required on POST | 400 `{ "error": "label and address are required" }` |
| `address` | Required on POST | 400 `{ "error": "label and address are required" }` |
| `label` or `address` | At least one required on PATCH | 400 `{ "error": "Provide label or address to update" }` |
| Ownership | id must belong to req.user.id | 404 `{ "error": "Location not found" }` |

## Weather API Behaviour

- External API: WeatherAPI.com — `https://api.weatherapi.com/v1/current.json`
- The `WEATHER_API_KEY` env var is used for authentication. Never commit this value.
- The raw API JSON response is stored in `favourite_locations.weather_snapshot` on every successful call.
- The structured response extracts: `temp_c`, `temp_f`, `condition.text`, `humidity`, `wind_kph`.
- If WeatherAPI.com returns an error or is unreachable, the route returns `503 { "error": "Weather service unavailable" }`.

## Database Table

`favourite_locations` — scoped to the logged-in user on every query:

```sql
SELECT id, user_id, label, address, weather_snapshot, created_at, updated_at
FROM favourite_locations
WHERE user_id = $1
ORDER BY created_at DESC;
```

## Cloud SQL Verification

After running Newman tests, verify in Cloud SQL:

```sql
-- Confirm locations were created and deleted correctly
SELECT id, user_id, label, address, weather_snapshot IS NOT NULL AS has_weather, created_at
FROM favourite_locations
ORDER BY created_at DESC
LIMIT 10;

-- Confirm weather_snapshot was stored
SELECT id, label,
       weather_snapshot->'current'->>'temp_c'            AS temp_c,
       weather_snapshot->'current'->'condition'->>'text' AS condition
FROM favourite_locations
WHERE weather_snapshot IS NOT NULL
LIMIT 5;
```

## Local Run and Test Commands

```bash
# Install dependencies
npm install

# Start with nodemon (development)
npm run dev

# Start without nodemon (production-like)
npm start

# Run Newman tests (from project root — requires all services running)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-location-newman-tests.ps1
```

## Files

```text
services/location-service/
├── src/
│   ├── middleware/
│   │   ├── requireAuth.js     JWT verification — returns 401 if missing or invalid
│   │   └── errorHandler.js    Four-parameter error handler — returns { error: message }
│   ├── routes/
│   │   └── locationRoutes.js  POST, GET, PATCH, DELETE /locations and GET /locations/:id/weather
│   ├── db/
│   │   └── pool.js            pg Pool — DATABASE_URL + DB_SSL
│   └── index.js               Express app — mounts locationRoutes, errorHandler, PORT 3005
├── .env.example               Environment variable template
├── Dockerfile                 Container definition for Cloud Run
└── package.json
```

## Assignment Tasks Supported

- **Task 4** — Location Service: save, list, update, delete favourite locations; weather API integration
- **Task 8** — JSON Data: all endpoints return structured JSON with correct HTTP status codes
- **Task 9** — Cloud SQL persistence: `favourite_locations` table; `weather_snapshot` JSONB stored
- **Task 11** — Hosted Communication: frontend → Gateway → Location Service
- **Task 12** — Microservice demonstration: ownership enforcement, JSONB snapshot, external API call
