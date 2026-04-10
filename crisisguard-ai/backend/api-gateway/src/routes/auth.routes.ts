/**
 * CrisisGuard AI - Auth Routes
 * Mounts auth endpoints with appropriate middleware chains.
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export function createAuthRoutes(): Router {
  const router = Router();
  const controller = new AuthController();

  // Public endpoint (but still rate-limited)
  router.post('/register', authRateLimiter, controller.register);

  // Requires valid Firebase token
  router.post('/login', authRateLimiter, verifyToken, controller.login);

  // Protected endpoints
  router.get('/profile', verifyToken, controller.getProfile);
  router.put('/profile', verifyToken, controller.updateProfile);

  // Admin-only endpoints
  router.post('/assign-role', verifyToken, requireRole('admin'), controller.assignRole);

  // Self-service account deletion (GDPR)
  router.delete('/account', verifyToken, controller.deleteAccount);

  return router;
}
