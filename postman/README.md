# postman/

This folder stores Postman collections, the shared environment file, and Newman-based testing documentation for the Cab Booking Platform API.

## Quick Start — Run Payment Service Tests with Newman

**Prerequisites:** All five services running — Customer (3001), Booking (3002), Payment (3003), Fare Estimation (3004), Gateway (4000). Newman installed globally.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-payment-service-newman-tests.ps1
```

The script registers two fresh test users (User A and User B), runs the 9-request payment normal flow (health, booking creation, auth test, validation test, wrong-owner test, valid payment, retrieval, duplicate 409, and past booking check), and prompts for the optional service-down test.

Two users are needed to test ownership: User A attempts to pay User B's booking — expected 404.

## Quick Start — Run Fare Estimation Tests with Newman

**Prerequisites:** Customer Service on port 3001, Fare Estimation Service on port 3004, Gateway on port 4000, Newman installed globally.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-fare-newman-tests.ps1
```

The script registers a fresh test user, runs the 8-request normal flow (health, validation, direct fare call, gateway auth, gateway fare), and prompts for the optional service-down test.

## Quick Start — Run Booking Service Tests with Newman

Newman is the command-line runner for Postman collections.

**Prerequisites:** Customer Service on port 3001, Booking Service on port 3002, Gateway on port 4000, Newman installed globally.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-booking-newman-tests.ps1
```

The script registers a fresh test user, runs the 12-request booking normal flow, and prompts for the optional service-down and cab-ready event tests.

## Quick Start — Run Gateway Tests with Newman

Newman is the command-line runner for Postman collections. It runs all requests in sequence automatically and prints pass/fail results.

**Prerequisites:** Customer Service running on port 3001, Gateway running on port 4000, Newman installed globally.

```powershell
# Install Newman (one time only — already installed at project root)
npm install -g newman

# Allow script execution for this terminal session only
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Run Gateway forwarding tests + optional service-down test
.\scripts\run-gateway-newman-tests.ps1
```

The script runs the full forwarding suite first. If all tests pass, it pauses and asks whether to run the service-down test. Answer `Y` after stopping Customer Service.

## Why Collections Are Split

| Collection file | Purpose | Run with |
|---|---|---|
| `cab-booking-customer-service.postman_collection.json` | Direct Customer Service tests (port 3001) | Postman UI or Newman manually |
| `cab-booking-gateway-customer-forwarding.postman_collection.json` | Gateway forwarding tests — Customer Service normal flow (9 requests) | `run-gateway-newman-tests.ps1` |
| `cab-booking-gateway-failure.postman_collection.json` | Gateway service-down test — requires stopping Customer Service first | `run-gateway-newman-tests.ps1` (prompted) |
| `cab-booking-booking-service.postman_collection.json` | Booking Service normal flow via Gateway (12 requests) | `run-booking-newman-tests.ps1` |
| `cab-booking-booking-failure.postman_collection.json` | Booking Service service-down test — requires stopping Booking Service | `run-booking-newman-tests.ps1` (prompted) |
| `cab-booking-cab-ready-event.postman_collection.json` | Cab-ready event test — creates a booking, waits 3 minutes, checks notification | `run-booking-newman-tests.ps1` (prompted) |
| `cab-booking-fare-estimation-service.postman_collection.json` | Fare Estimation normal flow — register+login, health, validation, direct fare, gateway tests (8 requests) | `run-fare-newman-tests.ps1` |
| `cab-booking-fare-failure.postman_collection.json` | Fare Estimation service-down test — requires stopping fare-estimation-service | `run-fare-newman-tests.ps1` (prompted) |
| `cab-booking-payment-service.postman_collection.json` | Payment Service normal flow via Gateway (9 requests, two-user setup) | `run-payment-service-newman-tests.ps1` |
| `cab-booking-payment-failure.postman_collection.json` | Payment Service service-down test — requires stopping payment-service | `run-payment-service-newman-tests.ps1` (prompted) |

Splitting the service-down and cab-ready tests into separate collections is necessary because Newman cannot stop external processes or wait interactively mid-run. The PowerShell script handles pauses and user confirmations between collections.

## Gateway vs Direct Service URLs

From phase 3 onwards, all integration tests use the **Gateway at `http://localhost:4000`**, not Customer Service directly at `http://localhost:3001`.

The Gateway is the single entry point the frontend uses. Testing via the Gateway proves the full request path: JWT verification at the Gateway, Axios forwarding, and the downstream service response. Testing Customer Service at port 3001 directly is only for isolated service-level debugging.

Use `{{gatewayUrl}}` for Gateway integration tests and `{{customerServiceUrl}}` only when testing the customer-service in isolation.

## Important: Gateway vs Direct Service URLs

From phase 3 onwards, all integration tests must target the **Gateway at `http://localhost:4000`**, not Customer Service directly at `http://localhost:3001`.

The Gateway is the single entry point the frontend uses. Testing via the Gateway proves the full request path works: JWT verification at Gateway, Axios forwarding, and downstream service response. Testing Customer Service directly at port 3001 is only for isolated service-level debugging.

Use `{{gatewayUrl}}` for all Gateway tests and `{{customerServiceUrl}}` only when testing the customer-service in isolation.

## Purpose

Postman is used to test each endpoint independently before the frontend is connected.

The exported collections and environment provide evidence that the API was tested with the correct request bodies, headers, status codes, and JSON responses.

## Files

```text
postman/
├── cab-booking-customer-service.postman_collection.json               Step 2 — direct Customer Service tests
├── cab-booking-gateway-customer-forwarding.postman_collection.json    Step 3 — Gateway forwarding, Customer normal flow
├── cab-booking-gateway-failure.postman_collection.json                Step 3 — Gateway service-down test
├── cab-booking-booking-service.postman_collection.json                Step 4 — Booking Service normal flow (12 requests)
├── cab-booking-booking-failure.postman_collection.json                Step 4 — Booking Service service-down test
├── cab-booking-cab-ready-event.postman_collection.json                Step 4 — cab-ready delayed event test
├── cab-booking-fare-estimation-service.postman_collection.json        Step 5 — Fare Estimation normal flow (8 requests)
├── cab-booking-fare-failure.postman_collection.json                   Step 5 — Fare Estimation service-down test
├── cab-booking-payment-service.postman_collection.json                Step 6 — Payment Service normal flow (9 requests, two-user setup)
├── cab-booking-payment-failure.postman_collection.json                Step 6 — Payment Service service-down test
├── cab-booking-local.postman_environment.json                         shared environment for all collections
└── README.md
```

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
| `bookingServiceUrl` | `http://localhost:3002` | Booking Service direct URL — health check only |
| `baseUrl` | `http://localhost:3001` | Legacy — used by Step 2 Customer Service tests |
| `testEmail` | generated per run | auto-generated unique email (pre-request script) |
| `testPassword` | `password123` | test user password |
| `token` | empty until login | JWT from login response |
| `userId` | empty until register/login | current test user's ID |
| `notificationId` | empty until notification creation | current test notification ID |
| `bookingId` | empty until booking creation | created booking ID for subsequent requests |
| `cabReadyBookingId` | empty until cab-ready test | booking ID used for cab-ready event test |
| `fareTestEmail` | generated per run | unique email for fare tests (set by pre-request script in 00a) |
| `fareTestPassword` | `Password123!` | password for fare test user |

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

### cab-booking-customer-service.postman_collection.json

Direct Customer Service tests on port 3001. Run via Postman UI or Newman manually.

```text
01 - Customer Service (direct port 3001)
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

### cab-booking-gateway-customer-forwarding.postman_collection.json

Gateway forwarding tests on port 4000. Run automatically via `run-gateway-newman-tests.ps1`.

Pre-request script on request 02 generates a unique `testEmail` using `Date.now()` — no manual cleanup needed between runs.

```text
Gateway Customer Forwarding - Normal
├── 01 - Gateway Health Check
├── 02 - Register via Gateway              ← generates unique email automatically
├── 03 - Login via Gateway                 ← saves token to environment
├── 04 - Account Without Token             ← expects 401 from Gateway's requireAuth
├── 05 - Account With Token via Gateway    ← expects 200, checks no password_hash
├── 06 - Create Notification Setup Direct  ← calls customerServiceUrl directly to seed test data
├── 07 - Notifications via Gateway         ← expects array with at least one notification
├── 08 - Mark Notification Read via Gateway
└── 09 - Verify Notification Read via Gateway ← confirms is_read=true and read_at is set
```

### cab-booking-gateway-failure.postman_collection.json

Service-down test. Run by `run-gateway-newman-tests.ps1` after prompting you to stop Customer Service.

```text
Gateway Failure Tests
└── 01 - Service Down Test   ← expects 503 from Gateway, not a crash
```

### cab-booking-booking-service.postman_collection.json

Booking Service tests via Gateway (port 4000). Run automatically via `run-booking-newman-tests.ps1`.

Folder `00` registers a fresh test user per run and logs in to get a JWT. Folder `01` runs 10 booking tests using that token.

```text
00 - Setup - Register and Login via Gateway
├── 00a - Register Test User     ← unique email generated per run, registered via Gateway
└── 00b - Login and Save Token   ← token and userId saved to environment

01 - Booking Service - Normal Flow
├── 01 - Booking Health Direct            ← GET bookingServiceUrl/health → 200
├── 02 - Create Booking Without Token     ← expects 401 from Gateway requireAuth
├── 03 - Create Booking Valid             ← expects 201; saves bookingId to environment
├── 04 - Create Booking Invalid Cab Type  ← cab_type "Luxury" expects 400
├── 05 - Create Booking Passengers OOR   ← passengers = 9 expects 400
├── 06 - View Current Bookings            ← expects 200 array; created booking must be present
├── 07 - View Past Bookings Before        ← expects 200 array (booking not yet completed)
├── 08 - Get Single Booking               ← GET /api/bookings/{{bookingId}} expects 200
├── 09 - Update Status To Completed       ← PATCH /api/bookings/{{bookingId}}/status → 200
└── 10 - View Past Bookings After         ← expects 200; completed booking must now be present
```

### cab-booking-booking-failure.postman_collection.json

Service-down test. Run by `run-booking-newman-tests.ps1` after prompting to stop Booking Service.

```text
Booking Failure Tests
└── Booking Service Down - Current Bookings   ← expects 503 from Gateway, not a crash
```

### cab-booking-cab-ready-event.postman_collection.json

Cab-ready delayed event test. Run by `run-booking-newman-tests.ps1` using the exported environment (token already set from normal flow).

```text
Create Booking For Cab Ready Event    ← POST /api/bookings → 201; saves cabReadyBookingId
Check Cab Ready Notification          ← GET /api/customers/notifications; asserts type='cab_ready' present
```

The script waits 190 seconds between these two requests to allow the 3-minute setTimeout to fire.

### cab-booking-fare-estimation-service.postman_collection.json

Fare Estimation Service tests. Run automatically via `run-fare-newman-tests.ps1`.

Folder `00` registers a fresh test user per run and logs in. Folders `01`–`05` run the fare tests.

```text
00 Setup
├── 00a — Register test user     ← unique email generated per run (fareTestEmail)
└── 00b — Login and save token   ← token and userId saved to environment

01 Health Check
└── Health check — direct service   ← GET fareServiceUrl/health → 200

02 Validation
├── Missing start_location — expect 400   ← direct on port 3004
└── Missing end_location — expect 400     ← direct on port 3004

03 Direct Fare Call
└── Fare estimate — direct service call   ← GET fareServiceUrl/fare?... → 200 with fare object

04 Gateway — No Token
└── Fare via gateway — no token, expect 401   ← Gateway rejects before forwarding

05 Gateway — With Token
└── Fare via gateway — with token, expect 200  ← 200 with fare object via Gateway
```

### cab-booking-fare-failure.postman_collection.json

Service-down test. Run by `run-fare-newman-tests.ps1` after prompting you to stop fare-estimation-service.

```text
Service Down
└── Fare via gateway — service down, expect 503   ← 503 from Gateway, not a crash
```

Note: Only the Gateway 503 request is included. A direct ECONNREFUSED request is not assertable in Newman — it causes a non-zero exit regardless of test script content.

## Gateway Forwarding Tests — Request Details (Step 3)

All requests use `{{gatewayUrl}}` = `http://localhost:4000`. Both services must be running.

Run via: `.\scripts\run-gateway-newman-tests.ps1`

### 01 — Gateway Health Check

```http
GET {{gatewayUrl}}/health
```

Expected: `200 { "status": "ok", "service": "gateway-service" }`

### 02 — Register via Gateway

```http
POST {{gatewayUrl}}/api/customers/register
```

Pre-request script automatically generates a unique email (`gatewaytest+<timestamp>@example.com`) and clears `token`, `userId`, `notificationId`. No manual cleanup needed between runs.

Expected: `201 { "message": "Registration successful", "userId": "uuid" }`

### 03 — Login via Gateway

```http
POST {{gatewayUrl}}/api/customers/login
```

Uses the `testEmail` set by the previous pre-request script. Test script saves `token` and `userId` to environment automatically.

Expected: `200 { "token": "...", "userId": "...", "email": "..." }`

### 04 — Account Without Token (Gateway rejects)

```http
GET {{gatewayUrl}}/api/customers/account
```

No Authorization header. The 401 is returned by the **Gateway's own `requireAuth`** — Customer Service never receives this request. This proves the Gateway is enforcing auth, not just passing everything through.

Expected: `401 { "error": "Missing or invalid authorization token" }`

### 05 — Account With Token via Gateway

```http
GET {{gatewayUrl}}/api/customers/account
Authorization: Bearer {{token}}
```

Test script asserts `password_hash` is absent from the response.

Expected: `200` with account object (no `password_hash`)

### 06 — Create Notification Setup Direct

```http
POST {{customerServiceUrl}}/notifications
```

This request calls `customerServiceUrl` (port 3001) directly, not the Gateway. This is a test fixture step — it seeds a notification for the logged-in user so that the next two requests have something to work with. The Gateway does not expose a notification creation endpoint (that is an internal endpoint only).

Expected: `201 { "notificationId": "uuid" }` — saves `notificationId` to environment.

### 07 — Notifications via Gateway

```http
GET {{gatewayUrl}}/api/customers/notifications
Authorization: Bearer {{token}}
```

Asserts the array has at least one notification. Confirms the notification created in step 06 is present.

Expected: `200 { "notifications": [...] }`

### 08 — Mark Notification Read via Gateway

```http
PATCH {{gatewayUrl}}/api/customers/notifications/{{notificationId}}/read
Authorization: Bearer {{token}}
```

Expected: `200 { "message": "Notification marked as read" }`

### 09 — Verify Notification Read via Gateway

```http
GET {{gatewayUrl}}/api/customers/notifications
Authorization: Bearer {{token}}
```

Finds the notification by `notificationId` in the response array. Asserts `is_read === true` and `read_at` is not null. This end-to-end assertion proves the PATCH propagated correctly through the Gateway to Customer Service and was saved to the database.

Expected: `200` — notification found with `is_read: true` and `read_at` set.

## Service Down Test — Request Details

Run automatically by `run-gateway-newman-tests.ps1` after you stop Customer Service and confirm with `Y`.

```http
GET {{gatewayUrl}}/api/customers/account
Authorization: Bearer {{token}}
```

Expected: `503 { "error": "Service temporarily unavailable" }`

The Gateway must not crash or return 500. If it does, the `err.code === 'ECONNREFUSED'` check in `handleAxiosError` is missing or incorrect.

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
