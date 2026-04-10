/**
 * CrisisGuard AI - WebSocket Logger
 */

import winston from 'winston';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

export function createLogger(service: string): winston.Logger {
  const isDev = process.env.NODE_ENV !== 'production';

  const devFormat = combine(
    colorize(),
    timestamp({ format: 'HH:mm:ss.SSS' }),
    errors({ stack: true }),
    printf(({ timestamp: ts, level, message, stack, ...meta }) => {
      const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
      const stackStr = stack ? `\n${stack}` : '';
      return `${ts} [${level}] ${message}${metaStr}${stackStr}`;
    })
  );

  const prodFormat = combine(
    timestamp({ format: 'ISO' }),
    errors({ stack: true }),
    json()
  );

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    defaultMeta: { service },
    format: isDev ? devFormat : prodFormat,
    transports: [new winston.transports.Console()],
    exitOnError: false,
  });
}
