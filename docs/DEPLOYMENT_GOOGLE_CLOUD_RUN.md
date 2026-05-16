# Deployment Plan

## Decision

Deploy the application using Google Cloud Run with Docker and Google Cloud SQL for PostgreSQL.

## Reason

The assignment requires the microservices and web application to be hosted online. The user has Google Cloud credits, so Google Cloud Run and Cloud SQL are appropriate.

## Target Architecture

```text
Browser
  ↓
Frontend Web App on Cloud Run
  ↓
Gateway API on Cloud Run
  ↓
Microservices on Cloud Run
  ├── customer-service
  ├── booking-service
  ├── payment-service
  ├── fare-estimation-service
  └── location-service
  ↓
Google Cloud SQL PostgreSQL
```

## Services To Deploy

| Component | Deployment |
|---|---|
| frontend | Cloud Run container or static hosting alternative |
| gateway-service | Cloud Run |
| customer-service | Cloud Run |
| booking-service | Cloud Run |
| payment-service | Cloud Run |
| fare-estimation-service | Cloud Run |
| location-service | Cloud Run |
| database | Google Cloud SQL PostgreSQL |

## Container Rule

Each Cloud Run service must listen on the port provided by:

```js
process.env.PORT
```

Do not hardcode only port 3000 in deployed code.

## Environment Variables

Common:
- `PORT`
- `NODE_ENV`
- `JWT_SECRET`

Gateway:
- `CUSTOMER_SERVICE_URL`
- `BOOKING_SERVICE_URL`
- `PAYMENT_SERVICE_URL`
- `FARE_SERVICE_URL`
- `LOCATION_SERVICE_URL`

Database services:
- `DATABASE_URL`

External API services:
- `RAPIDAPI_KEY`
- `WEATHER_API_KEY`
- `FARE_API_KEY`

## Secret Handling

Do not commit secrets to GitHub.

Use:
- Cloud Run environment variables, or
- Google Secret Manager

## Documentation

- Cloud Run deployment:
  https://docs.cloud.google.com/run/docs/deploying

- Cloud Run container configuration:
  https://docs.cloud.google.com/run/docs/configuring/services/containers

- Cloud Run environment variables:
  https://docs.cloud.google.com/run/docs/configuring/services/environment-variables

- Cloud SQL PostgreSQL:
  https://docs.cloud.google.com/sql/docs/postgres

## Assignment Tasks Supported

- Task 10: deploy microservices and web application online
- Task 11: frontend communicates with hosted services
- Task 14: explain deployment and cloud advantages/disadvantages
