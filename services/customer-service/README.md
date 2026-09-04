# Customer Service

Registers customers, authenticates logins, returns account details, and manages the user notification inbox. Booking Service also calls this service to create cab-ready and discount notifications.

**Port:** `3001`

**Status:** Completed and tested locally. Docker and Cloud Run deployment is pending.

---

## Quick Start

From the repository root:

```powershell
cd services/customer-service
npm install
Copy-Item .env.example .env
# Replace every placeholder in .env before continuing.
npm run db:test
npm run dev
```

Expected output:

```text
customer-service running on port 3001
```

Health check:

```powershell
curl.exe http://localhost:3001/health
# { "status": "ok", "service": "customer-service" }
```

## Environment Variables

| Variable         | Required | Description                                                                                                               |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PORT`         | No       | Defaults to`3001`                                                                                                       |
| `NODE_ENV`     | No       | Use`development` locally; `test` suppresses error logging                                                             |
| `JWT_SECRET`   | Yes      | Signs login tokens and must match Gateway Service and every microservice that verifies those tokens                       |
| `DATABASE_URL` | Yes      | PostgreSQL connection string; the service fails at startup when it is absent                                              |
| `DB_SSL`       | No       | Set to`true` for the current Cloud SQL connection or `false` for local PostgreSQL; omitted values behave as `false` |

## Endpoints

Frontend requests must go through the Gateway at `http://localhost:4000`. Direct Customer Service routes on port `3001` are intended for isolated service testing and internal service calls.

### Public

| Method   | Gateway route               | Direct service route | Purpose                    |
| -------- | --------------------------- | -------------------- | -------------------------- |
| `GET`  | —                          | `/health`          | Service health check       |
| `POST` | `/api/customers/register` | `/register`        | Register a customer        |
| `POST` | `/api/customers/login`    | `/login`           | Authenticate and issue JWT |

### Protected (require `Authorization: Bearer <token>`)

| Method    | Gateway route                             | Direct service route        | Purpose                                    |
| --------- | ----------------------------------------- | --------------------------- | ------------------------------------------ |
| `GET`   | `/api/customers/account`                | `/account`                | Return the logged-in customer's account    |
| `GET`   | `/api/customers/notifications`          | `/notifications`          | List all owned notifications, newest first |
| `PATCH` | `/api/customers/notifications/:id/read` | `/notifications/:id/read` | Mark an owned notification as read         |

The Gateway verifies protected requests before forwarding them. Customer Service verifies the JWT again with its own `requireAuth` middleware.

### Internal

| Method   | Gateway route | Direct service route | Purpose                                    |
| -------- | ------------- | -------------------- | ------------------------------------------ |
| `POST` | Not exposed   | `/notifications`   | Create a notification for an existing user |

Booking Service calls the internal route from its event handlers. It currently has no JWT or service credential. The Gateway does not forward it, but deployment must also restrict direct network access or add service-to-service authentication.

## Validation Rules

### `POST /register`

| Field          | Current rule                                                     |
| -------------- | ---------------------------------------------------------------- |
| `first_name` | Required and non-empty; trimmed before storage                   |
| `surname`    | Required and non-empty; trimmed before storage                   |
| `email`      | Required, checked for a basic email format, and stored lowercase |
| `password`   | Required and at least 8 characters                               |

Duplicate email addresses return `409 Conflict`. Passwords are hashed with bcrypt using 10 salt rounds and are never returned by the API.

### `POST /login`

`email` and `password` are required. Wrong email and wrong password attempts both return `401` with `Invalid email or password` to avoid revealing whether an account exists.

### Notification routes

- `GET /notifications` uses the authenticated user ID and returns all matching rows ordered newest first.
- `PATCH /notifications/:id/read` updates only a notification owned by the authenticated user.
- Internal `POST /notifications` requires non-empty `user_id`, `type`, `title`, and `message`; `payload` is optional.

## Request and Response Examples

Gateway routes are used below except for the internal notification endpoint.

### `POST /api/customers/register`

```http
POST http://localhost:4000/api/customers/register
Content-Type: application/json

{
  "first_name": "Test",
  "surname": "User",
  "email": "testuser001@example.com",
  "password": "password123"
}
```

Success response (`201`):

```json
{
  "message": "Registration successful",
  "userId": "uuid"
}
```

### `POST /api/customers/login`

```http
POST http://localhost:4000/api/customers/login
Content-Type: application/json

{
  "email": "testuser001@example.com",
  "password": "password123"
}
```

Success response (`200`):

```json
{
  "token": "jwt-token",
  "userId": "uuid",
  "email": "testuser001@example.com"
}
```

### `GET /api/customers/account`

```http
GET http://localhost:4000/api/customers/account
Authorization: Bearer <token>
```

Success response (`200`):

```json
{
  "id": "uuid",
  "first_name": "name of the user",
  "surname": "Username",
  "email": "testuser001@example.com",
  "discount_available": false,
  "created_at": "timestamp"
}
```

### `GET /api/customers/notifications`

```http
GET http://localhost:4000/api/customers/notifications
Authorization: Bearer <token>
```

Success response (`200`):

```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "cab_ready",
      "title": "Your cab is ready",
      "message": "Your Economic cab is on its way. From: Valletta. To: Sliema. Passengers: 2.",
      "payload": null,
      "is_read": false,
      "read_at": null,
      "created_at": "timestamp"
    }
  ]
}
```

### Internal `POST /notifications`

```http
POST http://localhost:3001/notifications
Content-Type: application/json

{
  "user_id": "uuid",
  "type": "system",
  "title": "Test",
  "message": "Hello",
  "payload": {
    "source": "postman"
  }
}
```

Success response (`201`):

```json
{
  "message": "Notification created",
  "notificationId": "uuid"
}
```

### Response Statuses

| Status  | Meaning                                                                 |
| ------- | ----------------------------------------------------------------------- |
| `200` | Login succeeded, account or inbox returned, or notification marked read |
| `201` | Customer or notification created                                        |
| `400` | Request validation failed                                               |
| `401` | Credentials or Bearer token are invalid                                 |
| `404` | User or owned notification was not found                                |
| `409` | Email is already registered                                             |
| `500` | Unexpected Customer Service or database error                           |
| `503` | Gateway could not reach Customer Service                                |

## Middleware

| Middleware       | Applied to                              | Purpose                                       |
| ---------------- | --------------------------------------- | --------------------------------------------- |
| `cors`         | All routes                              | Allows cross-origin requests                  |
| `express.json` | All routes                              | Parses JSON request bodies                    |
| `requireAuth`  | Account, inbox, and mark-as-read routes | Verifies JWT and populates`req.user`        |
| `errorHandler` | All routes, mounted last                | Returns consistent`{ "error": "..." }` JSON |

## Database Tables

| Table             | Usage                                                          |
| ----------------- | -------------------------------------------------------------- |
| `users`         | Account details, bcrypt password hash, and discount flags      |
| `notifications` | Inbox messages, read state, and optional JSONB`payload` data |

Useful verification queries:

```sql
SELECT
  id,
  first_name,
  surname,
  email,
  password_hash,
  discount_available,
  discount_notification_sent,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
```

```sql
SELECT
  id,
  user_id,
  type,
  title,
  message,
  payload,
  is_read,
  read_at,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

## Running Tests

Run commands from the repository root.

### Direct service tests

Prerequisites: Customer Service on port `3001` and Newman installed globally.

```powershell
newman run .\postman\cab-booking-customer-service.postman_collection.json -e .\postman\cab-booking-local.postman_environment.json
```

The collection contains 12 requests covering health, registration validation, login, JWT protection, notification creation, inbox retrieval, and mark-as-read. Before repeating it, change `testEmail` in the Postman environment to an unused address because the valid registration request expects `201`.

### Gateway integration tests

Prerequisites: Customer Service on port `3001`, Gateway Service on port `4000`, and Newman installed globally.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-gateway-newman-tests.ps1
```

This verifies the full Gateway forwarding flow and optionally checks that the Gateway returns `503` while Customer Service is stopped.

## Service Structure

```text
services/customer-service/
|-- src/
|   |-- index.js                    Express setup and health route
|   |-- db/
|   |   |-- pool.js                 PostgreSQL connection pool
|   |   `-- testConnection.js       One-off database connection check
|   |-- middleware/
|   |   |-- errorHandler.js         Global JSON error handler
|   |   `-- requireAuth.js          JWT verification
|   `-- routes/
|       |-- authRoutes.js           Registration, login, and account routes
|       `-- notificationRoutes.js   Inbox and internal notification routes
|-- .env.example                    Safe environment-variable template
|-- Dockerfile                      Deployment scaffold; not complete
|-- package.json                    Scripts and direct dependencies
|-- package-lock.json               Locked dependency versions
`-- README.md                       Service documentation
```

## Known Limitations and Future Improvements

- Internal `POST /notifications` is unauthenticated. Production deployment must restrict direct access or add service-to-service authentication.
- `GET /notifications` returns the full inbox; pagination is not currently implemented.
- Notification `type` is required but is not restricted to a fixed list of allowed values.

## Project Documentation

- [Main repository README](../../README.md)

---

## Deployment

The existing `Dockerfile` is only a scaffold: dependency installation and source-copy steps are not yet configured. Customer Service runs locally with `npm run dev`, but it is not yet ready for Docker or Google Cloud Run deployment.
