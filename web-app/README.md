# Cab Booking Web App

Static multi-page frontend for the Cab Booking Platform, built with HTML5, Bootstrap 5, Vanilla JavaScript, and the Fetch API. It provides the browser interface for registration, login, account details, fare estimates, bookings, payments, favourite locations, weather, and notifications.

All application API requests follow the required Gateway path:

```text
Browser -> web-app -> gateway-service -> microservices
```

The frontend never calls ports `3001`-`3005` directly.

**Entry point:** `web-app/index.html`

**Local Gateway:** `http://localhost:4000`

---

## Quick Start

For the complete workflow, first configure and start the Gateway and all five microservices using the [main local setup instructions](../README.md#running-locally).

Local ports:

| Component               |     Port |
| ----------------------- | -------: |
| Gateway Service         | `4000` |
| Customer Service        | `3001` |
| Booking Service         | `3002` |
| Payment Service         | `3003` |
| Fare Estimation Service | `3004` |
| Location Service        | `3005` |

The backend also requires its PostgreSQL, JWT, fare API, and weather API environment variables to be configured. Confirm the Gateway is available before opening the frontend:

```powershell
curl.exe http://localhost:4000/health
# { "status": "ok", "service": "gateway-service" }
```

The current frontend is static and has no build step. From the repository root:

```powershell
cd web-app
Start-Process .\index.html
```

Alternatively, open `web-app/index.html` with a modern browser. Internet access is required to load Bootstrap CSS and JavaScript from jsDelivr.

`npm install` is not required for the current static application. Do not use `npm start` or `npm run dev`; both scripts currently reference a missing `server.js` file.

---

## Frontend Configuration

The active Gateway URL is defined directly in `js/config.js`:

```js
const GATEWAY_URL = 'http://localhost:4000';
```

Every page loads `config.js` before `auth.js` and any page-specific script. All Fetch requests build their URL from this constant.

| File or setting  | Current behaviour                                                          |
| ---------------- | -------------------------------------------------------------------------- |
| `js/config.js` | Runtime source for`GATEWAY_URL` in the browser                           |
| `.env.example` | Documentation placeholder only; static browser JavaScript does not read it |
| Bootstrap 5.3.0  | Loaded from the jsDelivr CDN on each page                                  |

Before online deployment, `GATEWAY_URL` must be replaced or injected with the HTTPS URL of the deployed Gateway. No API keys, JWT secrets, or database credentials belong in the frontend.

---

## Pages and User Flow

| File                   | Purpose                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `index.html`         | Log in, store the returned JWT, and redirect to the dashboard                                                  |
| `register.html`      | Register a customer and redirect to login after success                                                        |
| `dashboard.html`     | Display account details and discount status, estimate a fare, and provide navigation                           |
| `bookings.html`      | Create bookings, list current and past bookings, cancel a current booking, and open it for payment             |
| `payment.html`       | Select a current booking, check for an existing payment, submit payment, and display the calculation breakdown |
| `locations.html`     | Add, list, edit, and delete favourite locations; retrieve weather for a saved address                          |
| `notifications.html` | Display the customer inbox, including cab-ready and discount notifications, and mark unread items as read      |

A normal user flow is:

1. Register an account, then log in.
2. View account details or request a fare estimate on the dashboard.
3. Create a booking and view it in the current bookings table.
4. Pay for a current booking. A successful payment changes the booking to `completed` and displays its stored calculation breakdown.
5. Add favourite locations and request their weather information.
6. Open the inbox to view event notifications and mark them as read.

---

## Gateway API Calls

These are the routes used by the current browser interface. Protected calls include `Authorization: Bearer <token>`.

| Page                   | Method | Gateway route                                     | Auth   | Purpose                                            |
| ---------------------- | ------ | ------------------------------------------------- | ------ | -------------------------------------------------- |
| `index.html`         | POST   | `/api/customers/login`                          | None   | Authenticate and receive a JWT                     |
| `register.html`      | POST   | `/api/customers/register`                       | None   | Create a customer account                          |
| `dashboard.html`     | GET    | `/api/customers/account`                        | Bearer | Load the signed-in customer's details              |
| `dashboard.html`     | GET    | `/api/fare?start_location=...&end_location=...` | Bearer | Request a fare estimate                            |
| `bookings.html`      | POST   | `/api/bookings`                                 | Bearer | Create a booking                                   |
| `bookings.html`      | GET    | `/api/bookings/current`                         | Bearer | Load current bookings                              |
| `bookings.html`      | GET    | `/api/bookings/past`                            | Bearer | Load completed and cancelled bookings              |
| `bookings.html`      | PATCH  | `/api/bookings/:id/status`                      | Bearer | Cancel a current booking from the UI               |
| `payment.html`       | GET    | `/api/bookings/current`                         | Bearer | List bookings that can be selected for payment     |
| `payment.html`       | GET    | `/api/payments/:bookingId`                      | Bearer | Check whether the selected booking is already paid |
| `payment.html`       | POST   | `/api/payments`                                 | Bearer | Process payment for the selected booking           |
| `locations.html`     | POST   | `/api/locations`                                | Bearer | Save a favourite location                          |
| `locations.html`     | GET    | `/api/locations`                                | Bearer | Load favourite locations                           |
| `locations.html`     | PATCH  | `/api/locations/:id`                            | Bearer | Update a favourite location                        |
| `locations.html`     | DELETE | `/api/locations/:id`                            | Bearer | Delete a favourite location                        |
| `locations.html`     | GET    | `/api/locations/:id/weather`                    | Bearer | Retrieve weather for a saved location              |
| `notifications.html` | GET    | `/api/customers/notifications`                  | Bearer | Load inbox notifications                           |
| `notifications.html` | PATCH  | `/api/customers/notifications/:id/read`         | Bearer | Mark a notification as read                        |

The Gateway also exposes routes such as `GET /health` and `GET /api/bookings/:id`, but the current UI does not call them.

---

## Authentication and Session Behaviour

Shared authentication helpers are defined in `js/auth.js`.

| Function            | Behaviour                                                            |
| ------------------- | -------------------------------------------------------------------- |
| `setToken(token)` | Stores the login JWT in`localStorage` under `cab_token`          |
| `getToken()`      | Reads the stored token                                               |
| `authHeaders()`   | Creates JSON and Bearer authorization headers for protected requests |
| `guardPage()`     | Redirects to`index.html` when no token is stored                   |
| `handleLogout()`  | Removes the token and redirects to login                             |

Login and registration pages redirect to the dashboard whenever a token is already present. Protected pages call `guardPage()` when they load. The Gateway verifies protected requests before forwarding them, and the protected microservices verify the JWT again.

The browser guard checks only for token presence. It does not decode the JWT or check its expiry; expired-token handling is listed under [Known Limitations and Future Improvements](#known-limitations-and-future-improvements).

---

## Validation and Error Handling

Forms use HTML5 constraints with `novalidate`, JavaScript `checkValidity()`, Bootstrap's `was-validated` class, and field-level feedback.

| Form                 | Frontend rules                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Login                | Valid email required; password required with at least 8 characters                                                    |
| Registration         | First name and surname required; valid email required; password minimum 8 characters                                  |
| Fare estimate        | Pickup and drop-off locations required                                                                                |
| New booking          | Pickup, drop-off, and date/time required; passengers limited to 1-8; cab type must be Economic, Premium, or Executive |
| Add or edit location | Label and address required                                                                                            |

Frontend validation improves the user experience, but each microservice remains responsible for authoritative validation and ownership checks.

API handling follows these patterns:

- Responses are parsed with `res.json()`.
- A returned `{ "error": "..." }` message is normally displayed in an alert, table row, or inline panel.
- Network failures display a generic `Cannot reach the server` message.
- Payment disables the Pay button while the POST request is running to reduce duplicate submissions.
- Booking cancellation and location deletion ask for confirmation first.
- Gateway service-down responses, including `503`, are displayed through the same page-level error handling.

There is no shared Fetch wrapper, request timeout, or automatic retry policy.

---

## Web App Structure

```text
web-app/
|-- index.html                 Login page
|-- register.html              Registration page
|-- dashboard.html             Account overview and fare estimator
|-- bookings.html              Booking creation and current/past lists
|-- payment.html               Booking selection and payment summary
|-- locations.html             Favourite locations and weather
|-- notifications.html         Customer inbox
|-- css/
|   `-- custom.css             Notification, empty-state, payment, and button styles
|-- js/
|   |-- config.js              Gateway base URL
|   |-- auth.js                Token, headers, page guard, logout, and shared errors
|   |-- bookings.js            Booking requests and table rendering
|   |-- payment.js             Payment requests and breakdown rendering
|   |-- locations.js           Location CRUD, weather, and rendering
|   `-- notifications.js       Inbox loading and mark-as-read handling
|-- .env.example               Inactive placeholder for future deployment configuration
|-- Dockerfile                 Incomplete deployment scaffold
|-- package.json               Currently unused server scripts and dependencies
`-- README.md                  Frontend documentation
```

The web app has no database connection and does not call the fare or weather providers directly. Those operations remain inside their microservices.

---

## Manual Browser Testing

There is no automated browser test suite. Newman collections test the backend APIs separately; see the [Postman and Newman documentation](../postman/README.md).

Use this local verification flow:

1. Start all backend services and confirm the Gateway health response.
2. Open DevTools, select the Network tab, and filter by Fetch/XHR.
3. Submit invalid forms and confirm validation prevents an API request.
4. Register a fresh customer, log in, and confirm `cab_token` exists under Application -> Local Storage.
5. On the dashboard, confirm account details load and request a fare estimate.
6. Create a future booking and confirm it appears under Current Bookings.
7. Cancel one booking and confirm it moves to Past Bookings.
8. Create another booking, pay it, confirm the JSONB calculation breakdown is displayed, and confirm the booking moves to Past Bookings as `completed`.
9. Add, edit, request weather for, and delete a favourite location.
10. Keep Booking Service running for about three minutes after booking creation, then confirm the `cab_ready` notification appears in the inbox.
11. Mark an unread notification as read and confirm its styling and button update.
12. Confirm every application API request targets `localhost:4000`, never ports `3001`-`3005`.

Requests to `cdn.jsdelivr.net` are expected because Bootstrap is a frontend asset; they are not application API calls.

---

## Known Limitations and Future Improvements

- `npm start` and `npm run dev` reference a missing `server.js`; Express, dotenv, and pg in `package.json` are not used by the current static app.
- The Dockerfile contains only TODO scaffolding and cannot currently serve the frontend.
- `.env.example` is not loaded by browser code. Production needs a deliberate build-time or runtime method for setting `GATEWAY_URL`.
- `GATEWAY_URL` is currently hard-coded to HTTP localhost.
- `guardPage()` checks only whether a token exists. Only the notifications page currently logs out automatically after a `401`; other protected pages handle expired tokens inconsistently.
- JWT storage in `localStorage` increases the impact of an XSS vulnerability. Several booking, payment, and notification views insert API values with `innerHTML`; those values should be escaped before production.
- The booking form sets its default `datetime-local` value with `toISOString()`, which uses UTC and can display the wrong local time.
- The browser does not validate that a booking date is in the future; the backend currently requires the field but also does not enforce a future date.
- Payment Service changes the booking status directly to `completed` but does not emit Booking Service's `booking.completed` event. The UI payment flow therefore does not currently trigger the discount event.
- Fetch requests have no timeout or retry behaviour.
- Bootstrap depends on jsDelivr being reachable.
- There is no automated frontend test suite.

---

## Project Documentation

- [Main Repository README](../README.md)
- [Gateway Service README](../services/gateway-service/README.md)

---

## Deployment

Not yet deployed
