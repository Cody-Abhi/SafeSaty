/**
 * CrisisGuard AI - Chat Routes
 */

import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { verifyToken } from '../middleware/auth.js';

export function createChatRoutes(): Router {
  const router = Router();

  // All chat routes require authentication
  router.use(verifyToken);

  router.post('/messages', ChatController.sendMessage);
  router.get('/channel/:channel', ChatController.getChannelMessages);
  router.get('/incident/:eventId', ChatController.getIncidentMessages);
  router.post('/read', ChatController.markAsRead);

  return router;
}
