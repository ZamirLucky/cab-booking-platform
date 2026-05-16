# Architecture

## Decision

Use a microservices architecture with a Gateway API.

## Reason

The assignment requires the Cab Booking Platform to be designed using microservices. It also requires the web application to communicate with a Gateway API, which redirects requests to the microservices.

## System Overview

```text
Browser
  ↓
web-app
  ↓
gateway-service
  ↓
customer-service
booking-service
payment-service
fare-estimation-service
location-service
  ↓
Google Cloud SQL PostgreSQL
```

## Services

### Gateway Service

Responsibilities:
- receive frontend requests
- verify JWT on protected routes
- forward requests to microservices using Axios
- forward Authorization header
- return JSON responses/errors

### Customer Service

Responsibilities:
- register users
- login users
- provide account details
- store and retrieve inbox notifications

### Booking Service

Responsibilities:
- create bookings
- view current bookings
- view past bookings
- emit booking events

### Payment Service

Responsibilities:
- calculate ride payment
- retrieve payment records
- store audit trail

### Fare Estimation Service

Responsibilities:
- call external taxi fare API
- return estimated fare

### Location Service

Responsibilities:
- manage favourite pickup locations
- call external weather API

## Communication

Frontend communicates only with the Gateway.

Gateway communicates with services through HTTP/JSON.

Services return JSON.

## Assignment Tasks Supported

- Task 1: Customer Service
- Task 2: Booking Service
- Task 3: Payment Service
- Task 4: Location Service
- Task 7: Web application through Gateway
- Task 8: JSON data
- Task 11: hosted service communication
- Task 12: microservice explanation

## Sources

- Assignment brief
- Lecturer Microservices notes
- Lecturer API Gateway notes
