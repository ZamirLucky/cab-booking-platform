# fare-estimation-service

Calculates fare estimates based on pickup/dropoff coordinates.

Responsibilities:
- Accept pickup and dropoff location inputs
- Calculate estimated fare using distance and rate logic
- Return fare breakdown to the caller (gateway or booking-service)

Note: No database required — stateless calculation service.
