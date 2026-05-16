# web-app

Static front-end for the Cab Booking Platform.

Built with HTML, Bootstrap, and Vanilla JavaScript. Communicates exclusively with the gateway-service via the Fetch API.

Pages:

| File               | Purpose                         |
| ------------------ | ------------------------------- |
| index.html         | Login page                      |
| register.html      | Customer registration           |
| dashboard.html     | Post-login home, fare estimator |
| bookings.html      | Booking history and status      |
| payment.html       | Payment for a booking           |
| locations.html     | Favourite locations manager     |
| notifications.html | Notification inbox              |

JS modules in `js/`:

- `config.js` — gateway base URL constant
- `auth.js` — login, register, JWT storage
- `bookings.js` — booking list and creation
- `payment.js` — payment submission
- `locations.js` — favourite locations CRUD
- `notifications.js` — notification list
