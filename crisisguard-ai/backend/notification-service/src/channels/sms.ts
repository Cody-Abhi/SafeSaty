/**
 * CrisisGuard AI - SMS Channel
 * Twilio SMS dispatcher for critical alerts and fallback notifications.
 * Only fires for critical/high severity OR when FCM delivery fails.
 */

import { logger } from '../utils/logger.js';
import type { NotificationPayload, NotificationTarget, DeliveryResult } from '../types/index.js';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

// Twilio client type — uses `any` to avoid requiring @types/twilio at compile time.
// The actual SDK is loaded dynamically at runtime only when credentials are configured.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwilioClient = any;

export class SMSChannel {
  private client: TwilioClient = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      logger.warn('Twilio credentials not configured — SMS notifications disabled');
      return;
    }

    try {
      // Dynamic require to avoid crash if twilio is not installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio');
      this.client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      this.initialized = true;
      logger.info('SMS channel initialized via Twilio');
    } catch (error) {
      logger.warn('Twilio SDK not available', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send SMS notification via Twilio.
   */
  async send(
    target: NotificationTarget,
    payload: NotificationPayload
  ): Promise<DeliveryResult> {
    if (!this.initialized || !this.client) {
      return {
        channel: 'sms',
        status: 'skipped',
        targetUid: target.uid,
        error: 'SMS channel not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    if (!target.phone) {
      return {
        channel: 'sms',
        status: 'skipped',
        targetUid: target.uid,
        error: 'No phone number on file',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const smsBody = `🚨 ${payload.title}\n${payload.body}\n\nEvent: ${payload.data['eventId'] || 'N/A'}`;

      const message = await this.client.messages.create({
        body: smsBody.substring(0, 1600),
        from: TWILIO_FROM_NUMBER,
        to: target.phone,
      });

      logger.info('SMS sent', {
        targetUid: target.uid,
        messageSid: message.sid,
        to: target.phone.replace(/.(?=.{4})/g, '*'),
      });

      return {
        channel: 'sms',
        status: 'sent',
        targetUid: target.uid,
        messageId: message.sid,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('SMS send failed', {
        targetUid: target.uid,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        channel: 'sms',
        status: 'failed',
        targetUid: target.uid,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }
}
