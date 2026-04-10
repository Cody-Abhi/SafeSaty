/**
 * CrisisGuard AI - Global Error Handler
 * Catches all unhandled errors, formats consistent API responses,
 * and distinguishes operational errors from programming bugs.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If it's a known operational error
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error caught', {
        requestId: req.requestId,
        error: err.message,
        stack: err.stack,
        code: err.code,
      });
    } else {
      logger.warn('Operational error', {
        requestId: req.requestId,
        code: err.code,
        message: err.message,
      });
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        version: config.apiVersion,
      },
    });
    return;
  }

  // Unknown/unexpected error - log full stack, send generic response
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    name: err.name,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      version: config.apiVersion,
    },
  });
}
