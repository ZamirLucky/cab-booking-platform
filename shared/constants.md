# Shared Constants

## Service Ports

| Service | Port |
|---------|------|
| gateway-service | 3000 |
| customer-service | 3001 |
| booking-service | 3002 |
| payment-service | 3003 |
| fare-estimation-service | 3004 |
| location-service | 3005 |
| web-app | 8080 |

## Gateway Route Prefixes

| Prefix | Downstream Service |
|--------|--------------------|
| /api/customers | customer-service |
| /api/bookings | booking-service |
| /api/payments | payment-service |
| /api/fare | fare-estimation-service |
| /api/locations | location-service |

## Booking Statuses

- `pending`
- `confirmed`
- `completed`
- `cancelled`

## JWT

- Header: `Authorization: Bearer <token>`
- Verified in Gateway (protected routes) and again inside each protected microservice
