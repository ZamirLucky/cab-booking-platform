# Event-Driven Design

## Decision

Use event-driven functions for the two required assignment events:
1. discount notification after three successful bookings
2. cab-ready notification three minutes after booking

## Reason

The assignment explicitly requires event-driven functions for discount and cab-ready notifications. Lecturer notes explain that events represent something that happened, producers emit events, and consumers listen/react.

## Events

### booking.created

Triggered when a new booking is made.

Consumer action:
- wait 3 minutes
- create "cab ready" notification in Customer Service
- include ride details

### booking.completed

Triggered when a booking is successfully completed.

Consumer action:
- count successful bookings for user
- if count is 3 or more and discount notification has not been sent:
  - mark discount as available
  - create discount notification
  - ensure this happens only once per user

## Event Flow

```text
Booking Service
  ↓ emits booking.created
Event Handler
  ↓ waits 3 minutes
Customer Service
  ↓ stores notification
User Inbox
```

```text
Booking Service / Payment Service
  ↓ emits booking.completed
Event Handler
  ↓ checks booking count and notification state
Customer Service
  ↓ stores discount notification once
User Inbox
```

## Implementation for Assignment

A simple Node.js EventEmitter can be used for the assignment simulation, especially because the lecturer notes introduce EventEmitter.

For a larger production system, a message broker such as Pub/Sub, RabbitMQ, or Kafka would be stronger, but that adds deployment complexity.

## Risk

If services are deployed as completely separate Cloud Run services, local EventEmitter does not automatically work across service boundaries.

Assignment-friendly implementation options:
1. keep event handler inside Booking Service and call Customer Service via HTTP
2. use Google Pub/Sub for more realistic distributed events

Recommended first version:
- Booking Service emits/handles events internally
- event handler calls Customer Service notification endpoint through HTTP

This is simpler and easier to demonstrate.

## Sources

- Assignment brief: Task 5 and Task 6 event requirements
- Lecturer Event-Driven Architecture notes: producer, consumer, EventEmitter, decoupling

## Assignment Tasks Supported

- Task 5: discount event
- Task 6: cab-ready event
- Task 13: explain event-driven architecture
