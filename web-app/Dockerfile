FROM node:20-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY *.html ./
COPY css ./css
COPY js ./js

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "start"]
