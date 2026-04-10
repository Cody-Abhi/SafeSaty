/**
 * CrisisGuard AI - CAD Integration (Computer-Aided Dispatch)
 * Formats and sends incident data to external dispatch systems using NIEM-compliant payloads.
 * In production, this POSTs to the jurisdiction's CAD endpoint over mTLS.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const cadRouter = Router();

/** NIEM-formatted incident payload for CAD systems */
interface NIEMIncidentPayload {
  incidentId: string;
  cadReferenceId: string;
  incidentType: string;
  priority: string;
  location: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { latitude: number; longitude: number };
    floor: number;
    room?: string;
    additionalInfo?: string;
  };
  callerInfo: {
    name?: string;
    callbackNumber?: string;
    language: string;
  };
  incidentDetails: {
    description: string;
    severity: string;
    occupantsAtRisk: number;
    hazards: string[];
    accessNotes: string;
  };
  propertyInfo: {
    propertyName: string;
    propertyType: string;
    totalFloors: number;
    fireSystemStatus: string;
    sprinklerCoverage: boolean;
  };
  attachments: Array<{
    type: string;
    url: string;
    description: string;
  }>;
  timestamp: string;
}

// Track dispatched incidents
const dispatchLog: Map<string, NIEMIncidentPayload> = new Map();

/**
 * POST /dispatch
 * Format an incident into NIEM-compliant structure and dispatch to CAD.
 */
cadRouter.post('/dispatch', (req: Request, res: Response) => {
  const {
    eventId,
    type,
    severity,
    location,
    propertyId,
    guestCount,
    metadata,
  } = req.body;

  if (!eventId || !type || !location) {
    res.status(400).json({ success: false, error: 'Missing required fields: eventId, type, location' });
    return;
  }

  const cadReferenceId = `CAD-${uuidv4().slice(0, 8).toUpperCase()}`;

  const payload: NIEMIncidentPayload = {
    incidentId: eventId,
    cadReferenceId,
    incidentType: mapToCADType(type),
    priority: mapToCADPriority(severity),
    location: {
      streetAddress: location.description || 'Property Address',
      city: 'New Delhi',
      state: 'DL',
      zipCode: '110001',
      coordinates: {
        latitude: location.coordinates?.lat || 0,
        longitude: location.coordinates?.lng || 0,
      },
      floor: location.floor || 1,
      room: location.roomNumber,
      additionalInfo: `Zone: ${location.zone || 'unknown'}`,
    },
    callerInfo: {
      name: 'CrisisGuard AI Automated Dispatch',
      callbackNumber: process.env.PROPERTY_CALLBACK_NUMBER || '+1-555-0100',
      language: 'en',
    },
    incidentDetails: {
      description: `${type.toUpperCase()} emergency detected at floor ${location.floor}, zone ${location.zone}. AI confidence: ${metadata?.confidence || 'N/A'}.`,
      severity: severity || 'high',
      occupantsAtRisk: guestCount || 0,
      hazards: buildHazardList(type),
      accessNotes: 'Main entrance accessible. Freight elevator available for equipment.',
    },
    propertyInfo: {
      propertyName: propertyId || 'Grand Hotel',
      propertyType: 'hotel',
      totalFloors: 5,
      fireSystemStatus: 'active',
      sprinklerCoverage: true,
    },
    attachments: metadata?.cameraId
      ? [{ type: 'cctv_snapshot', url: `https://cctv.internal/${metadata.cameraId}/latest`, description: 'Latest CCTV frame' }]
      : [],
    timestamp: new Date().toISOString(),
  };

  // In production: POST to CAD endpoint via mTLS
  // await httpClient.post(CAD_ENDPOINT, payload, { cert, key });
  dispatchLog.set(cadReferenceId, payload);

  console.log(`[CAD] Dispatched ${cadReferenceId} for incident ${eventId} — priority ${payload.priority}`);

  res.status(201).json({
    success: true,
    data: {
      cadReferenceId,
      incidentId: eventId,
      priority: payload.priority,
      dispatchedAt: payload.timestamp,
      status: 'dispatched',
    },
  });
});

/**
 * GET /status/:cadReferenceId
 * Check dispatch status.
 */
cadRouter.get('/status/:cadReferenceId', (req: Request, res: Response) => {
  const id = String(req.params['cadReferenceId']);
  const record = dispatchLog.get(id);

  if (!record) {
    res.status(404).json({ success: false, error: 'CAD reference not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      cadReferenceId: id,
      incidentId: record.incidentId,
      priority: record.priority,
      dispatchedAt: record.timestamp,
      status: 'dispatched', // In production: poll CAD for real status
    },
  });
});

// ─── Helpers ─────────────────────────────────────────────────

function mapToCADType(type: string): string {
  const map: Record<string, string> = {
    fire: 'FIRE_STRUCTURE',
    medical: 'MEDICAL_EMERGENCY',
    security: 'LAW_ENFORCEMENT',
    natural_disaster: 'WEATHER_EMERGENCY',
    hazard: 'HAZMAT',
  };
  return map[type] || 'GENERAL_EMERGENCY';
}

function mapToCADPriority(severity: string): string {
  const map: Record<string, string> = {
    critical: 'EMERGENCY',
    high: 'PRIORITY',
    medium: 'ROUTINE',
    low: 'NON_EMERGENCY',
  };
  return map[severity] || 'ROUTINE';
}

function buildHazardList(type: string): string[] {
  const hazards: Record<string, string[]> = {
    fire: ['active_fire', 'smoke', 'possible_structural_damage'],
    medical: ['medical_emergency', 'possible_trauma'],
    security: ['active_threat', 'possible_weapons'],
    natural_disaster: ['structural_risk', 'flooding_risk'],
    hazard: ['chemical_spill', 'gas_leak'],
  };
  return hazards[type] || ['unknown_hazard'];
}
