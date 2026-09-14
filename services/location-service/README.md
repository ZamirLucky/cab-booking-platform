# Location Service

Manages user-owned favourite pickup locations and retrieves weather data for saved addresses. The service supports create, list, update, and delete operations, calls WeatherAPI.com through Axios, and stores the full weather response as a PostgreSQL JSONB snapshot.



---

## Quick Start

Use the [repository local setup](../../README.md#local-setup) for installation, environment files, ports, and startup.

## Environment Variables

[Shared configuration](../../README.md#deployment-configuration) defines `PORT`, `NODE_ENV`, JWT settings, and database connection modes. Hosted values and secrets are listed in the [deployment bindings](../../README.md#environment-bindings).

| Variable | Purpose |
| --- | --- |
| `WEATHER_API_BASE_URL` | WeatherAPI base URL; required for weather requests |
| `WEATHER_API_KEY` | Provider credential; required for weather requests |

## Endpoints

Examples use local URLs. In Cloud Run, all direct routes, including `/health`, require IAM invocation. See the [service authentication model](../../README.md#identity-and-access).

Frontend and external client requests should go through the Gateway at `http://localhost:4000`. Direct Location Service routes on port `3005` are mainly for isolated service testing.

### Routes without an application JWT

| Method  | Direct service route | Purpose              |
| ------- | -------------------- | -------------------- |
| `GET` | `/health`          | Service health check |

### Protected (require `Authorization: Bearer <token>`)

| Method     | Gateway route                  | Direct service route       | Purpose                                                       |
| ---------- | ------------------------------ | -------------------------- | ------------------------------------------------------------- |
| `POST`   | `/api/locations`             | `/locations`             | Save a favourite location                                     |
| `GET`    | `/api/locations`             | `/locations`             | List the logged-in user's locations, newest first             |
| `PATCH`  | `/api/locations/:id`         | `/locations/:id`         | Update an owned location's label and/or address               |
| `DELETE` | `/api/locations/:id`         | `/locations/:id`         | Delete an owned location                                      |
| `GET`    | `/api/locations/:id/weather` | `/locations/:id/weather` | Retrieve weather for an owned location and store the snapshot |

The Gateway verifies protected requests before forwarding them. Location Service verifies the JWT again with its own `requireAuth` middleware.

## Validation Rules

### `POST /locations`

| Field         | Current rule                                               |
| ------------- | ---------------------------------------------------------- |
| `label`     | Required, non-empty, and trimmed before storage            |
| `address`   | Required, non-empty, and trimmed before storage            |
| `latitude`  | Optional; stored when provided but not currently validated |
| `longitude` | Optional; stored when provided but not currently validated |

### `PATCH /locations/:id`

At least one of `label` or `address` must be provided. Only supplied fields are updated, and the query checks both the location ID and authenticated user ID.

### `GET /locations/:id/weather`

The location must belong to the authenticated user. Its saved `address` is sent to WeatherAPI.com as the query value.

## Request and Response Examples

Examples below use the Gateway, which is the required entry point for the frontend.

### `POST /api/locations`

```http
POST http://localhost:4000/api/locations
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Home",
  "address": "Valletta, Malta"
}
```

Success response (`201`):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "label": "Home",
  "address": "Valletta, Malta",
  "latitude": null,
  "longitude": null,
  "weather_snapshot": null,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### `GET /api/locations`

```http
GET http://localhost:4000/api/locations
Authorization: Bearer <token>
```

Success response (`200`) is an array of owned location objects. Each object includes `latitude`, `longitude`, and the latest `weather_snapshot`. 

### `PATCH /api/locations/:id`

```http
PATCH http://localhost:4000/api/locations/uuid
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "My Home"
}
```

Success response (`200`) is the updated location object.

### `DELETE /api/locations/:id`

```http
DELETE http://localhost:4000/api/locations/uuid
Authorization: Bearer <token>
```

Success response (`200`):

```json
{ "message": "Location deleted" }
```

### `GET /api/locations/:id/weather`

```http
GET http://localhost:4000/api/locations/uuid/weather
Authorization: Bearer <token>
```

Success response (`200`):

```json
{
  "location": {
    "id": "uuid",
    "label": "Home",
    "address": "Valletta, Malta"
  },
  "weather": {
    "temp_c": 28.5,
    "temp_f": 83.3,
    "condition": "Sunny",
    "humidity": 60,
    "wind_kph": 14.4,
    "fetched_at": "timestamp"
  }
}
```

### Response Statuses

| Status  | Meaning                                                                    |
| ------- | -------------------------------------------------------------------------- |
| `200` | Location listed, updated, deleted, or weather returned                     |
| `201` | Favourite location created                                                 |
| `400` | Required fields are missing or no PATCH field was supplied                 |
| `401` | Bearer token is missing, invalid, or expired                               |
| `404` | Location does not exist or is not owned by the authenticated user          |
| `500` | Service configuration, database, or another unexpected error               |
| `503` | WeatherAPI request failed, or the Gateway could not reach Location Service |

## Middleware

Standard request processing and Gateway JWT forwarding are documented in the [Gateway middleware contract](../gateway-service/README.md#middleware). The endpoint tables above identify this service's application authentication requirements.

## Database Tables

### `favourite_locations`

| Column               | Type          | Usage                                                    |
| -------------------- | ------------- | -------------------------------------------------------- |
| `id`               | UUID          | Primary key                                              |
| `user_id`          | UUID          | Foreign key to`users.id`; used for ownership checks    |
| `label`            | VARCHAR(100)  | User-friendly location name                              |
| `address`          | TEXT          | Saved address sent to WeatherAPI.com                     |
| `latitude`         | NUMERIC(10,7) | Optional coordinate                                      |
| `longitude`        | NUMERIC(10,7) | Optional coordinate                                      |
| `weather_snapshot` | JSONB         | Full WeatherAPI response from the latest weather request |
| `created_at`       | TIMESTAMP     | Set when the location is created                         |
| `updated_at`       | TIMESTAMP     | Updated by PATCH and weather requests                    |

Useful Cloud SQL verification query:

```sql
SELECT
  id,
  label,
  address,
  weather_snapshot->'current'->>'temp_c' AS temp_c,
  weather_snapshot->'current'->'condition'->>'text' AS condition
FROM favourite_locations
WHERE weather_snapshot IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

## Running Tests

Run `npm run db:test` from `services/location-service` to verify the database connection. For integration testing, run Customer Service on port `3001`, Location Service on port `3005`, and Gateway Service on port `4000`, then test the protected Gateway routes with a JWT from Customer Service.

The completed test flow covered health, authentication, validation, create, list, update, weather snapshot storage, delete, and an empty final list. The location-specific Newman runner and collections are not present.

## Service Structure

```text
services/location-service/
|-- src/
|   |-- index.js                    Express setup and health route
|   |-- db/
|   |   |-- pool.js                 PostgreSQL connection pool
|   |   `-- testConnection.js       One-off database connection check
|   |-- middleware/
|   |   |-- errorHandler.js         Global JSON error handler
|   |   `-- requireAuth.js          JWT verification
|   `-- routes/
|       `-- locationRoutes.js       Location CRUD and weather routes
|-- .env.example                    Safe environment-variable template
|-- Dockerfile                      Cloud Run container build
|-- package.json                    Scripts and direct dependencies
|-- package-lock.json               Locked dependency versions
`-- README.md                       Service documentation
```

## Limitations and Future Improvements

- Saved addresses are free-text and may be ambiguous to WeatherAPI.com.
- Latitude and longitude are optional and are not currently validated or updated by PATCH.
- WeatherAPI failures are returned as `503`; the service has no retry, cache, or explicit Axios timeout.
- `GET /locations` has no pagination and returns the full saved weather snapshot.

## Project Documentation

- [Main repository README](../../README.md)

---

## Deployment

See the [deployment architecture](../../README.md#architecture), [configuration bindings](../../README.md#environment-bindings), and [build and deployment](../../README.md#build-and-deployment) for this service's connections and deployment settings.
