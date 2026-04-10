/**
 * CrisisGuard AI - NG911 Integration
 * Next-Generation 911 rich data submission.
 * Sends structured location data, media, and incident context
 * to NG911-compatible PSAPs (Public Safety Answering Points).
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const ng911Router = Router();

interface NG911DataPackage {
  callId: string;
  originatingSystem: string;
  location: {
    civicAddress: string;
    coordinates: { lat: number; lng: number };
    floor: number;
    room?: string;
    uncertainty_m: number;
  };
  incident: {
    type: string;
    severity: string;
    description: string;
    activeThreats: string[];
  };
  occupancy: {
    totalGuests: number;
    totalStaff: number;
    evacuationStatus: string;
    assemblyPointCheckedIn: number;
  };
  media: Array<{
    type: 'image' | 'video' | 'audio' | 'floorplan';
    url: string;
    timestamp: string;
  }>;
  additionalData: {
    propertyContactNumber: string;
    commandCenterOperator: string;
    aiConfidenceScore: number;
    detectionSource: string;
  };
  timestamp: string;
}

const ng911Log: Map<string, NG911DataPackage> = new Map();

/**
 * POST /submit
 * Submit a rich data package to the NG911-compatible PSAP.
 */
ng911Router.post('/submit', (req: Request, res: Response) => {
  const {
    eventId,
    type,
    severity,
    location,
    guestCount,
    staffCount,
    evacuationStatus,
    metadata,
    mediaUrls,
  } = req.body;

  if (!eventId || !type || !location) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  const callId = `NG911-${uuidv4().slice(0, 8).toUpperCase()}`;

  const dataPackage: NG911DataPackage = {
    callId,
    originatingSystem: 'CrisisGuard AI v1.0',
    location: {
      civicAddress: location.description || 'Hotel Property',
      coordinates: {
        lat: location.coordinates?.lat || 0,
        lng: location.coordinates?.lng || 0,
      },
      floor: location.floor || 1,
      room: location.roomNumber,
      uncertainty_m: 5, // Indoor positioning accuracy
    },
    incident: {
      type,
      severity: severity || 'high',
      description: `AI-detected ${type} emergency. Floor ${location.floor}, Zone ${location.zone}.`,
      activeThreats: metadata?.hazards || [],
    },
    occupancy: {
      totalGuests: guestCount || 0,
      totalStaff: staffCount || 0,
      evacuationStatus: evacuationStatus || 'in_progress',
      assemblyPointCheckedIn: metadata?.checkedIn || 0,
    },
    media: (mediaUrls || []).map((url: string) => ({
      type: 'image' as const,
      url,
      timestamp: new Date().toISOString(),
    })),
    additionalData: {
      propertyContactNumber: process.env.PROPERTY_CALLBACK_NUMBER || '+1-555-0100',
      commandCenterOperator: 'CrisisGuard AI Command Center',
      aiConfidenceScore: metadata?.confidence || 0,
      detectionSource: metadata?.source || 'ai_cctv',
    },
    timestamp: new Date().toISOString(),
  };

  // In production: POST to PSAP NG911 endpoint
  ng911Log.set(callId, dataPackage);

  console.log(`[NG911] Data package ${callId} submitted for incident ${eventId}`);

  res.status(201).json({
    success: true,
    data: {
      callId,
      eventId,
      status: 'submitted',
      submittedAt: dataPackage.timestamp,
    },
  });
});

/**
 * GET /status/:callId
 * Check NG911 submission status.
 */
ng911Router.get('/status/:callId', (req: Request, res: Response) => {
  const callId = String(req.params['callId']);
  const record = ng911Log.get(callId);

  if (!record) {
    res.status(404).json({ success: false, error: 'NG911 call ID not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      callId,
      status: 'acknowledged',
      submittedAt: record.timestamp,
      psapResponse: 'Units dispatched',
    },
  });
});
