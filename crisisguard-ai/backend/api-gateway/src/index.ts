/**
 * CrisisGuard AI - API Gateway Entry Point
 * Bootstraps the Express server with graceful shutdown handling.
 */

import { createApp } from './app.js';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info('🚀 CrisisGuard AI - API Gateway started', {
      port: config.port,
      environment: config.nodeEnv,
      apiVersion: config.apiVersion,
      pid: process.pid,
    });
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 30 seconds if graceful shutdown fails
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 30_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  // Catch uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception - shutting down', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start API Gateway:', error);
  process.exit(1);
});
