/**
 * CrisisGuard AI - Incident Controller
 * REST endpoints for incident lifecycle management.
 */

import { Router, Request, Response } from 'express';
import { lifecycleManager } from '../services/lifecycle.service.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/incidents
 * Create a new incident (from alert pipeline or manual staff report).
 */
router.post('/', (req: Request, res: Response) => {
  const {
    propertyId,
    type,
    severity,
    source,
    location,
    guestCount,
    metadata,
  } = req.body;

  if (!propertyId || !type || !severity || !location) {
    res.status(400).json({ success: false, error: 'Missing required fields: propertyId, type, severity, location' });
    return;
  }

  const incident = lifecycleManager.createIncident({
    eventId: `evt-${uuidv4().slice(0, 8)}`,
    propertyId,
    type,
    severity,
    source: source || 'staff_report',
    location,
    detectedAt: new Date(),
    assignedStaff: [],
    guestCount: guestCount || 0,
    metadata: metadata || {},
  });

  res.status(201).json({ success: true, data: incident });
});

/**
 * GET /api/incidents
 * List all active incidents.
 */
router.get('/', (_req: Request, res: Response) => {
  const incidents = lifecycleManager.getActiveIncidents();
  res.json({ success: true, data: incidents });
});

/**
 * GET /api/incidents/metrics
 * Get incident overview metrics.
 */
router.get('/metrics', (_req: Request, res: Response) => {
  const metrics = lifecycleManager.getMetrics();
  res.json({ success: true, data: metrics });
});

/**
 * GET /api/incidents/:id
 * Get incident details with full timeline.
 */
router.get('/:id', (req: Request, res: Response) => {
  const eventId = String(req.params['id']);
  const incident = lifecycleManager.getIncident(eventId);

  if (!incident) {
    res.status(404).json({ success: false, error: 'Incident not found' });
    return;
  }

  res.json({ success: true, data: incident });
});

/**
 * PATCH /api/incidents/:id/status
 * Transition incident to a new status.
 */
router.patch('/:id/status', (req: Request, res: Response) => {
  const eventId = String(req.params['id']);
  const { status, notes } = req.body;
  const user = (req as any).user || { uid: 'system', role: 'admin' };

  if (!status) {
    res.status(400).json({ success: false, error: 'Missing required field: status' });
    return;
  }

  const result = lifecycleManager.transition(
    eventId,
    status,
    user.uid,
    user.role,
    notes,
  );

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json({ success: true, data: result.incident });
});

/**
 * POST /api/incidents/:id/acknowledge
 * Staff acknowledges an incident alert.
 */
router.post('/:id/acknowledge', (req: Request, res: Response) => {
  const eventId = String(req.params['id']);
  const user = (req as any).user || { uid: req.body.staffUid || 'unknown' };

  const result = lifecycleManager.acknowledge(eventId, user.uid);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json({ success: true, data: { acknowledged: true } });
});

/**
 * POST /api/incidents/:id/assign
 * Assign staff to an incident.
 */
router.post('/:id/assign', (req: Request, res: Response) => {
  const eventId = String(req.params['id']);
  const { staffUid, task } = req.body;

  if (!staffUid) {
    res.status(400).json({ success: false, error: 'Missing staffUid' });
    return;
  }

  const result = lifecycleManager.assignStaff(eventId, staffUid, task);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json({ success: true, data: { assigned: true } });
});

export default router;
