# gateway-service

The API Gateway is the single entry point for all client requests from the web-app.

Responsibilities:
- Route requests to the appropriate downstream microservice
- Verify JWT tokens on protected routes
- Forward the Authorization header to microservices
- Apply CORS and JSON body parsing globally

Middleware applied here:
- `cors`
- `express.json`
- `requireAuth` (protected routes only)
- `forwardAuthHeader`
- `errorHandler`

Downstream services:
- customer-service
- booking-service
- payment-service
- fare-estimation-service
- location-service
