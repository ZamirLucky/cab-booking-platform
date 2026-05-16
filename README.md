# Cab Booking Platform

## Assignment

ITSFT-606-2101 Distributed Programming — Assignment 2

## Purpose

This project implements a Cab Booking Platform using:
- microservices architecture
- Gateway API
- cloud database
- external APIs
- event-driven functions
- frontend web application
- online deployment

## Architecture

```text
Browser
  ↓
HTML/Bootstrap/JavaScript Frontend
  ↓
Gateway API
  ↓
Microservices
  ├── Customer Service
  ├── Booking Service
  ├── Payment Service
  ├── Fare Estimation Service
  └── Location Service
  ↓
Google Cloud SQL PostgreSQL
```

## Technology Stack

Backend:
- Node.js
- Express.js
- Axios
- PostgreSQL
- bcrypt
- JWT

Frontend:
- HTML
- Bootstrap
- Vanilla JavaScript

Deployment:
- Docker
- Google Cloud Run
- Google Cloud SQL PostgreSQL

## Services

### Gateway Service

Single API entry point for the frontend. Forwards requests to microservices.

### Customer Service

Handles:
- registration
- login
- account details
- inbox notifications

### Booking Service

Handles:
- new bookings
- current bookings
- past bookings
- booking status

### Payment Service

Handles:
- payment calculation
- payment records
- payment retrieval

### Fare Estimation Service

Handles:
- external taxi fare API communication

### Location Service

Handles:
- favourite pickup locations
- weather forecast retrieval

## Documentation

Project documentation is stored in:

```text
docs/
```

Key files:
- `ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `DATABASE_DECISION.md`
- `AUTH_AND_MIDDLEWARE.md`
- `FRONTEND_VALIDATION.md`
- `EVENT_DRIVEN_DESIGN.md`
- `DEPLOYMENT_GOOGLE_CLOUD_RUN.md`

## Environment Variables

Do not commit `.env`.

Each service should use `.env.example` to document required variables.

Common examples:
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `CUSTOMER_SERVICE_URL`
- `BOOKING_SERVICE_URL`
- `PAYMENT_SERVICE_URL`
- `FARE_SERVICE_URL`
- `LOCATION_SERVICE_URL`
- `WEATHER_API_KEY`
- `FARE_API_KEY`

## Academic Integrity

Lecturer notes and examples are reference material only. The final implementation must be original and properly referenced.
