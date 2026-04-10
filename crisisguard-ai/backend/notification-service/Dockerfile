FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine
RUN addgroup -g 1001 crisisguard && adduser -u 1001 -G crisisguard -s /bin/sh -D crisisguard
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
USER crisisguard
EXPOSE 3004
CMD ["node", "dist/index.js"]
