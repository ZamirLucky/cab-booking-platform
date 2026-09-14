# Cab Booking Web App

Static multi-page frontend for the Cab Booking Platform, built with HTML5, Bootstrap 5, Vanilla JavaScript, and the Fetch API. It provides the browser interface for registration, login, account details, fare estimates, bookings, payments, favourite locations, weather, and notifications.

Application API requests use the Gateway. The [repository architecture](../README.md#architecture) describes service communication.

## Quick Start

Follow the [full local setup](../README.md#local-setup). Open the web server URL after the backend services are running. The frontend has no asset build step; Express serves its HTML, CSS, and JavaScript. Internet access is required for Bootstrap assets from jsDelivr.

## Frontend Configuration

The server accepts `PORT` and `GATEWAY_URL` as process environment variables. It does not load a local `.env` automatically. The generated browser configuration and hosted bindings are documented in [Deployment configuration](../README.md#environment-bindings).

Every page loads `config.js` before authentication and page-specific scripts. The browser uses that constant for API requests. It receives no database or provider credentials.

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

The [Gateway route index](../services/gateway-service/README.md#routes) links to the authoritative service contracts. Protected browser requests include `Authorization: Bearer <token>`. Page responsibilities are listed above; the frontend has no direct database or external fare/weather API access.

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
|-- .env.example               Environment variable reference; not loaded automatically
|-- server.js                  HTTP server and runtime browser configuration
|-- Dockerfile                 Cloud Run container build
|-- package.json               Server commands and dependencies
`-- README.md                  Frontend documentation
```

The web app has no database connection and does not call the fare or weather providers directly. Those operations remain inside their microservices.

---

## Manual Browser Testing

There is no automated browser test suite. Newman collections test the backend APIs separately; see the [Postman and Newman documentation](../postman/README.md).

Use a dedicated test account and the local web server configured in [Local Setup](../README.md#local-setup):

1. Confirm the target web server and Gateway health responses.
2. Open DevTools, select the Network tab, and filter by Fetch/XHR.
3. Submit invalid forms and confirm validation prevents an API request.
4. Register a fresh customer, log in, and confirm `cab_token` exists under Application -> Local Storage.
5. On the dashboard, confirm account details load and request a fare estimate.
6. Create a future booking and confirm it appears under Current Bookings.
7. Cancel one booking and confirm it moves to Past Bookings.
8. Create another booking, pay it, confirm the JSONB calculation breakdown is displayed, and confirm the booking moves to Past Bookings as `completed`.
9. Add, edit, request weather for, and delete a favourite location.
10. Check the inbox after booking creation for a `cab_ready` notification. Hosted delivery is subject to the [timer limitation](../README.md#deployment-limitations); record the observed result.
11. Mark an unread notification as read and confirm its styling and button update.
12. Confirm every application API request targets the configured Gateway origin.

Requests to `cdn.jsdelivr.net` are expected because Bootstrap is a frontend asset; they are not application API calls.

---

## Known Limitations and Future Improvements

- `guardPage()` checks only whether a token exists. Only the notifications page currently logs out automatically after a `401`; other protected pages handle expired tokens inconsistently.
- JWT storage in `localStorage` increases the impact of an XSS vulnerability. Several booking, payment, and notification views insert API values with `innerHTML`; those values should be escaped before production.
- The booking form sets its default `datetime-local` value with `toISOString()`, which uses UTC and can display the wrong local time.
- The browser does not validate that a booking date is in the future; the backend currently requires the field but also does not enforce a future date.
- Payment-triggered discounts follow the [Booking event limitations](../services/booking-service/README.md#limitations-and-future-improvements).
- Fetch requests have no timeout or retry behaviour.
- Bootstrap depends on jsDelivr being reachable.
- There is no automated frontend test suite.

---

## Project Documentation

- [Main Repository README](../README.md)
- [Gateway Service README](../services/gateway-service/README.md)

---

## Deployment

The [deployment architecture](../README.md#architecture) shows the web service and browser API connections. The main README also covers cloud hosting, runtime configuration, and the build process.
