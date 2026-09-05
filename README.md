# Cab Booking Platform

A microservices-based cab booking application. Users can create an account, book and pay for rides, manage favourite locations, check the weather, and receive automated notifications. The browser communicates with the backend only through the Gateway API.

## Features

- Registration, login, account details, and a notification inbox
- Current and past bookings with cancellation and completion flows
- External fare estimates and multiplier-based payment calculations
- Favourite-location CRUD with WeatherAPI.com forecasts
- Cab-ready and one-time discount notifications using booking events
- A Bootstrap and Vanilla JavaScript frontend that uses the Fetch API

## Architecture

```text
web-app
   |
   v
gateway-service
   |-- customer-service
   |-- booking-service ----> customer-service (event notifications)
   |-- payment-service ----> fare-estimation-service
   |-- fare-estimation-service ----> RapidAPI Taxi Fare Calculator
   `-- location-service ----------> WeatherAPI.com

customer-service, booking-service, payment-service, location-service
   `------------------------------------> Google Cloud SQL for PostgreSQL
```

The Gateway verifies every protected client request. Customer, Booking, Payment, and Location services verify the JWT again; Fare Estimation remains unauthenticated at service level so Payment Service can call it internally. Those four stateful services share the PostgreSQL database.

## Components

| Component                                                            | Local port | Responsibility                                                |
| -------------------------------------------------------------------- | ---------: | ------------------------------------------------------------- |
| [Gateway Service](services/gateway-service/README.md)                 |       4000 | Authentication at the entry point and request forwarding      |
| [Customer Service](services/customer-service/README.md)               |       3001 | Accounts, login, and notifications                            |
| [Booking Service](services/booking-service/README.md)                 |       3002 | Booking lifecycle and booking events                          |
| [Payment Service](services/payment-service/README.md)                 |       3003 | Fare multipliers, payments, and stored calculation breakdowns |
| [Fare Estimation Service](services/fare-estimation-service/README.md) |       3004 | External fare estimates                                       |
| [Location Service](services/location-service/README.md)               |       3005 | Favourite locations and weather forecasts                     |
| [Web App](web-app/README.md)                                          |     Static | HTML, Bootstrap, Vanilla JavaScript, and Fetch API frontend   |

Each component README is the source of truth for its routes, environment variables, request examples, validation rules, and current limitations.

## Technology

| Area                    | Technology                                          |
| ----------------------- | --------------------------------------------------- |
| Runtime and packages    | Node.js 20, npm                                     |
| Backend API             | Express.js, Axios,`cors`, `dotenv`              |
| Authentication          | `jsonwebtoken` (JWT), `bcrypt`                  |
| Database                | PostgreSQL,`pg`, JSONB, Google Cloud SQL          |
| Event-driven processing | Node.js`EventEmitter`, `setTimeout`             |
| Frontend                | HTML5, Bootstrap 5.3, Vanilla JavaScript, Fetch API |
| Development tooling     | `nodemon`                                         |
| External APIs           | RapidAPI Taxi Fare Calculator, WeatherAPI.com       |
| Testing                 | Postman, Newman, PowerShell runner scripts          |
| Planned deployment      | Docker, Google Artifact Registry, Google Cloud Run  |

## Local Setup

### Prerequisites

- Node.js 20 and npm
- Access to the project's PostgreSQL schema in Google Cloud SQL or a compatible local database
- RapidAPI Taxi Fare Calculator credentials
- A WeatherAPI.com API key
- Newman, if you want to run the automated API workflows

### 1. Configure the services

Copy each service's `.env.example` to `.env`, then replace every placeholder. Follow the linked component READMEs for the exact settings.

Important cross-service rules:

- Use the same `JWT_SECRET` in Gateway, Customer, Booking, Payment, and Location services.
- Customer, Booking, Payment, and Location services require the PostgreSQL connection settings.
- Booking Service needs the Customer Service URL.
- Payment Service needs the Fare Estimation Service URL.
- Fare Estimation and Location services require their external API settings.

### 2. Install dependencies

From the repository root in PowerShell the following as it simply saves you from entering each service directory and running `npm install` six times:

```powershell
Get-ChildItem .\services -Directory | ForEach-Object {
  npm.cmd --prefix $_.FullName install
}
```

### 3. Start the backend

Run one command per terminal. Start the Gateway after the downstream services.

```powershell
npm.cmd --prefix .\services\customer-service run dev
npm.cmd --prefix .\services\booking-service run dev
npm.cmd --prefix .\services\fare-estimation-service run dev
npm.cmd --prefix .\services\payment-service run dev
npm.cmd --prefix .\services\location-service run dev
npm.cmd --prefix .\services\gateway-service run dev
```

Verify the entry point:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

### 4. Open the frontend

Open `web-app/index.html` in a browser. Its current local configuration sends all API requests to `http://localhost:4000`.

All six backend processes are required for the complete browser flow. The current web app is static; its `npm` start scripts and Dockerfile are not yet operational.

## Testing

Automated Newman coverage currently includes Customer/Gateway forwarding, Booking Service, Customer- and Booking-service failure handling, and the cab-ready and discount event flows.

```powershell
npm.cmd install -g newman
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\scripts\run-gateway-newman-tests.ps1
.\scripts\run-booking-newman-tests.ps1
```

Fare, Payment, and Location checks are currently documented as manual workflows in their component READMEs. See the [Postman and Newman guide](postman/README.md) for prerequisites, collection coverage, expected results, and troubleshooting.

## Project Documentation

- This README owns the repository overview, architecture summary, status, and full-system startup flow.
- Each [component README](#components) owns that component's configuration, API contract, examples, and limitations.
- [Web App documentation](web-app/README.md) owns the page flow, browser configuration, validation, and manual UI checks.
- [Postman documentation](postman/README.md) owns the collection inventory and automated test instructions.
