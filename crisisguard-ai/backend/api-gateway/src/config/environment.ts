/**
 * CrisisGuard AI - Environment Configuration
 * Validates and exports all environment variables with type safety.
 * Fails fast at startup if required vars are missing.
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvironmentConfig {
  // Server
  nodeEnv: string;
  port: number;
  apiVersion: string;

  // Firebase
  firebaseProjectId: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseDatabaseUrl: string;
  googleApplicationCredentials: string;


  // Redis
  redisUrl: string;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // CORS
  corsOrigin: string;

  // Logging
  logLevel: string;

  // Internal Service URLs
  alertServiceUrl: string;
  aiGatewayUrl: string;
  notificationServiceUrl: string;
  websocketServiceUrl: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(
      `[CONFIG] Missing required environment variable: ${key}. ` +
      `See .env.example for reference.`
    );
  }
  return value;
}

function getEnvInt(key: string, defaultValue?: number): number {
  const raw = process.env[key];
  if (raw === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`[CONFIG] Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`[CONFIG] Environment variable ${key} must be a number, got: "${raw}"`);
  }
  return parsed;
}

export const config: EnvironmentConfig = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvInt('PORT', 3000),
  apiVersion: getEnvVar('API_VERSION', 'v1'),

  firebaseProjectId: getEnvVar('FIREBASE_PROJECT_ID', 'safestay-12b52'),
  firebaseApiKey: getEnvVar('FIREBASE_API_KEY', ''),
  firebaseAuthDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', 'safestay-12b52.firebaseapp.com'),
  firebaseDatabaseUrl: getEnvVar('FIREBASE_DATABASE_URL', 'https://safestay-12b52-default-rtdb.firebaseio.com'),
  googleApplicationCredentials: getEnvVar('GOOGLE_APPLICATION_CREDENTIALS', ''),

  redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),

  rateLimitWindowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 60_000),
  rateLimitMaxRequests: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),

  corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3001'),

  logLevel: getEnvVar('LOG_LEVEL', 'debug'),

  alertServiceUrl: getEnvVar('ALERT_SERVICE_URL', 'http://localhost:8000'),
  aiGatewayUrl: getEnvVar('AI_GATEWAY_URL', 'http://localhost:8001'),
  notificationServiceUrl: getEnvVar('NOTIFICATION_SERVICE_URL', 'http://localhost:3002'),
  websocketServiceUrl: getEnvVar('WEBSOCKET_SERVICE_URL', 'http://localhost:3003'),
};

export const isProduction = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
