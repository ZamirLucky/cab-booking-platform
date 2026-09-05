# Dockerfile for gateway-service

FROM node:20-alpine

WORKDIR /app

# Install dependencies before copying source to improve layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "start"]
