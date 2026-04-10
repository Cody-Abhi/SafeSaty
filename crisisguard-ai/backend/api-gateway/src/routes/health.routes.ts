/**
 * CrisisGuard AI - Health Routes
 */

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';

export function createHealthRoutes(): Router {
  const router = Router();
  const controller = new HealthController();

  router.get('/health', controller.check);
  router.get('/health/ready', controller.readiness);
  router.get('/health/live', controller.liveness);

  return router;
}
