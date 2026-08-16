# Postman API Tests

This folder contains the Postman collections and local environment used to test the Cab Booking Platform. Newman runs the main integration workflows from the command line.

## Quick Start

Run all commands from the repository root.

### Prerequisites

| Workflow                | Services that must be running                                                   |
| ----------------------- | ------------------------------------------------------------------------------- |
| Gateway customer tests  | Customer Service (`3001`) and Gateway (`4000`)                              |
| Booking and event tests | Customer Service (`3001`), Booking Service (`3002`), and Gateway (`4000`) |

Install Newman once if it is not already available:

```powershell
npm install -g newman
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Run the Gateway customer workflow:

```powershell
.\scripts\run-gateway-newman-tests.ps1
```

Run the booking and event workflow:

```powershell
.\scripts\run-booking-newman-tests.ps1
```

Each runner executes its normal flow first. It then prompts for relevant optional tests:

- Service-down tests require the named microservice to be stopped while the Gateway remains running.
- The cab-ready test waits 190 seconds for the delayed notification. Keep Booking Service running during the wait.
- The discount test registers a fresh user, completes four bookings, and checks that only one discount notification is created.

## Expected Results

| Test                 | Expected result                                                                   |
| -------------------- | --------------------------------------------------------------------------------- |
| Gateway normal flow  | 9 requests pass through the Gateway                                               |
| Gateway service-down | Gateway returns`503` when Customer Service is unavailable                       |
| Booking normal flow  | 12 requests pass, including validation and booking status checks                  |
| Booking service-down | Gateway returns`503` when Booking Service is unavailable                        |
| Cab-ready event      | A`cab_ready` notification appears after approximately 3 minutes                 |
| Discount event       | One discount notification appears after ride 3 and is not duplicated after ride 4 |

## Collections

| File                                                                | Requests | Purpose                                        |
| ------------------------------------------------------------------- | -------: | ---------------------------------------------- |
| `cab-booking-customer-service.postman_collection.json`            |       12 | Direct Customer Service tests                  |
| `cab-booking-gateway-customer-forwarding.postman_collection.json` |        9 | Customer routes through the Gateway            |
| `cab-booking-gateway-failure.postman_collection.json`             |        1 | Customer Service unavailable test              |
| `cab-booking-booking-service.postman_collection.json`             |       12 | Booking flow through the Gateway               |
| `cab-booking-booking-failure.postman_collection.json`             |        1 | Booking Service unavailable test               |
| `cab-booking-cab-ready-event.postman_collection.json`             |        2 | Delayed cab-ready notification test            |
| `cab-booking-discount-event.postman_collection.json`              |       12 | Discount trigger and duplicate-prevention test |
| `cab-booking-local.postman_environment.json`                      |        - | Shared local URLs and runtime variables        |

The failure and event checks are separate because Newman cannot stop services or pause interactively inside a collection. The PowerShell runners coordinate those steps.

## Gateway and Direct URLs

Integration tests use `{{gatewayUrl}}` (`http://localhost:4000`). This verifies the complete path:

```text
Postman -> Gateway authentication and forwarding -> microservice -> PostgreSQL
```

Direct service URLs are only used for health checks, isolated Customer Service tests, or test-data setup for internal endpoints.

## Environment Variables

Import `cab-booking-local.postman_environment.json` and select **Cab Booking Local** in Postman.

| Variable                                                 | Purpose                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| `gatewayUrl`                                           | Gateway integration URL (`http://localhost:4000`)            |
| `customerServiceUrl`                                   | Direct Customer Service URL (`http://localhost:3001`)        |
| `bookingServiceUrl`                                    | Direct Booking Service URL (`http://localhost:3002`)         |
| `paymentServiceUrl`                                    | Direct Payment Service URL (`http://localhost:3003`)         |
| `fareServiceUrl`                                       | Direct Fare Estimation Service URL (`http://localhost:3004`) |
| `locationServiceUrl`                                   | Direct Location Service URL (`http://localhost:3005`)        |
| `testEmail`, `testPassword`                          | Test login details; most workflows generate a unique email     |
| `token`, `userId`                                    | Saved automatically after registration and login               |
| `notificationId`, `bookingId`, `cabReadyBookingId` | Saved IDs reused by later requests                             |

## Run a Collection Manually

In Postman:

1. Import the environment and required collection.
2. Select **Cab Booking Local**.
3. Start the required services.
4. Use **Run collection** and review the test results.

For example, run the direct Customer Service collection with Newman:

```powershell
newman run .\postman\cab-booking-customer-service.postman_collection.json `
  -e .\postman\cab-booking-local.postman_environment.json
```

## Security

Before committing, make sure exported environments do not contain real credentials or reusable tokens. Never commit:

- JWT secrets or long-lived tokens
- Database passwords
- External API keys
- Generated `.tmp-*.json` environment files

## Troubleshooting

- `401`: rerun registration and login so the collection stores a fresh token.
- `503`: confirm the downstream service is running, unless a service-down test expects this status.
- Connection refused: confirm the required ports and local environment URLs.
- Cab-ready test fails: keep Booking Service running for the full 190-second wait.
- Repeated test data: use the runner; its pre-request scripts generate unique users where needed.
