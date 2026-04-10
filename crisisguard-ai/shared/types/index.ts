/**
 * CrisisGuard AI - Shared Type Definitions
 * Used across all Node.js/TypeScript services
 */

// ─── User & Auth ───────────────────────────────────────────

export type UserRole = 'guest' | 'staff' | 'admin';

export type StaffRole =
  | 'front_desk'
  | 'housekeeping'
  | 'security'
  | 'maintenance'
  | 'medical';

export type UserStatus = 'active' | 'evacuating' | 'safe' | 'sos';

export type Certification = 'cpr' | 'fire_warden' | 'first_aid';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  uid: string;
  role: UserRole;
  displayName: string;
  email: string;
  phone: string;
  propertyId: string;
  locale: string;
  fcmTokens: string[];
  lastLocation: GeoPoint | null;
  lastLocationFloor: number | null;
  status: UserStatus;
  staffRole?: StaffRole;
  certifications?: Certification[];
  zoneAssignment?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Emergency Events ──────────────────────────────────────

export type EmergencyType =
  | 'fire'
  | 'medical'
  | 'security'
  | 'natural_disaster'
  | 'hazard';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export type IncidentStatus =
  | 'detected'
  | 'confirmed'
  | 'responding'
  | 'resolved'
  | 'false_alarm';

export type AlertSource =
  | 'ai_cctv'
  | 'ai_audio'
  | 'ai_text'
  | 'guest_sos'
  | 'staff_report';

export interface EmergencyLocation {
  floor: number;
  zone: string;
  coordinates: GeoPoint;
  description?: string;
  roomNumber?: string;
}

export interface EmergencyEvent {
  eventId: string;
  propertyId: string;
  type: EmergencyType;
  severity: AlertSeverity;
  status: IncidentStatus;
  source: AlertSource;
  location: EmergencyLocation;
  detectedAt: Date;
  confirmedAt?: Date;
  resolvedAt?: Date;
  assignedStaff: string[];
  guestCount: number;
  metadata: Record<string, unknown>;
}

// ─── SOS Payload ───────────────────────────────────────────

export interface SOSPayload {
  type: 'fire' | 'medical' | 'security' | 'general';
  source: 'guest_sos';
  guestUid: string;
  location: {
    coordinates: GeoPoint;
    floor: number;
    zone: string;
    roomNumber?: string;
  };
  timestamp: string;
  deviceBattery: number;
  locale: string;
  silent: boolean;
  attachments?: string[];
}

// ─── API Response ──────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// ─── WebSocket Events ──────────────────────────────────────

export type WebSocketEvent =
  | 'alert:new'
  | 'alert:update'
  | 'location:update'
  | 'task:assign'
  | 'task:status'
  | 'chat:message'
  | 'evacuation:route'
  | 'heartbeat';

export interface WebSocketMessage<T = unknown> {
  event: WebSocketEvent;
  payload: T;
  timestamp: string;
  senderId?: string;
}
