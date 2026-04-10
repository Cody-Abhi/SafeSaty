/**
 * CrisisGuard AI - Notification Types
 * Type definitions for the notification dispatch pipeline.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type NotificationChannel = 'fcm' | 'websocket' | 'sms' | 'email';

export type DeliveryStatus = 'sent' | 'delivered' | 'failed' | 'skipped';

export interface EmergencyEventPayload {
  event_id: string;
  property_id: string;
  type: string;
  severity: Severity;
  status: string;
  source: string;
  location: {
    coordinates: { lat: number; lng: number };
    floor: number;
    zone: string;
    room_number?: string;
    description?: string;
  };
  detected_at: string;
  guest_uid?: string;
  silent: boolean;
  metadata: Record<string, unknown>;
}

export interface NotificationTarget {
  uid: string;
  role: string;
  fcmTokens?: string[];
  phone?: string;
  email?: string;
  propertyId: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data: Record<string, string>;
  priority: 'high' | 'normal';
  sound?: string;
  channelId?: string; // Android notification channel
}

export interface DeliveryResult {
  channel: NotificationChannel;
  status: DeliveryStatus;
  targetUid: string;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface DispatchSummary {
  eventId: string;
  totalTargets: number;
  results: DeliveryResult[];
  channels: {
    fcm: { sent: number; failed: number };
    websocket: { sent: number; failed: number };
    sms: { sent: number; failed: number };
  };
  dispatchedAt: string;
  completedAt: string;
  durationMs: number;
}
