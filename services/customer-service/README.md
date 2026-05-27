# customer-service

Customer Service handles customer registration, login, account details, and inbox notifications.

## Status

Completed and tested locally for Step 2 — Customer Service: Auth and Notifications.

## Responsibilities

- Register new customers
- Hash passwords with bcrypt
- Login customers
- Issue JWT tokens
- Return protected account details
- Return customer notifications
- Mark notifications as read
- Create internal notifications for later Booking Service event handlers

## Local Port

```text
3001
```

Base URL during direct service testing:

```text
http://localhost:3001
```

## Database Tables Used

- `users`
- `notifications`

## Main Files

```text
services/customer-service/src/index.js
services/customer-service/src/db/pool.js
services/customer-service/src/middleware/errorHandler.js
services/customer-service/src/middleware/requireAuth.js
services/customer-service/src/routes/authRoutes.js
services/customer-service/src/routes/notificationRoutes.js
```

## Environment Variables

Create a real `.env` file locally from `.env.example`.

Required variables:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your_real_local_jwt_secret
DATABASE_URL=postgresql://cap_app_user:YOUR_PASSWORD@YOUR_CLOUD_SQL_PUBLIC_IP:5432/cab_booking_db
DB_SSL=true
```

Do not commit the real `.env` file.

## Run Locally

```powershell
cd services\customer-service
npm run dev
```

Expected output:

```text
customer-service running on port 3001
```

## Implemented Endpoints

### Health Check

```http
GET /health
```

Success:

```json
{
  "status": "ok",
  "service": "customer-service"
}
```

### Register User

```http
POST /register
```

Request body:

```json
{
  "first_name": "Test",
  "surname": "User",
  "email": "testuser001@example.com",
  "password": "password123"
}
```

Success:

```json
{
  "message": "Registration successful",
  "userId": "uuid"
}
```

Validation responses:

| Case | Status | Response |
|---|---:|---|
| Missing field | 400 | `{ "error": "first_name, surname, email, and password are required" }` |
| Invalid email | 400 | `{ "error": "Invalid email format" }` |
| Short password | 400 | `{ "error": "Password must be at least 8 characters" }` |
| Duplicate email | 409 | `{ "error": "Email already registered" }` |

### Login User

```http
POST /login
```

Request body:

```json
{
  "email": "testuser001@example.com",
  "password": "password123"
}
```

Success:

```json
{
  "token": "jwt-token",
  "userId": "uuid",
  "email": "testuser001@example.com"
}
```

Failure:

```json
{
  "error": "Invalid email or password"
}
```

The same failure message is used for wrong email and wrong password to avoid user enumeration.

### Get Account

```http
GET /account
Authorization: Bearer <token>
```

Success:

```json
{
  "id": "uuid",
  "first_name": "Test",
  "surname": "User",
  "email": "testuser001@example.com",
  "discount_available": false,
  "created_at": "timestamp"
}
```

Important: `password_hash` must never be returned.

### Get Notifications

```http
GET /notifications
Authorization: Bearer <token>
```

Success:

```json
{
  "notifications": []
}
```

If notifications exist, the array contains notification objects ordered newest first.

### Create Notification Internally

```http
POST /notifications
```

Request body:

```json
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

Success:

```json
{
  "message": "Notification created",
  "notificationId": "uuid"
}
```

Design note: this route has no auth in the current assignment stage because it is intended for future internal Booking Service event handlers. In production, protect it with service-to-service authentication.

### Mark Notification as Read

```http
PATCH /notifications/:id/read
Authorization: Bearer <token>
```

Success:

```json
{
  "message": "Notification marked as read"
}
```

The route only updates the notification if:

- the notification ID exists
- the notification belongs to `req.user.id`

Otherwise it returns:

```json
{
  "error": "Notification not found"
}
```

## Middleware

### `requireAuth.js`

Checks:

- `Authorization` header exists
- header starts with `Bearer `
- JWT verifies with `JWT_SECRET`

Then sets:

```js
req.user = {
  id: decoded.userId,
  email: decoded.email
};
```

### `errorHandler.js`

Returns consistent JSON errors:

```json
{
  "error": "message here"
}
```

The error handler is mounted last in `src/index.js`.

## Postman Test Order

1. `GET /health`
2. `POST /register` valid user
3. `POST /register` duplicate user
4. `POST /register` short password
5. `POST /login` valid user
6. `POST /login` wrong password
7. `GET /account` without token
8. `GET /account` with token
9. `GET /notifications`
10. `POST /notifications`
11. `GET /notifications` after creation
12. `PATCH /notifications/:id/read`

## Database Verification

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

Check:

- registered user exists
- `password_hash` starts with `$2`
- plain password is not stored

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

Check:

- notification exists after `POST /notifications`
- `is_read` becomes true after `PATCH /notifications/:id/read`
- `read_at` is set after mark-as-read

## Step 2 Commit Message

```powershell
git commit -m "feat(customer): register, login, account, and notifications endpoints"
```
