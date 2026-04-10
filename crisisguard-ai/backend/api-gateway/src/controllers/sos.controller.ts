/**
 * CrisisGuard AI - Guest SOS Controller
 * Emergency endpoints for guest-facing mobile app: panic button, SOS, check-in.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { lifecycleManager } from '../services/lifecycle.service.js';

const router = Router();

interface SOSRecord {
  sosId: string;
  guestUid: string;
  type: string;
  location: {
    coordinates: { lat: number; lng: number };
    floor: number;
    zone: string;
    roomNumber?: string;
  };
  message?: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  incidentId?: string;
  createdAt: string;
}

const sosLog: Map<string, SOSRecord> = new Map();

/**
 * POST /api/v1/sos/panic
 * One-tap panic button — creates highest-priority incident immediately.
 */
router.post('/panic', (req: Request, res: Response) => {
  const { guestUid, location, roomNumber } = req.body;

  if (!guestUid || !location) {
    res.status(400).json({ success: false, error: 'Missing guestUid or location' });
    return;
  }

  const sosId = `sos-${uuidv4().slice(0, 8)}`;

  // Create immediate critical incident
  const incident = lifecycleManager.createIncident({
    eventId: `evt-panic-${uuidv4().slice(0, 8)}`,
    propertyId: 'default-property',
    type: 'security',
    severity: 'critical',
    source: 'guest_panic_button',
    location: {
      coordinates: location.coordinates || { lat: 0, lng: 0 },
      floor: location.floor || 1,
      zone: location.zone || 'unknown',
      description: roomNumber ? `Room ${roomNumber}` : undefined,
    },
    detectedAt: new Date(),
    assignedStaff: [],
    guestCount: 1,
    metadata: { sosId, guestUid, panicButton: true },
  });

  const record: SOSRecord = {
    sosId,
    guestUid,
    type: 'panic',
    location: { ...location, roomNumber },
    status: 'pending',
    incidentId: incident.eventId,
    createdAt: new Date().toISOString(),
  };

  sosLog.set(sosId, record);

  console.log(`[SOS] PANIC from ${guestUid} at floor ${location.floor} — incident ${incident.eventId}`);

  res.status(201).json({
    success: true,
    data: {
      sosId,
      incidentId: incident.eventId,
      message: 'Help is on the way. Stay calm and stay where you are.',
      estimatedResponseTime: '2-3 minutes',
    },
  });
});

/**
 * POST /api/v1/sos/report
 * Detailed SOS report with type and optional message.
 */
router.post('/report', (req: Request, res: Response) => {
  const { guestUid, type, location, message, roomNumber } = req.body;

  if (!guestUid || !type || !location) {
    res.status(400).json({ success: false, error: 'Missing guestUid, type, or location' });
    return;
  }

  const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
    fire: 'critical',
    medical: 'high',
    security: 'high',
    suspicious: 'medium',
    noise: 'low',
    maintenance: 'low',
  };

  const sosId = `sos-${uuidv4().slice(0, 8)}`;

  const incident = lifecycleManager.createIncident({
    eventId: `evt-sos-${uuidv4().slice(0, 8)}`,
    propertyId: 'default-property',
    type: type === 'suspicious' ? 'security' : type === 'noise' || type === 'maintenance' ? 'hazard' : type,
    severity: severityMap[type] || 'medium',
    source: 'guest_sos_report',
    location: {
      coordinates: location.coordinates || { lat: 0, lng: 0 },
      floor: location.floor || 1,
      zone: location.zone || 'unknown',
      description: roomNumber ? `Room ${roomNumber}` : undefined,
    },
    detectedAt: new Date(),
    assignedStaff: [],
    guestCount: 1,
    metadata: { sosId, guestUid, guestMessage: message },
  });

  const record: SOSRecord = {
    sosId,
    guestUid,
    type,
    location: { ...location, roomNumber },
    message,
    status: 'pending',
    incidentId: incident.eventId,
    createdAt: new Date().toISOString(),
  };

  sosLog.set(sosId, record);

  console.log(`[SOS] ${type.toUpperCase()} report from ${guestUid} — incident ${incident.eventId}`);

  res.status(201).json({
    success: true,
    data: {
      sosId,
      incidentId: incident.eventId,
      severity: severityMap[type] || 'medium',
      message: 'Your report has been received. Staff will respond shortly.',
    },
  });
});

/**
 * GET /api/v1/sos/:sosId
 * Check SOS status.
 */
router.get('/:sosId', (req: Request, res: Response) => {
  const sosId = String(req.params['sosId']);
  const record = sosLog.get(sosId);

  if (!record) {
    res.status(404).json({ success: false, error: 'SOS record not found' });
    return;
  }

  res.json({ success: true, data: record });
});

/**
 * POST /api/v1/sos/checkin
 * Guest check-in at assembly point during evacuation.
 */
router.post('/checkin', (req: Request, res: Response) => {
  const { guestUid, assemblyPointId, method } = req.body;

  if (!guestUid || !assemblyPointId) {
    res.status(400).json({ success: false, error: 'Missing guestUid or assemblyPointId' });
    return;
  }

  console.log(`[SOS] Guest ${guestUid} checked in at ${assemblyPointId} via ${method || 'app'}`);

  res.json({
    success: true,
    data: {
      guestUid,
      assemblyPointId,
      method: method || 'app',
      checkedInAt: new Date().toISOString(),
      message: 'You are checked in. Stay at the assembly point until cleared by staff.',
    },
  });
});

export default router;
