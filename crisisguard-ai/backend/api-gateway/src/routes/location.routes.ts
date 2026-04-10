/**
 * CrisisGuard AI - Location Routes
 */

import { Router } from 'express';
import { LocationController } from '../controllers/location.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

export function createLocationRoutes(): Router {
  const router = Router();

  // All location routes require authentication
  router.use(verifyToken);

  // Any authenticated user can update their own location
  router.post('/update', LocationController.updateLocation);
  router.get('/me', LocationController.getMyLocation);

  // Staff/admin can query zone and floor occupancy
  router.get('/zone/:zone', requireRole('staff', 'admin'), LocationController.getZoneOccupants);
  router.get('/floor/:floor', requireRole('staff', 'admin'), LocationController.getFloorOccupants);

  // Admin only — property-wide headcount
  router.get('/headcount', requireRole('admin'), LocationController.getHeadcount);

  // Admin or self — user history
  router.get('/history/:uid', requireRole('staff', 'admin'), LocationController.getUserHistory);

  return router;
}
