# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm install -g typescript && tsc

# Production stage
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S crisisguard && \
    adduser -S crisisguard -u 1001

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

USER crisisguard

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
