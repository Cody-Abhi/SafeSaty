/**
 * CrisisGuard AI - Chat Service
 * Persistent chat messages for incident coordination.
 * Stores in Firestore with real-time sync via WebSocket.
 */

import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

export interface ChatMessage {
  messageId: string;
  eventId: string;
  channel: string; // 'incident:{id}' | 'zone:{id}' | 'broadcast'
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'location' | 'system';
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readBy: string[];
}

export interface CreateMessageData {
  eventId: string;
  channel: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  type?: 'text' | 'image' | 'audio' | 'location' | 'system';
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
}

const COLLECTION = 'chatMessages';

export class ChatService {
  /**
   * Create a new chat message.
   */
  async createMessage(data: CreateMessageData): Promise<ChatMessage> {
    const db = getFirestore();
    const messageId = uuidv4();

    const message: ChatMessage = {
      messageId,
      eventId: data.eventId,
      channel: data.channel,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      content: data.content,
      type: data.type || 'text',
      mediaUrl: data.mediaUrl,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      readBy: [data.senderId],
    };

    if (db) {
      await db.collection(COLLECTION).doc(messageId).set({
        ...message,
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    logger.debug('Chat message created', {
      messageId,
      channel: data.channel,
      senderId: data.senderId,
    });

    return message;
  }

  /**
   * Get messages for a specific channel (paginated).
   */
  async getChannelMessages(
    channel: string,
    limit = 50,
    before?: string
  ): Promise<ChatMessage[]> {
    const db = getFirestore();
    if (!db) return [];

    let query = db
      .collection(COLLECTION)
      .where('channel', '==', channel)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (before) {
      query = query.where('createdAt', '<', before);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as ChatMessage).reverse();
  }

  /**
   * Get messages for an incident across all channels.
   */
  async getIncidentMessages(
    eventId: string,
    limit = 100
  ): Promise<ChatMessage[]> {
    const db = getFirestore();
    if (!db) return [];

    const snapshot = await db
      .collection(COLLECTION)
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as ChatMessage).reverse();
  }

  /**
   * Mark messages as read by a user.
   */
  async markAsRead(messageIds: string[], uid: string): Promise<void> {
    const db = getFirestore();
    if (!db) return;

    const batch = db.batch();

    for (const msgId of messageIds) {
      const ref = db.collection(COLLECTION).doc(msgId);
      batch.update(ref, {
        readBy: admin.firestore.FieldValue.arrayUnion(uid),
      });
    }

    await batch.commit();
  }

  /**
   * Create a system message (auto-generated for events).
   */
  async createSystemMessage(
    eventId: string,
    channel: string,
    content: string
  ): Promise<ChatMessage> {
    return this.createMessage({
      eventId,
      channel,
      senderId: 'system',
      senderName: 'CrisisGuard System',
      senderRole: 'system',
      content,
      type: 'system',
    });
  }
}
