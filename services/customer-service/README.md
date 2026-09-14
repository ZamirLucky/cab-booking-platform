# Customer Service

Registers customers, authenticates logins, returns account details, and manages the user notification inbox. Booking Service also calls this service to create cab-ready and discount notifications.



---

## Quick Start

Use the [repository local setup](../../README.md#local-setup) for installation, environment files, ports, and startup.

## Environment Variables

[Shared configuration](../../README.md#deployment-configuration) defines `PORT`, `NODE_ENV`, JWT settings, and database connection modes. Hosted values and secrets are listed in the [deployment bindings](../../README.md#environment-bindings).

This service has no additional configuration variables.

## Endpoints

Examples use local URLs. In Cloud Run, all direct routes, including `/health`, require IAM invocation. See the [service authentication model](../../README.md#identity-and-access).

Frontend requests must go through the Gateway at `http://localhost:4000`. Direct Customer Service routes on port `3001` are intended for isolated service testing and internal service calls.

### Routes without an application JWT

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

Booking Service calls the internal route from its event handlers. It is not exposed through the Gateway and does not require an application JWT; hosted calls use the IAM access model linked above.

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

Standard request processing and Gateway JWT forwarding are documented in the [Gateway middleware contract](../gateway-service/README.md#middleware). The endpoint tables above identify this service's application authentication requirements.

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

Use the [Customer collection](../../postman/README.md#collections) and [Gateway workflow](../../postman/README.md#quick-start) for local API testing.

For a local database connectivity check, run `npm run db:test` from this service directory.

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
|-- Dockerfile                      Cloud Run container build
|-- package.json                    Scripts and direct dependencies
|-- package-lock.json               Locked dependency versions
`-- README.md                       Service documentation
```

## Known Limitations and Future Improvements

- `GET /notifications` returns the full inbox; pagination is not currently implemented.
- Notification `type` is required but is not restricted to a fixed list of allowed values.

## Project Documentation

- [Main repository README](../../README.md)

---

## Deployment

See the [deployment architecture](../../README.md#architecture), [configuration bindings](../../README.md#environment-bindings), and [build and deployment](../../README.md#build-and-deployment) for this service's connections and deployment settings.
