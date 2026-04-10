/**
 * CrisisGuard AI - Notification Dispatcher
 * Orchestrates multi-channel alert delivery based on severity routing rules.
 *
 * Routing Matrix:
 *   Critical → FCM + WebSocket + SMS (all staff + emergency services)
 *   High     → FCM + WebSocket + SMS (on-duty staff + duty manager)
 *   Medium   → FCM + WebSocket (assigned zone staff)
 *   Low      → WebSocket only (duty manager dashboard)
 */

import { logger } from '../utils/logger.js';
import { FCMChannel } from '../channels/fcm.js';
import { WebSocketChannel } from '../channels/websocket.js';
import { SMSChannel } from '../channels/sms.js';
import type {
  EmergencyEventPayload,
  NotificationTarget,
  NotificationPayload,
  DeliveryResult,
  DispatchSummary,
  Severity,
} from '../types/index.js';

// Severity → human-readable prefix
const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '🔴 CRITICAL',
  high: '🟠 HIGH',
  medium: '🟡 MEDIUM',
  low: '🟢 LOW',
};

// Emergency type → human-readable label
const TYPE_LABELS: Record<string, string> = {
  fire: '🔥 Fire Emergency',
  medical: '🏥 Medical Emergency',
  security: '🔒 Security Alert',
  general: '⚠️ General Emergency',
  natural_disaster: '🌊 Natural Disaster',
  hazard: '⚠️ Hazard Detected',
};

export class NotificationDispatcher {
  private fcmChannel: FCMChannel;
  private wsChannel: WebSocketChannel;
  private smsChannel: SMSChannel;

  constructor() {
    this.fcmChannel = new FCMChannel();
    this.wsChannel = new WebSocketChannel();
    this.smsChannel = new SMSChannel();
  }

  /**
   * Dispatch alert notifications to all appropriate channels based on severity.
   */
  async dispatch(
    event: EmergencyEventPayload,
    targets: NotificationTarget[]
  ): Promise<DispatchSummary> {
    const startTime = Date.now();

    const payload = this.buildNotificationPayload(event);
    const allResults: DeliveryResult[] = [];

    logger.info('Dispatching notifications', {
      eventId: event.event_id,
      severity: event.severity,
      targetCount: targets.length,
      type: event.type,
    });

    // Determine which channels to use based on severity
    const channels = this.getChannelsForSeverity(event.severity);

    // Dispatch to all targets in parallel
    const dispatchPromises = targets.map(async (target) => {
      const targetResults: DeliveryResult[] = [];

      // FCM Push
      if (channels.includes('fcm')) {
        const fcmResults = await this.withRetry(
          () => this.fcmChannel.send(target, payload),
          'FCM',
          target.uid
        );
        targetResults.push(...fcmResults);
      }

      // WebSocket (always sent for real-time dashboard)
      if (channels.includes('websocket')) {
        const wsResult = await this.wsChannel.send(
          target,
          payload,
          event as unknown as Record<string, unknown>
        );
        targetResults.push(wsResult);
      }

      // SMS (only for critical/high, or as fallback)
      if (channels.includes('sms')) {
        const smsResult = await this.withRetry(
          () => this.smsChannel.send(target, payload),
          'SMS',
          target.uid
        );
        targetResults.push(smsResult);
      }

      return targetResults;
    });

    const allTargetResults = await Promise.allSettled(dispatchPromises);

    for (const result of allTargetResults) {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        logger.error('Dispatch promise rejected', {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    // Build summary
    const summary = this.buildSummary(event.event_id, targets.length, allResults, startTime);

    logger.info('Dispatch completed', {
      eventId: event.event_id,
      duration: summary.durationMs,
      fcm: summary.channels.fcm,
      websocket: summary.channels.websocket,
      sms: summary.channels.sms,
    });

    return summary;
  }

  /**
   * Determine routing channels based on severity.
   */
  private getChannelsForSeverity(severity: Severity): string[] {
    switch (severity) {
      case 'critical':
        return ['fcm', 'websocket', 'sms'];
      case 'high':
        return ['fcm', 'websocket', 'sms'];
      case 'medium':
        return ['fcm', 'websocket'];
      case 'low':
        return ['websocket'];
      default:
        return ['websocket'];
    }
  }

  /**
   * Build notification payload from emergency event.
   */
  private buildNotificationPayload(event: EmergencyEventPayload): NotificationPayload {
    const typeLabel = TYPE_LABELS[event.type] || `⚠️ ${event.type}`;
    const severityLabel = SEVERITY_LABELS[event.severity] || event.severity;
    const locationDesc = `Floor ${event.location.floor}, ${event.location.zone}`;

    return {
      title: `${severityLabel} — ${typeLabel}`,
      body: `Location: ${locationDesc}${event.location.room_number ? `, Room ${event.location.room_number}` : ''}. Respond immediately.`,
      data: {
        eventId: event.event_id,
        propertyId: event.property_id,
        type: event.type,
        severity: event.severity,
        floor: String(event.location.floor),
        zone: event.location.zone,
        timestamp: event.detected_at,
        clickAction: 'OPEN_INCIDENT',
      },
      priority: event.severity === 'critical' || event.severity === 'high' ? 'high' : 'normal',
      sound: event.severity === 'critical' ? 'emergency_alarm' : 'alert_default',
      channelId: event.severity === 'critical' ? 'critical_alerts' : 'emergency_alerts',
    };
  }

  /**
   * Retry wrapper with exponential backoff (max 3 attempts).
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    channel: string,
    targetUid: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);

        logger.warn(`${channel} delivery attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms`, {
          targetUid,
          error: lastError.message,
          attempt,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error(`${channel} delivery failed after ${maxRetries} retries`);
  }

  /**
   * Build dispatch summary with per-channel tallies.
   */
  private buildSummary(
    eventId: string,
    totalTargets: number,
    results: DeliveryResult[],
    startTime: number
  ): DispatchSummary {
    const channels = {
      fcm: { sent: 0, failed: 0 },
      websocket: { sent: 0, failed: 0 },
      sms: { sent: 0, failed: 0 },
    };

    for (const result of results) {
      const ch = result.channel;
      if (ch in channels) {
        if (result.status === 'sent' || result.status === 'delivered') {
          channels[ch as keyof typeof channels].sent++;
        } else if (result.status === 'failed') {
          channels[ch as keyof typeof channels].failed++;
        }
      }
    }

    return {
      eventId,
      totalTargets,
      results,
      channels,
      dispatchedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Cleanup: close WebSocket connection.
   */
  shutdown(): void {
    this.wsChannel.disconnect();
  }
}
