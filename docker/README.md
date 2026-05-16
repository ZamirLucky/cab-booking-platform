# docker/

Docker Compose configuration for local development.

`docker-compose.placeholder.yml` is a placeholder — complete it during the deployment phase.

When complete it will orchestrate:
- gateway-service
- customer-service
- booking-service
- payment-service
- fare-estimation-service
- location-service
- web-app
- (Cloud SQL is used in production; a local postgres container may be used for dev)
