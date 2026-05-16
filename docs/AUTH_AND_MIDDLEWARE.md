# Authentication and Middleware

## Decision

Use bcrypt + JWT for authentication.

Use Express middleware inside the Gateway and each protected microservice.

Do not create a separate middleware service.

## Reason

The assignment requires registration, login, account details, user bookings, payments, favourite locations, and inbox notifications. These are user-specific features, so authentication is necessary.

## Public Routes

```text
POST /customers/register
POST /customers/login
```

## Protected Routes

Examples:
```text
GET /customers/me
GET /customers/inbox
POST /bookings
GET /bookings/current
GET /bookings/past
POST /payments
GET /payments
POST /locations
GET /locations
```

## JWT Flow

```text
Browser sends Authorization: Bearer <token>
  ↓
Gateway verifies JWT
  ↓
Gateway forwards Authorization header
  ↓
Protected microservice verifies JWT again
  ↓
Service uses decoded user ID
```

## Why Verify Twice?

| Location | Reason |
|---|---|
| Gateway | rejects invalid requests early |
| Microservice | protects service from direct public calls |
| Both | supports independent microservices and safer deployment |

## Middleware

### Gateway Middleware

- `cors()`
- `express.json()`
- `requireAuth`
- `forwardAuthHeader`
- `errorHandler`

### Microservice Middleware

- `cors()`
- `express.json()`
- `requireAuth`
- request validation
- `errorHandler`

## Example requireAuth

```js
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
```

## Sources

- Assignment brief: registration and login required
- Lecturer REST notes: Express middleware and JSON validation
- Lecturer API Gateway notes: Gateway forwards service calls
- bcrypt npm documentation
- jsonwebtoken npm documentation

## Assignment Tasks Supported

- Task 1: register/login/account/inbox
- Task 2: user-specific bookings
- Task 3: user-specific payments
- Task 4: user-specific locations
- Task 7: web app through Gateway
- Task 8: JSON errors
- Task 11: hosted service communication
- Task 12: demo explanation
