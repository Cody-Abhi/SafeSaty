/**
 * CrisisGuard AI - Staff Dispatch Controller
 * REST endpoints for staff management and task dispatch.
 */

import { Router, Request, Response } from 'express';
import { staffDispatchService, StaffMember } from '../services/dispatch.service.js';

const router = Router();

// Seed demo staff for testing
const DEMO_STAFF: StaffMember[] = [
  {
    uid: 'staff-001', displayName: 'Raj Mehta', role: 'security', status: 'available',
    currentLocation: { coordinates: { lat: 28.6135, lng: 77.208 }, floor: 1, zone: 'central' },
    assignedIncidents: [], certifications: ['fire_safety', 'first_aid'], lastUpdated: new Date().toISOString(),
  },
  {
    uid: 'staff-002', displayName: 'Priya Sharma', role: 'medical', status: 'available',
    currentLocation: { coordinates: { lat: 28.614, lng: 77.209 }, floor: 2, zone: 'east_wing' },
    assignedIncidents: [], certifications: ['emt_basic', 'first_aid'], lastUpdated: new Date().toISOString(),
  },
  {
    uid: 'staff-003', displayName: 'Amit Patel', role: 'engineering', status: 'available',
    currentLocation: { coordinates: { lat: 28.613, lng: 77.207 }, floor: 1, zone: 'west_wing' },
    assignedIncidents: [], certifications: ['fire_suppression', 'hazmat'], lastUpdated: new Date().toISOString(),
  },
  {
    uid: 'staff-004', displayName: 'Sara Khan', role: 'manager', status: 'available',
    currentLocation: { coordinates: { lat: 28.614, lng: 77.208 }, floor: 1, zone: 'central' },
    assignedIncidents: [], certifications: ['crisis_management', 'first_aid'], lastUpdated: new Date().toISOString(),
  },
  {
    uid: 'staff-005', displayName: 'Vikram Singh', role: 'security', status: 'available',
    currentLocation: { coordinates: { lat: 28.6138, lng: 77.21 }, floor: 3, zone: 'east_wing' },
    assignedIncidents: [], certifications: ['fire_safety', 'crowd_control'], lastUpdated: new Date().toISOString(),
  },
];

DEMO_STAFF.forEach((s) => staffDispatchService.registerStaff(s));

/**
 * GET /api/v1/staff
 * List all on-duty staff.
 */
router.get('/', (_req: Request, res: Response) => {
  const staff = staffDispatchService.getOnDutyStaff();
  res.json({ success: true, data: staff });
});

/**
 * GET /api/v1/staff/metrics
 * Get staff deployment overview.
 */
router.get('/metrics', (_req: Request, res: Response) => {
  const metrics = staffDispatchService.getMetrics();
  res.json({ success: true, data: metrics });
});

/**
 * PATCH /api/v1/staff/:uid/status
 * Update staff availability status.
 */
router.patch('/:uid/status', (req: Request, res: Response) => {
  const uid = String(req.params['uid']);
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ success: false, error: 'Missing status' });
    return;
  }

  const ok = staffDispatchService.updateStatus(uid, status);
  if (!ok) {
    res.status(404).json({ success: false, error: 'Staff member not found' });
    return;
  }

  res.json({ success: true, data: { uid, status } });
});

/**
 * PATCH /api/v1/staff/:uid/location
 * Update staff real-time location.
 */
router.patch('/:uid/location', (req: Request, res: Response) => {
  const uid = String(req.params['uid']);
  const { coordinates, floor, zone } = req.body;

  const ok = staffDispatchService.updateLocation(uid, { coordinates, floor, zone });
  if (!ok) {
    res.status(404).json({ success: false, error: 'Staff member not found' });
    return;
  }

  res.json({ success: true, data: { uid, updated: true } });
});

/**
 * POST /api/v1/staff/find-optimal
 * Find the best available staff for a given incident type and location.
 */
router.post('/find-optimal', (req: Request, res: Response) => {
  const { incidentType, location, count } = req.body;

  if (!incidentType || !location) {
    res.status(400).json({ success: false, error: 'Missing incidentType or location' });
    return;
  }

  const optimal = staffDispatchService.findOptimalStaff(incidentType, location, count || 2);

  res.json({
    success: true,
    data: {
      candidates: optimal.map((s) => ({
        uid: s.uid,
        displayName: s.displayName,
        role: s.role,
        floor: s.currentLocation?.floor,
        zone: s.currentLocation?.zone,
      })),
      count: optimal.length,
    },
  });
});

/**
 * POST /api/v1/staff/dispatch
 * Dispatch a staff member to an incident with a specific task.
 */
router.post('/dispatch', (req: Request, res: Response) => {
  const { staffUid, incidentId, task, priority } = req.body;

  if (!staffUid || !incidentId || !task) {
    res.status(400).json({ success: false, error: 'Missing staffUid, incidentId, or task' });
    return;
  }

  const dispatchTask = staffDispatchService.dispatch(staffUid, incidentId, task, priority || 'high');

  if (!dispatchTask) {
    res.status(404).json({ success: false, error: 'Staff member not found' });
    return;
  }

  res.status(201).json({ success: true, data: dispatchTask });
});

/**
 * PATCH /api/v1/staff/task/:taskId
 * Update task status (en_route, on_scene, completed).
 */
router.patch('/task/:taskId', (req: Request, res: Response) => {
  const taskId = String(req.params['taskId']);
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ success: false, error: 'Missing status' });
    return;
  }

  const ok = staffDispatchService.updateTaskStatus(taskId, status);
  if (!ok) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  res.json({ success: true, data: { taskId, status } });
});

export default router;
