/**
 * CrisisGuard AI - Notification Service Entry Point
 *
 * Subscribes to the confirmed-alerts topic and dispatches notifications
 * via FCM, WebSocket, and SMS based on severity routing rules.
 *
 * Exposes HTTP health/metrics endpoints for monitoring.
 */

import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { NotificationDispatcher } from './services/dispatcher.js';
import { TargetResolver } from './services/targetResolver.js';
import type { EmergencyEventPayload } from './types/index.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3004', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3001';

// Service instances
const dispatcher = new NotificationDispatcher();
const targetResolver = new TargetResolver();

// Metrics
let totalProcessed = 0;
let totalFailed = 0;

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// ─── Health & Metrics ──────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'notification-service',
      metrics: { totalProcessed, totalFailed },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── HTTP Alert Receiver (alternative to Pub/Sub pull) ─────
// This endpoint receives alerts directly via HTTP POST
// In production, replace with Pub/Sub push subscription
app.post('/api/notifications/dispatch', async (req, res) => {
  const event: EmergencyEventPayload = req.body;

  if (!event.event_id || !event.property_id || !event.severity) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: event_id, property_id, severity',
    });
    return;
  }

  try {
    // Resolve targets based on severity and zone
    const targets = await targetResolver.resolve(
      event.property_id,
      event.severity,
      event.location?.zone || 'default'
    );

    // Dispatch to all channels
    const summary = await dispatcher.dispatch(event, targets);
    totalProcessed++;

    logger.info('Notification dispatch complete', {
      eventId: event.event_id,
      targets: targets.length,
      duration: summary.durationMs,
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    totalFailed++;
    logger.error('Notification dispatch failed', {
      eventId: event.event_id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Dispatch failed',
      eventId: event.event_id,
    });
  }
});

// ─── Pub/Sub Push Endpoint ─────────────────────────────────
// For production: Cloud Pub/Sub push subscriptions
app.post('/api/notifications/pubsub', async (req, res) => {
  try {
    // Pub/Sub push sends messages with base64-encoded data
    const pubsubMessage = req.body?.message;

    if (!pubsubMessage?.data) {
      res.status(400).json({ error: 'Invalid Pub/Sub message' });
      return;
    }

    const eventData = JSON.parse(
      Buffer.from(pubsubMessage.data, 'base64').toString('utf-8')
    ) as EmergencyEventPayload;

    logger.info('Received Pub/Sub message', {
      eventId: eventData.event_id,
      messageId: pubsubMessage.messageId,
    });

    // Resolve targets and dispatch
    const targets = await targetResolver.resolve(
      eventData.property_id,
      eventData.severity,
      eventData.location?.zone || 'default'
    );

    const summary = await dispatcher.dispatch(eventData, targets);
    totalProcessed++;

    // ACK the Pub/Sub message
    res.status(200).json({ success: true, eventId: eventData.event_id });

    logger.info('Pub/Sub alert processed', {
      eventId: eventData.event_id,
      duration: summary.durationMs,
    });
  } catch (error) {
    totalFailed++;
    logger.error('Pub/Sub message processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return 500 to NACK — Pub/Sub will retry
    res.status(500).json({ error: 'Processing failed' });
  }
});

// ─── Start Server ──────────────────────────────────────────
const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
  logger.info('📢 CrisisGuard AI - Notification Service started', {
    port: PORT,
    channels: ['fcm', 'websocket', 'sms'],
    pid: process.pid,
  });
});

// Graceful shutdown
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Shutting down notification service...`);
  dispatcher.shutdown();
  httpServer.close(() => {
    logger.info('Notification service stopped');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 30_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
