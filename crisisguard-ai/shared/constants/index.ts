/**
 * CrisisGuard AI - Shared Constants
 */

export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const INCIDENT_STATES = {
  DETECTED: 'detected',
  CONFIRMED: 'confirmed',
  RESPONDING: 'responding',
  RESOLVED: 'resolved',
  FALSE_ALARM: 'false_alarm',
} as const;

export const PUBSUB_TOPICS = {
  CONFIRMED_ALERTS: 'confirmed-alerts',
  LOCATION_UPDATES: 'location-updates',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
  AI_ANALYSIS_RESULTS: 'ai-analysis-results',
} as const;

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  EMERGENCY_EVENTS: 'emergencyEvents',
  PROPERTIES: 'properties',
  AUDIT_LOG: 'auditLog',
  NOTIFICATIONS: 'notifications',
  CHAT_MESSAGES: 'chatMessages',
} as const;

export const ALERT_ESCALATION_TIMEOUT_MS = 15_000;
export const LOCATION_UPDATE_INTERVAL_NORMAL_MS = 5_000;
export const LOCATION_UPDATE_INTERVAL_EMERGENCY_MS = 1_000;
export const MAX_SOS_PER_USER_PER_MINUTE = 3;
export const DEDUPLICATION_WINDOW_MS = 30_000;

export const SEVERITY_MAP: Record<string, string> = {
  fire: 'critical',
  active_shooter: 'critical',
  structural_collapse: 'critical',
  medical_emergency: 'high',
  bomb_threat: 'high',
  severe_weather: 'high',
  suspicious_package: 'medium',
  minor_injury: 'medium',
  elevator_entrapment: 'medium',
  safety_hazard: 'low',
  noise_complaint: 'low',
  equipment_malfunction: 'low',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
