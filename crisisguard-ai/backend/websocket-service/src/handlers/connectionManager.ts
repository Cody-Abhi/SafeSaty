/**
 * CrisisGuard AI - Connection Manager
 * Tracks all WebSocket connections with metadata.
 * Singleton pattern for global access across handlers.
 */

import { Socket } from 'socket.io';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('connection-manager');

interface ConnectionMeta {
  socketId: string;
  uid?: string;
  role?: string;
  propertyId?: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  rooms: Set<string>;
  transport: string;
}

export class ConnectionManager {
  private static instance: ConnectionManager;
  private connections: Map<string, ConnectionMeta> = new Map();

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Handle new socket connection on default namespace.
   */
  handleConnection(socket: Socket): void {
    const meta: ConnectionMeta = {
      socketId: socket.id,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      rooms: new Set(),
      transport: socket.conn.transport.name,
    };

    this.connections.set(socket.id, meta);

    logger.info('Client connected', {
      socketId: socket.id,
      transport: meta.transport,
      totalConnections: this.connections.size,
    });

    // ─── Heartbeat ─────────────────────────────────────────
    socket.on('heartbeat', (data: { timestamp: string }) => {
      const conn = this.connections.get(socket.id);
      if (conn) {
        conn.lastHeartbeat = new Date();
      }
      socket.emit('heartbeat', {
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
        clientTimestamp: data?.timestamp,
      });
    });

    // ─── Auth Binding (post-connection) ────────────────────
    socket.on('auth:bind', (data: { uid: string; role: string; propertyId: string }) => {
      const conn = this.connections.get(socket.id);
      if (conn) {
        conn.uid = data.uid;
        conn.role = data.role;
        conn.propertyId = data.propertyId;

        logger.info('Socket authenticated', {
          socketId: socket.id,
          uid: data.uid,
          role: data.role,
          propertyId: data.propertyId,
        });

        socket.emit('auth:bound', { success: true });
      }
    });

    // ─── Location Updates ──────────────────────────────────
    socket.on('location:update', (data: {
      latitude: number;
      longitude: number;
      floor: number;
      accuracy?: number;
      timestamp: string;
    }) => {
      const conn = this.connections.get(socket.id);
      if (!conn?.uid) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Broadcast to same property namespace
      if (conn.propertyId) {
        socket.broadcast.emit('location:updated', {
          uid: conn.uid,
          role: conn.role,
          ...data,
        });
      }

      logger.debug('Location update received', {
        uid: conn.uid,
        floor: data.floor,
      });
    });

    // ─── Disconnect ────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      const conn = this.connections.get(socket.id);
      this.connections.delete(socket.id);

      logger.info('Client disconnected', {
        socketId: socket.id,
        uid: conn?.uid,
        reason,
        totalConnections: this.connections.size,
      });
    });
  }

  /**
   * Get connection stats for health endpoint.
   */
  getStats(): {
    total: number;
    authenticated: number;
    byRole: Record<string, number>;
  } {
    let authenticated = 0;
    const byRole: Record<string, number> = {};

    for (const conn of this.connections.values()) {
      if (conn.uid) {
        authenticated++;
        const role = conn.role || 'unknown';
        byRole[role] = (byRole[role] || 0) + 1;
      }
    }

    return {
      total: this.connections.size,
      authenticated,
      byRole,
    };
  }

  /**
   * Get all connections for a specific user UID.
   */
  getConnectionsByUid(uid: string): ConnectionMeta[] {
    const result: ConnectionMeta[] = [];
    for (const conn of this.connections.values()) {
      if (conn.uid === uid) {
        result.push(conn);
      }
    }
    return result;
  }

  /**
   * Get all connections for a specific property.
   */
  getConnectionsByProperty(propertyId: string): ConnectionMeta[] {
    const result: ConnectionMeta[] = [];
    for (const conn of this.connections.values()) {
      if (conn.propertyId === propertyId) {
        result.push(conn);
      }
    }
    return result;
  }
}
