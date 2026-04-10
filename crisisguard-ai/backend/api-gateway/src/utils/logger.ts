/**
 * CrisisGuard AI - Winston Logger
 * Structured JSON logging for Cloud Logging compatibility.
 * Includes request correlation IDs for distributed tracing.
 */

import winston from 'winston';
import { config } from '../config/environment.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss.SSS' }),
  errors({ stack: true }),
  printf(({ timestamp: ts, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${ts} [${level}] ${message}${metaStr}${stackStr}`;
  })
);

const productionFormat = combine(
  timestamp({ format: 'ISO' }),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: {
    service: 'api-gateway',
    version: '1.0.0',
  },
  format: config.nodeEnv === 'production' ? productionFormat : developmentFormat,
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false,
});

// Stream interface for Morgan HTTP logging integration
export const loggerStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
