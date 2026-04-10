/**
 * CrisisGuard AI - Express Application Factory
 * Assembles all middleware and routes into a configured Express app.
 * Separated from server startup for testability.
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/environment.js';
import { initializeFirebase } from './config/firebase.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLoggerMiddleware } from './middleware/requestLogger.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { createHealthRoutes } from './routes/health.routes.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createLocationRoutes } from './routes/location.routes.js';
import { createChatRoutes } from './routes/chat.routes.js';
import incidentRouter from './controllers/incident.controller.js';
import staffRouter from './controllers/staff.controller.js';
import sosRouter from './controllers/sos.controller.js';
import { NotFoundError } from './utils/errors.js';
import { logger } from './utils/logger.js';

export function createApp(): Express {
  const app = express();

  // ─── Initialize Firebase ─────────────────────────────────
  try {
    initializeFirebase();
  } catch (error) {
    logger.warn('Firebase initialization deferred', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // ─── Security Headers ────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // ─── CORS ────────────────────────────────────────────────
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));

  // ─── Body Parsing ────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── Compression ─────────────────────────────────────────
  app.use(compression());

  // ─── Request ID (before logging) ─────────────────────────
  app.use(requestIdMiddleware);

  // ─── Request Logging ─────────────────────────────────────
  app.use(requestLoggerMiddleware);

  // ─── Rate Limiting ───────────────────────────────────────
  app.use(globalRateLimiter);

  // ─── Trust proxy for correct IP behind load balancer ─────
  app.set('trust proxy', 1);

  // ─── Routes ──────────────────────────────────────────────
  
  // Health checks (no auth required)
  app.use('/', createHealthRoutes());

  // Auth routes
  app.use(`/api/${config.apiVersion}/auth`, createAuthRoutes());

  // Location tracking
  app.use(`/api/${config.apiVersion}/location`, createLocationRoutes());

  // Chat / communication
  app.use(`/api/${config.apiVersion}/chat`, createChatRoutes());

  // Incident lifecycle management
  app.use(`/api/${config.apiVersion}/incidents`, incidentRouter);

  // Staff dispatch & management
  app.use(`/api/${config.apiVersion}/staff`, staffRouter);

  // Guest SOS / panic button
  app.use(`/api/${config.apiVersion}/sos`, sosRouter);

  // ─── 404 Handler ─────────────────────────────────────────
  app.use((_req, _res, next) => {
    next(new NotFoundError(`Route ${_req.method} ${_req.originalUrl} not found`));
  });

  // ─── Global Error Handler (must be last) ─────────────────
  app.use(globalErrorHandler);

  return app;
}
