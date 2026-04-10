/**
 * Local re-export of shared constants for service layer.
 */

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  EMERGENCY_EVENTS: 'emergencyEvents',
  PROPERTIES: 'properties',
  AUDIT_LOG: 'auditLog',
  NOTIFICATIONS: 'notifications',
  CHAT_MESSAGES: 'chatMessages',
} as const;
