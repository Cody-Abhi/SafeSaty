/**
 * CrisisGuard AI - WebSocket Service Entry Point
 * Socket.IO server with Redis adapter for horizontal scaling.
 * Supports property namespaces, incident rooms, and zone rooms.
 */

import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { setupPropertyNamespace } from './namespaces/propertyNamespace.js';
import { ConnectionManager } from './handlers/connectionManager.js';
import { createLogger } from './utils/logger.js';

dotenv.config();

const logger = createLogger('websocket-service');

const PORT = parseInt(process.env.PORT || '3003', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3001';

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

  // Health endpoint for the WebSocket service
  app.get('/health', (_req, res) => {
    const connectionManager = ConnectionManager.getInstance();
    res.json({
      success: true,
      data: {
        status: 'healthy',
        service: 'websocket-service',
        connections: connectionManager.getStats(),
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  });

  const httpServer = http.createServer(app);

  // ─── Socket.IO Server ────────────────────────────────────
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    transports: ['websocket', 'polling'], // WebSocket preferred, polling fallback
  });

  // ─── Redis Adapter for Cross-Instance Broadcasting ───────
  let redisConnected = false;
  try {
    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      logger.error('Redis pub client error', { error: err.message });
    });

    subClient.on('error', (err) => {
      logger.error('Redis sub client error', { error: err.message });
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    redisConnected = true;
    logger.info('Redis adapter connected for cross-instance broadcasting');
  } catch (error) {
    logger.warn('Redis adapter not available — running single-instance mode', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // ─── Default Namespace (/) — Connection Management ───────
  const connectionManager = ConnectionManager.getInstance();

  io.on('connection', (socket) => {
    connectionManager.handleConnection(socket);
  });

  // ─── Property Namespaces ─────────────────────────────────
  // Dynamic namespace: /property-{propertyId}
  const propertyNsp = io.of(/^\/property-\w+$/);
  setupPropertyNamespace(propertyNsp);

  // ─── Start Server ────────────────────────────────────────
  httpServer.listen(PORT, () => {
    logger.info('🔌 CrisisGuard AI - WebSocket Service started', {
      port: PORT,
      redis: redisConnected ? 'connected' : 'single-instance',
      transports: ['websocket', 'polling'],
      pid: process.pid,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Closing WebSocket connections...`);
    io.close();
    httpServer.close(() => {
      logger.info('WebSocket server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 30_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('Failed to start WebSocket service:', error);
  process.exit(1);
});
