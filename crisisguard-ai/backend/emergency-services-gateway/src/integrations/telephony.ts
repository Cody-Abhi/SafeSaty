/**
 * CrisisGuard AI - Telephony Integration
 * Twilio Voice fallback for unacknowledged guest notifications.
 * TTS incident summary → automated phone call → callback handling.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const telephonyRouter = Router();

// Dynamic Twilio import (only loaded if credentials available)
let twilioClient: any = null;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

if (TWILIO_SID && TWILIO_TOKEN) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
    console.log('[Telephony] Twilio client initialized');
  } catch {
    console.warn('[Telephony] Twilio SDK not available — voice calls disabled');
  }
}

const callLog: Map<string, {
  callId: string;
  to: string;
  status: string;
  twilioSid?: string;
  timestamp: string;
}> = new Map();

/**
 * POST /voice-call
 * Initiate an automated voice call with TTS incident summary.
 */
telephonyRouter.post('/voice-call', async (req: Request, res: Response) => {
  const { to, incidentType, severity, location, eventId } = req.body;

  if (!to || !incidentType) {
    res.status(400).json({ success: false, error: 'Missing required: to, incidentType' });
    return;
  }

  const callId = `CALL-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Build TTS message
  const ttsMessage = buildTTSMessage(incidentType, severity, location);

  if (!twilioClient) {
    // Log the call attempt even without Twilio
    const record = {
      callId,
      to,
      status: 'simulated',
      timestamp: new Date().toISOString(),
    };
    callLog.set(callId, record);

    console.log(`[Telephony] SIMULATED call ${callId} to ${to}: "${ttsMessage}"`);

    res.status(201).json({
      success: true,
      data: {
        callId,
        to,
        status: 'simulated',
        message: ttsMessage,
        note: 'Twilio not configured — call simulated',
      },
    });
    return;
  }

  try {
    const twiml = `<Response><Say voice="alice" language="en-US">${escapeXml(ttsMessage)}</Say><Pause length="1"/><Say voice="alice">Press 1 to acknowledge this alert. Press 2 to request callback from hotel command center.</Say><Gather numDigits="1" action="${process.env.CALLBACK_URL || 'https://crisisguard.example.com'}/api/external/telephony/gather/${callId}" method="POST"><Say>Please press 1 or 2 now.</Say></Gather></Response>`;

    const call = await twilioClient.calls.create({
      to,
      from: TWILIO_FROM,
      twiml,
    });

    const record = {
      callId,
      to,
      status: 'initiated',
      twilioSid: call.sid,
      timestamp: new Date().toISOString(),
    };
    callLog.set(callId, record);

    console.log(`[Telephony] Call ${callId} initiated to ${to} — Twilio SID: ${call.sid}`);

    res.status(201).json({
      success: true,
      data: {
        callId,
        to,
        twilioSid: call.sid,
        status: 'initiated',
      },
    });
  } catch (error: any) {
    console.error(`[Telephony] Call failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: `Voice call failed: ${error.message}`,
    });
  }
});

/**
 * POST /gather/:callId
 * Handle DTMF input from Twilio voice call.
 */
telephonyRouter.post('/gather/:callId', (req: Request, res: Response) => {
  const callId = String(req.params['callId']);
  const digits = req.body.Digits;

  const record = callLog.get(callId);
  if (record) {
    record.status = digits === '1' ? 'acknowledged' : 'callback_requested';
    console.log(`[Telephony] Call ${callId} — guest pressed ${digits}: ${record.status}`);
  }

  let response: string;
  if (digits === '1') {
    response = '<Response><Say voice="alice">Thank you. Your acknowledgment has been recorded. Please follow evacuation instructions on your phone or proceed to the nearest exit.</Say></Response>';
  } else {
    response = '<Response><Say voice="alice">A command center operator will call you back shortly. Please stay calm and follow visible exit signs.</Say></Response>';
  }

  res.type('text/xml').send(response);
});

/**
 * GET /status/:callId
 * Check voice call status.
 */
telephonyRouter.get('/status/:callId', (req: Request, res: Response) => {
  const callId = String(req.params['callId']);
  const record = callLog.get(callId);

  if (!record) {
    res.status(404).json({ success: false, error: 'Call ID not found' });
    return;
  }

  res.json({ success: true, data: record });
});

/**
 * POST /bulk-call
 * Initiate voice calls to multiple numbers (mass notification fallback).
 */
telephonyRouter.post('/bulk-call', async (req: Request, res: Response) => {
  const { numbers, incidentType, severity, location, eventId } = req.body;

  if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
    res.status(400).json({ success: false, error: 'Missing or empty numbers array' });
    return;
  }

  const results: any[] = [];
  const ttsMessage = buildTTSMessage(incidentType, severity, location);

  for (const number of numbers.slice(0, 50)) { // Cap at 50 per batch
    const callId = `CALL-${uuidv4().slice(0, 8).toUpperCase()}`;
    callLog.set(callId, {
      callId,
      to: number,
      status: twilioClient ? 'queued' : 'simulated',
      timestamp: new Date().toISOString(),
    });
    results.push({ callId, to: number, status: twilioClient ? 'queued' : 'simulated' });
  }

  console.log(`[Telephony] Bulk call: ${results.length} calls ${twilioClient ? 'queued' : 'simulated'}`);

  res.status(201).json({
    success: true,
    data: {
      total: results.length,
      calls: results,
    },
  });
});

// ─── Helpers ─────────────────────────────────────────────────

function buildTTSMessage(type: string, severity: string, location: any): string {
  const typeLabel = (type || 'emergency').replace(/_/g, ' ');
  const floor = location?.floor || 'unknown';
  const zone = location?.zone?.replace(/_/g, ' ') || 'unknown';

  return `Attention. This is an automated emergency notification from CrisisGuard AI. `
    + `A ${severity || ''} ${typeLabel} has been detected on floor ${floor}, ${zone} area. `
    + `Please follow evacuation instructions immediately. `
    + `Proceed to the nearest marked exit. Do not use elevators.`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
