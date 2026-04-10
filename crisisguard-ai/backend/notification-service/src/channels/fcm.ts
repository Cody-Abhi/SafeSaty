/**
 * CrisisGuard AI - FCM Channel
 * Firebase Cloud Messaging push notification dispatcher.
 * Supports multicast (batch send to multiple tokens) for efficiency.
 */

import admin from 'firebase-admin';
import { logger } from '../utils/logger.js';
import type { NotificationPayload, NotificationTarget, DeliveryResult } from '../types/index.js';

export class FCMChannel {
  private messaging: admin.messaging.Messaging | null = null;

  constructor() {
    try {
      // Use existing Firebase app or initialize
      let app: admin.app.App;
      try {
        app = admin.app();
      } catch {
        app = admin.initializeApp();
      }
      this.messaging = app.messaging();
      logger.info('FCM channel initialized');
    } catch (error) {
      logger.warn('FCM not available — push notifications disabled', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send push notification to a target's FCM tokens.
   */
  async send(
    target: NotificationTarget,
    payload: NotificationPayload
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    if (!this.messaging) {
      return [{
        channel: 'fcm',
        status: 'skipped',
        targetUid: target.uid,
        error: 'FCM not initialized',
        timestamp: new Date().toISOString(),
      }];
    }

    const tokens = target.fcmTokens;
    if (!tokens || tokens.length === 0) {
      return [{
        channel: 'fcm',
        status: 'skipped',
        targetUid: target.uid,
        error: 'No FCM tokens registered',
        timestamp: new Date().toISOString(),
      }];
    }

    // Build FCM message
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: payload.priority === 'high' ? 'high' : 'normal',
        notification: {
          channelId: payload.channelId || 'emergency_alerts',
          sound: payload.sound || 'emergency_alarm',
          priority: payload.priority === 'high' ? 'max' : 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: payload.sound || 'emergency_alarm.caf',
            badge: 1,
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': payload.priority === 'high' ? '10' : '5',
        },
      },
    };

    try {
      const response = await this.messaging.sendEachForMulticast(message);

      response.responses.forEach((resp, idx) => {
        results.push({
          channel: 'fcm',
          status: resp.success ? 'sent' : 'failed',
          targetUid: target.uid,
          messageId: resp.messageId || undefined,
          error: resp.error?.message,
          timestamp: new Date().toISOString(),
        });

        if (!resp.success) {
          logger.warn('FCM send failed for token', {
            targetUid: target.uid,
            tokenIndex: idx,
            error: resp.error?.code,
          });
        }
      });

      logger.info('FCM multicast completed', {
        targetUid: target.uid,
        sent: response.successCount,
        failed: response.failureCount,
      });
    } catch (error) {
      logger.error('FCM multicast error', {
        targetUid: target.uid,
        error: error instanceof Error ? error.message : String(error),
      });
      results.push({
        channel: 'fcm',
        status: 'failed',
        targetUid: target.uid,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }
}
