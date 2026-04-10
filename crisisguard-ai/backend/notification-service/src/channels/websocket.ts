/**
 * CrisisGuard AI - WebSocket Channel
 * Dispatches real-time alerts to connected dashboard clients via Socket.IO.
 */

import { io as SocketIOClient, Socket } from 'socket.io-client';
import { logger } from '../utils/logger.js';
import type { NotificationPayload, NotificationTarget, DeliveryResult } from '../types/index.js';

const WS_SERVICE_URL = process.env.WS_SERVICE_URL || 'http://localhost:3003';

export class WebSocketChannel {
  private socket: Socket | null = null;
  private connected = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      this.socket = SocketIOClient(WS_SERVICE_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        this.connected = true;
        logger.info('WebSocket channel connected to WS service', {
          url: WS_SERVICE_URL,
        });
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        logger.warn('WebSocket channel disconnected', { reason });
      });

      this.socket.on('connect_error', (error) => {
        logger.warn('WebSocket channel connection error', {
          error: error.message,
          url: WS_SERVICE_URL,
        });
      });
    } catch (error) {
      logger.warn('WebSocket channel initialization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send alert notification through WebSocket to a property namespace.
   */
  async send(
    target: NotificationTarget,
    payload: NotificationPayload,
    eventData: Record<string, unknown>
  ): Promise<DeliveryResult> {
    if (!this.socket || !this.connected) {
      return {
        channel: 'websocket',
        status: 'failed',
        targetUid: target.uid,
        error: 'WebSocket not connected',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Emit to the property namespace
      this.socket.emit('notification:dispatch', {
        propertyId: target.propertyId,
        targetUid: target.uid,
        targetRole: target.role,
        notification: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          priority: payload.priority,
        },
        event: eventData,
        timestamp: new Date().toISOString(),
      });

      logger.debug('WebSocket notification emitted', {
        targetUid: target.uid,
        propertyId: target.propertyId,
      });

      return {
        channel: 'websocket',
        status: 'sent',
        targetUid: target.uid,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        channel: 'websocket',
        status: 'failed',
        targetUid: target.uid,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }
}
