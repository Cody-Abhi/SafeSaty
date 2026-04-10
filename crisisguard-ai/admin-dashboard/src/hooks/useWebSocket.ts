/**
 * CrisisGuard AI - WebSocket Hook
 * Manages Socket.IO connection with auto-reconnect and event routing.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useIncidentStore } from '@/stores/incidentStore';
import { useStaffStore } from '@/stores/staffStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';

interface UseWebSocketOptions {
  propertyId: string;
  token?: string;
  enabled?: boolean;
}

export function useWebSocket({ propertyId, token, enabled = true }: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(0);

  const addIncident = useIncidentStore((s) => s.addIncident);
  const updateIncident = useIncidentStore((s) => s.updateIncident);
  const updateStaffMember = useStaffStore((s) => s.updateStaffMember);

  const connect = useCallback(() => {
    if (!enabled || !propertyId) return;

    const socket = io(`${WS_URL}/property`, {
      auth: { token },
      query: { propertyId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:property', { propertyId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // ─── Incident Events ─────────────────────────────────
    socket.on('alert:new', (data) => {
      addIncident(data);
    });

    socket.on('alert:update', (data) => {
      updateIncident(data.eventId, data);
    });

    // ─── Staff Events ────────────────────────────────────
    socket.on('staff:location', (data) => {
      updateStaffMember(data.uid, {
        location: data.coordinates,
        zone: data.zone,
        floor: data.floor,
        lastSeen: data.timestamp,
      });
    });

    socket.on('staff:status', (data) => {
      updateStaffMember(data.uid, { status: data.status });
    });

    // ─── Latency Measurement ─────────────────────────────
    const pingInterval = setInterval(() => {
      const start = Date.now();
      socket.emit('ping', () => {
        setLatency(Date.now() - start);
      });
    }, 10000);

    socketRef.current = socket;

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, propertyId, token, addIncident, updateIncident, updateStaffMember]);

  useEffect(() => {
    const cleanup = connect();
    return () => cleanup?.();
  }, [connect]);

  /** Emit an event on the current socket */
  const emit = useCallback(
    (event: string, data: unknown) => {
      socketRef.current?.emit(event, data);
    },
    [],
  );

  return { connected, latency, emit, socket: socketRef };
}
