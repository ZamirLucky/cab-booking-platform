# postman/

This folder stores Postman testing assets for the Cab Booking Platform API.

## Important: Gateway vs Direct Service URLs

From phase 3 onwards, all integration tests must target the **Gateway at `http://localhost:4000`**, not Customer Service directly at `http://localhost:3001`.

The Gateway is the single entry point the frontend uses. Testing via the Gateway proves the full request path works: JWT verification at Gateway, Axios forwarding, and downstream service response. Testing Customer Service directly at port 3001 is only for isolated service-level debugging.

Use `{{gatewayUrl}}` for all Gateway tests and `{{customerServiceUrl}}` only when testing the customer-service in isolation.

## Purpose

Postman is used to test each endpoint independently before the frontend is connected.

The exported collection and environment provide evidence that the API was tested with the correct request bodies, headers, status codes, and JSON responses.

## Recommended Files

```text
postman/
├── cab-booking-platform.postman_collection.json
├── cab-booking-local.postman_environment.json
└── README.md
```

The placeholder collection should be replaced with the real exported collection after tests are complete.

## Environment

Environment name:

```text
Cab Booking Local
```

Variables:

| Variable | Example value | Purpose |
|---|---|---|
| `gatewayUrl` | `http://localhost:4000` | Gateway local base URL — use for all integration tests |
| `customerServiceUrl` | `http://localhost:3001` | Customer Service direct URL — for isolated service-level testing only |
| `baseUrl` | `http://localhost:3001` | Legacy — used by Step 2 Customer Service tests |
| `testEmail` | `testuser001@example.com` | test user email |
| `testPassword` | `password123` | test user password |
| `token` | empty until login | JWT from login response |
| `userId` | empty until register/login | current test user's ID |
| `notificationId` | empty until notification creation | current test notification ID |

## Important Security Rule

Before committing the environment file, clear runtime values:

- `token`
- `userId`
- `notificationId`

Do not commit:

- real JWT secrets
- database passwords
- API keys
- long-lived tokens

## Collection Structure

```text
Cab Booking Platform Local
├── 01 - Customer Service (direct — port 3001)
│   ├── 01 - Health Check
│   ├── 02 - Register Valid User
│   ├── 03 - Register Duplicate User
│   ├── 04 - Register Short Password
│   ├── 05 - Login Valid User
│   ├── 06 - Login Wrong Password
│   ├── 07 - Account Without Token
│   ├── 08 - Account With Token
│   ├── 09 - Get Notifications
│   ├── 10 - Create Notification Internal
│   ├── 11 - Get Notifications After Create
│   └── 12 - Mark Notification As Read
└── 02 - Gateway — Customer Routes (port 4000)
    ├── 01 - Gateway Health Check
    ├── 02 - Register via Gateway
    ├── 03 - Login via Gateway
    ├── 04 - Account Without Token (Gateway rejects)
    ├── 05 - Account With Token via Gateway
    ├── 06 - Notifications via Gateway
    ├── 07 - Mark Notification Read via Gateway
    └── 08 - Service Down Test
```

## Gateway Test Collection (Step 3)

All requests in the Gateway section use `{{gatewayUrl}}` which is `http://localhost:4000`.

Both Customer Service and Gateway must be running before these tests.

### 01 — Gateway Health Check

```http
GET {{gatewayUrl}}/health
```

Expected status: `200`

Expected body:

```json
{
  "status": "ok",
  "service": "gateway-service"
}
```

### 02 — Register via Gateway

```http
POST {{gatewayUrl}}/api/customers/register
Content-Type: application/json
```

Body:

```json
{
  "first_name": "Gateway",
  "surname": "Test",
  "email": "gatewaytest001@example.com",
  "password": "password123"
}
```

Expected status: `201`

Use a different email than Step 2 tests to avoid 409 conflict.

### 03 — Login via Gateway

```http
POST {{gatewayUrl}}/api/customers/login
Content-Type: application/json
```

Body:

```json
{
  "email": "gatewaytest001@example.com",
  "password": "password123"
}
```

Expected status: `200`

Expected body includes `token`. Save token to environment:

```js
const json = pm.response.json();
pm.environment.set("token", json.token);
pm.environment.set("userId", json.userId);
```

### 04 — Account Without Token (Gateway rejects)

```http
GET {{gatewayUrl}}/api/customers/account
```

No Authorization header.

Expected status: `401`

Expected body:

```json
{
  "error": "Missing or invalid authorization token"
}
```

This 401 is returned by the Gateway's own `requireAuth`. Customer Service never receives this request.

### 05 — Account With Token via Gateway

```http
GET {{gatewayUrl}}/api/customers/account
Authorization: Bearer {{token}}
```

Expected status: `200`

Expected body includes account details. Must not include `password_hash`.

### 06 — Notifications via Gateway

```http
GET {{gatewayUrl}}/api/customers/notifications
Authorization: Bearer {{token}}
```

Expected status: `200`

### 07 — Mark Notification Read via Gateway

```http
PATCH {{gatewayUrl}}/api/customers/notifications/{{notificationId}}/read
Authorization: Bearer {{token}}
```

Expected status: `200`

If no `notificationId` is set from Step 2 tests, create one first using the internal `POST /notifications` endpoint (called directly on Customer Service at port 3001).

### 08 — Service Down Test

Stop Customer Service. Then:

```http
GET {{gatewayUrl}}/api/customers/account
Authorization: Bearer {{token}}
```

Expected status: `503`

Expected body:

```json
{
  "error": "Service temporarily unavailable"
}
```

The Gateway must not crash. If the response is 500 or the process exits, the `err.code === 'ECONNREFUSED'` check in `handleAxiosError` is missing or incorrect.

## Customer Service Test Collection Structure (Step 2)

```text
Cab Booking Platform Local
└── 01 - Customer Service (direct — port 3001)
    ├── 01 - Health Check
    ├── 02 - Register Valid User
    ├── 03 - Register Duplicate User
    ├── 04 - Register Short Password
    ├── 05 - Login Valid User
    ├── 06 - Login Wrong Password
    ├── 07 - Account Without Token
    ├── 08 - Account With Token
    ├── 09 - Get Notifications
    ├── 10 - Create Notification Internal
    ├── 11 - Get Notifications After Create
    └── 12 - Mark Notification As Read
```

## Test Order and Expected Results

### 01 — Health Check

```http
GET {{baseUrl}}/health
```

Expected:

```json
{
  "status": "ok",
  "service": "customer-service"
}
```

Status: `200`.

### 02 — Register Valid User

```http
POST {{baseUrl}}/register
```

Body:

```json
{
  "first_name": "Test",
  "surname": "User",
  "email": "{{testEmail}}",
  "password": "{{testPassword}}"
}
```

Expected status: `201`.

Expected body:

```json
{
  "message": "Registration successful",
  "userId": "uuid"
}
```

Save `userId` to the environment.

### 03 — Register Duplicate User

Run the same request again with the same email.

Expected status: `409`.

Expected body:

```json
{
  "error": "Email already registered"
}
```

### 04 — Register Short Password

```http
POST {{baseUrl}}/register
```

Body:

```json
{
  "first_name": "Short",
  "surname": "Password",
  "email": "shortpass@example.com",
  "password": "1234"
}
```

Expected status: `400`.

Expected body:

```json
{
  "error": "Password must be at least 8 characters"
}
```

### 05 — Login Valid User

```http
POST {{baseUrl}}/login
```

Body:

```json
{
  "email": "{{testEmail}}",
  "password": "{{testPassword}}"
}
```

Expected status: `200`.

Expected body:

```json
{
  "token": "jwt-token",
  "userId": "uuid",
  "email": "testuser001@example.com"
}
```

Save `token` and `userId` to the environment.

### 06 — Login Wrong Password

```http
POST {{baseUrl}}/login
```

Body:

```json
{
  "email": "{{testEmail}}",
  "password": "wrongpassword"
}
```

Expected status: `401`.

Expected body:

```json
{
  "error": "Invalid email or password"
}
```

### 07 — Account Without Token

```http
GET {{baseUrl}}/account
```

No Authorization header.

Expected status: `401`.

Expected body:

```json
{
  "error": "Missing or invalid authorization token"
}
```

### 08 — Account With Token

```http
GET {{baseUrl}}/account
Authorization: Bearer {{token}}
```

Expected status: `200`.

Expected body includes:

- `id`
- `first_name`
- `surname`
- `email`
- `discount_available`
- `created_at`

Expected body must not include:

- `password_hash`

### 09 — Get Notifications

```http
GET {{baseUrl}}/notifications
Authorization: Bearer {{token}}
```

Expected status: `200`.

Expected body:

```json
{
  "notifications": []
}
```

The array may contain existing notifications if previous tests already created them.

### 10 — Create Notification Internal

```http
POST {{baseUrl}}/notifications
```

No Authorization header.

Body:

```json
{
  "user_id": "{{userId}}",
  "type": "system",
  "title": "Test",
  "message": "Hello",
  "payload": {
    "source": "postman",
    "reason": "Step 2 test"
  }
}
```

Expected status: `201`.

Expected body:

```json
{
  "message": "Notification created",
  "notificationId": "uuid"
}
```

Save `notificationId` to the environment.

### 11 — Get Notifications After Create

```http
GET {{baseUrl}}/notifications
Authorization: Bearer {{token}}
```

Expected status: `200`.

Expected result: response contains at least one notification.

If needed, save the first notification ID:

```js
const json = pm.response.json();
pm.environment.set("notificationId", json.notifications[0].id);
```

### 12 — Mark Notification As Read

```http
PATCH {{baseUrl}}/notifications/{{notificationId}}/read
Authorization: Bearer {{token}}
```

Expected status: `200`.

Expected body:

```json
{
  "message": "Notification marked as read"
}
```

Run `GET /notifications` again and confirm:

- `is_read` is `true`
- `read_at` is not `null`

## Example Postman Test Scripts

### Login Valid User

```js
const json = pm.response.json();

pm.test("Login returns 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Token exists", function () {
  pm.expect(json.token).to.exist;
});

pm.environment.set("token", json.token);
pm.environment.set("userId", json.userId);
```

### Create Notification Internal

```js
const json = pm.response.json();

pm.test("Notification created", function () {
  pm.response.to.have.status(201);
});

pm.test("Notification ID exists", function () {
  pm.expect(json.notificationId).to.exist;
});

pm.environment.set("notificationId", json.notificationId);
```

## Database Verification After Tests

### Users

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

### Notifications

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
