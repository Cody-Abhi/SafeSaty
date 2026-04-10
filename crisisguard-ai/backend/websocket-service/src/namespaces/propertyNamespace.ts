/**
 * CrisisGuard AI - Property Namespace Handler
 * Dynamic namespace for property-level isolation.
 * Pattern: /property-{propertyId}
 * 
 * Supports:
 * - Incident rooms (auto-created per incident)
 * - Zone rooms (guests auto-joined by location)
 * - Direct channels (staff-to-guest, command-to-responder)
 */

import { Namespace, Socket } from 'socket.io';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('property-namespace');

interface AlertPayload {
  eventId: string;
  type: string;
  severity: string;
  location: {
    floor: number;
    zone: string;
    coordinates?: { latitude: number; longitude: number };
    description?: string;
  };
  source: string;
  timestamp: string;
  instructions?: string;
}

interface ChatMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  mediaUrl?: string;
  timestamp: string;
  channel: string; // incident:{eventId} | zone:{zoneId} | direct:{uid}
}

interface TaskAssignment {
  taskId: string;
  eventId: string;
  assignedTo: string;
  type: string;
  description: string;
  location: {
    floor: number;
    zone: string;
  };
  deadline?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export function setupPropertyNamespace(nsp: Namespace): void {
  nsp.on('connection', (socket: Socket) => {
    const namespaceName = socket.nsp.name;
    const propertyId = namespaceName.replace('/property-', '');

    logger.info('Client connected to property namespace', {
      socketId: socket.id,
      propertyId,
    });

    // ─── Room Management ───────────────────────────────────

    /**
     * Join an incident room for real-time coordination.
     */
    socket.on('room:join:incident', (data: { eventId: string }) => {
      const roomName = `incident:${data.eventId}`;
      socket.join(roomName);
      logger.info('Joined incident room', {
        socketId: socket.id,
        room: roomName,
        propertyId,
      });
      socket.emit('room:joined', { room: roomName });
    });

    /**
     * Leave an incident room.
     */
    socket.on('room:leave:incident', (data: { eventId: string }) => {
      const roomName = `incident:${data.eventId}`;
      socket.leave(roomName);
      logger.debug('Left incident room', { socketId: socket.id, room: roomName });
    });

    /**
     * Join a zone room (based on user location).
     */
    socket.on('room:join:zone', (data: { zoneId: string }) => {
      const roomName = `zone:${data.zoneId}`;
      socket.join(roomName);
      logger.debug('Joined zone room', {
        socketId: socket.id,
        room: roomName,
      });
      socket.emit('room:joined', { room: roomName });
    });

    /**
     * Switch zone room (leave old, join new).
     */
    socket.on('room:switch:zone', (data: { oldZoneId: string; newZoneId: string }) => {
      const oldRoom = `zone:${data.oldZoneId}`;
      const newRoom = `zone:${data.newZoneId}`;
      socket.leave(oldRoom);
      socket.join(newRoom);
      logger.debug('Switched zone room', {
        socketId: socket.id,
        from: oldRoom,
        to: newRoom,
      });
    });

    // ─── Alert Events ──────────────────────────────────────

    /**
     * New alert broadcast to all connected clients in the property.
     * Triggered server-side when a confirmed alert arrives.
     */
    socket.on('alert:new', (payload: AlertPayload) => {
      // Broadcast to all in this property namespace
      socket.broadcast.emit('alert:new', payload);
      logger.info('Alert broadcast to property', {
        eventId: payload.eventId,
        type: payload.type,
        severity: payload.severity,
        propertyId,
      });
    });

    /**
     * Alert update (status change, new info).
     */
    socket.on('alert:update', (payload: AlertPayload & { status: string }) => {
      socket.broadcast.emit('alert:update', payload);
      // Also emit to the specific incident room
      const incidentRoom = `incident:${payload.eventId}`;
      nsp.to(incidentRoom).emit('alert:update', payload);
    });

    // ─── Chat / Communication ──────────────────────────────

    /**
     * Send a chat message to a specific channel.
     */
    socket.on('chat:message', (message: ChatMessage) => {
      const { channel } = message;

      if (channel.startsWith('incident:')) {
        // Send to incident room
        nsp.to(channel).emit('chat:message', message);
      } else if (channel.startsWith('zone:')) {
        // Send to zone room
        nsp.to(channel).emit('chat:message', message);
      } else if (channel.startsWith('direct:')) {
        // Direct message — find target socket and emit
        const targetUid = channel.replace('direct:', '');
        // This broadcasts to all sockets; client-side filters by targetUid
        socket.broadcast.emit('chat:direct', {
          ...message,
          targetUid,
        });
      } else {
        // Broadcast to entire property
        socket.broadcast.emit('chat:broadcast', message);
      }

      logger.debug('Chat message sent', {
        channel,
        senderId: message.senderId,
      });
    });

    // ─── Task Management ───────────────────────────────────

    /**
     * Assign a task to a staff member.
     */
    socket.on('task:assign', (task: TaskAssignment) => {
      // Emit to the specific staff member and to the incident room
      socket.broadcast.emit('task:assign', task);
      const incidentRoom = `incident:${task.eventId}`;
      nsp.to(incidentRoom).emit('task:assign', task);

      logger.info('Task assigned', {
        taskId: task.taskId,
        assignedTo: task.assignedTo,
        eventId: task.eventId,
      });
    });

    /**
     * Update task status (en_route, on_scene, complete, escalated).
     */
    socket.on('task:status', (data: {
      taskId: string;
      eventId: string;
      status: string;
      notes?: string;
      timestamp: string;
    }) => {
      const incidentRoom = `incident:${data.eventId}`;
      nsp.to(incidentRoom).emit('task:status', data);
      // Also broadcast to property for dashboard
      socket.broadcast.emit('task:status', data);

      logger.info('Task status updated', {
        taskId: data.taskId,
        status: data.status,
      });
    });

    // ─── Evacuation ────────────────────────────────────────

    /**
     * Send evacuation route to specific zone or all.
     */
    socket.on('evacuation:route', (data: {
      targetZone?: string;
      waypoints: Array<{ lat: number; lng: number; floor: number }>;
      distance: number;
      estimatedTime: number;
      exitName: string;
    }) => {
      if (data.targetZone) {
        nsp.to(`zone:${data.targetZone}`).emit('evacuation:route', data);
      } else {
        socket.broadcast.emit('evacuation:route', data);
      }
    });

    // ─── Disconnect ────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected from property', {
        socketId: socket.id,
        propertyId,
        reason,
      });
    });
  });
}
