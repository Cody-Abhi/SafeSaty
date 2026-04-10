/**
 * CrisisGuard AI - Chat Controller
 * REST endpoints for chat message management.
 */

import { Request, Response, NextFunction } from 'express';
import { ChatService, CreateMessageData } from '../services/chat.service.js';
import { BadRequestError } from '../utils/errors.js';

const chatService = new ChatService();

export class ChatController {
  /**
   * POST /api/chat/messages
   * Send a new chat message.
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.uid;
      if (!uid) throw new BadRequestError('User not authenticated');

      const { eventId, channel, content, type, mediaUrl, metadata } = req.body;

      if (!eventId || !channel || !content) {
        throw new BadRequestError('Missing required fields: eventId, channel, content');
      }

      const messageData: CreateMessageData = {
        eventId,
        channel,
        senderId: uid,
        senderName: req.user?.name || 'Unknown',
        senderRole: req.user?.role || 'guest',
        content,
        type: type || 'text',
        mediaUrl,
        metadata,
      };

      const message = await chatService.createMessage(messageData);

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/channel/:channel
   * Get messages for a channel.
   */
  static async getChannelMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const channel = req.params['channel'] as string;
      const limit = req.query['limit'] ? Number(req.query['limit']) : 50;
      const before = req.query['before'] as string | undefined;

      if (!channel) throw new BadRequestError('Channel is required');

      const messages = await chatService.getChannelMessages(channel, limit, before);
      res.json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/incident/:eventId
   * Get all messages for an incident.
   */
  static async getIncidentMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params['eventId'] as string;
      const limit = req.query['limit'] ? Number(req.query['limit']) : 100;

      if (!eventId) throw new BadRequestError('Event ID is required');

      const messages = await chatService.getIncidentMessages(eventId, limit);
      res.json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/read
   * Mark messages as read.
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.uid;
      if (!uid) throw new BadRequestError('User not authenticated');

      const { messageIds } = req.body;
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new BadRequestError('messageIds array is required');
      }

      await chatService.markAsRead(messageIds, uid);
      res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
      next(error);
    }
  }
}
