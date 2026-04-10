/**
 * CrisisGuard AI - Incident Lifecycle State Machine
 * Manages incident state transitions: detected → confirmed → responding → resolved | false_alarm
 * Implements auto-escalation timers and task assignment rules.
 */

export type IncidentStatus = 'detected' | 'confirmed' | 'responding' | 'resolved' | 'false_alarm';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

interface StateTransition {
  from: IncidentStatus;
  to: IncidentStatus;
  allowed: boolean;
  requiresRole?: string[];
}

/** Valid state transitions — prevents invalid jumps */
const TRANSITION_MAP: StateTransition[] = [
  { from: 'detected', to: 'confirmed', allowed: true },
  { from: 'detected', to: 'false_alarm', allowed: true, requiresRole: ['admin', 'staff'] },
  { from: 'confirmed', to: 'responding', allowed: true },
  { from: 'confirmed', to: 'false_alarm', allowed: true, requiresRole: ['admin'] },
  { from: 'responding', to: 'resolved', allowed: true, requiresRole: ['admin', 'staff'] },
  { from: 'responding', to: 'false_alarm', allowed: true, requiresRole: ['admin'] },
  // No backward transitions allowed
];

/** Auto-escalation thresholds (milliseconds) */
const ESCALATION_THRESHOLDS: Record<IncidentSeverity, {
  unacknowledgedMs: number;
  voiceCallMs: number;
  autoConfirmMs: number;
}> = {
  critical: { unacknowledgedMs: 15_000, voiceCallMs: 60_000, autoConfirmMs: 30_000 },
  high: { unacknowledgedMs: 30_000, voiceCallMs: 120_000, autoConfirmMs: 60_000 },
  medium: { unacknowledgedMs: 60_000, voiceCallMs: 300_000, autoConfirmMs: 120_000 },
  low: { unacknowledgedMs: 120_000, voiceCallMs: 600_000, autoConfirmMs: 180_000 },
};

export interface IncidentEvent {
  eventId: string;
  propertyId: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: string;
  location: {
    coordinates: { lat: number; lng: number };
    floor: number;
    zone: string;
    description?: string;
  };
  detectedAt: Date;
  confirmedAt?: Date;
  resolvedAt?: Date;
  assignedStaff: string[];
  acknowledgedBy: string[];
  guestCount: number;
  metadata: Record<string, unknown>;
  timeline: TimelineEntry[];
}

interface TimelineEntry {
  timestamp: Date;
  action: string;
  actor: string; // uid or 'system'
  detail: string;
}

export class IncidentLifecycleManager {
  private incidents: Map<string, IncidentEvent> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout[]> = new Map();

  /** Register a new incident from the alert pipeline */
  createIncident(data: Omit<IncidentEvent, 'status' | 'timeline' | 'acknowledgedBy'>): IncidentEvent {
    const incident: IncidentEvent = {
      ...data,
      status: 'detected',
      acknowledgedBy: [],
      timeline: [
        {
          timestamp: new Date(),
          action: 'incident_created',
          actor: 'system',
          detail: `${data.type} incident detected via ${data.source}. Severity: ${data.severity}.`,
        },
      ],
    };

    this.incidents.set(incident.eventId, incident);
    this.startEscalationTimers(incident);

    console.log(`[Lifecycle] Incident ${incident.eventId} created — ${incident.type} / ${incident.severity}`);
    return incident;
  }

  /** Transition incident to a new status */
  transition(
    eventId: string,
    newStatus: IncidentStatus,
    actorUid: string,
    actorRole: string,
    notes?: string,
  ): { success: boolean; error?: string; incident?: IncidentEvent } {
    const incident = this.incidents.get(eventId);
    if (!incident) {
      return { success: false, error: `Incident ${eventId} not found` };
    }

    // Validate the transition
    const transition = TRANSITION_MAP.find(
      (t) => t.from === incident.status && t.to === newStatus,
    );

    if (!transition || !transition.allowed) {
      return {
        success: false,
        error: `Invalid transition: ${incident.status} → ${newStatus}`,
      };
    }

    if (transition.requiresRole && !transition.requiresRole.includes(actorRole)) {
      return {
        success: false,
        error: `Role '${actorRole}' not authorized for this transition`,
      };
    }

    // Apply transition
    const prevStatus = incident.status;
    incident.status = newStatus;

    if (newStatus === 'confirmed') incident.confirmedAt = new Date();
    if (newStatus === 'resolved' || newStatus === 'false_alarm') {
      incident.resolvedAt = new Date();
      this.clearEscalationTimers(eventId);
    }

    incident.timeline.push({
      timestamp: new Date(),
      action: `status_change`,
      actor: actorUid,
      detail: `${prevStatus} → ${newStatus}${notes ? `. Notes: ${notes}` : ''}`,
    });

    console.log(`[Lifecycle] ${eventId}: ${prevStatus} → ${newStatus} by ${actorUid}`);
    return { success: true, incident };
  }

  /** Staff acknowledges an incident alert */
  acknowledge(eventId: string, staffUid: string): { success: boolean; error?: string } {
    const incident = this.incidents.get(eventId);
    if (!incident) return { success: false, error: 'Incident not found' };

    if (incident.acknowledgedBy.includes(staffUid)) {
      return { success: false, error: 'Already acknowledged' };
    }

    incident.acknowledgedBy.push(staffUid);
    incident.timeline.push({
      timestamp: new Date(),
      action: 'acknowledged',
      actor: staffUid,
      detail: `Staff member acknowledged the alert.`,
    });

    console.log(`[Lifecycle] ${eventId} acknowledged by ${staffUid} (${incident.acknowledgedBy.length} total)`);
    return { success: true };
  }

  /** Assign staff to an incident */
  assignStaff(eventId: string, staffUid: string, task?: string): { success: boolean; error?: string } {
    const incident = this.incidents.get(eventId);
    if (!incident) return { success: false, error: 'Incident not found' };

    if (!incident.assignedStaff.includes(staffUid)) {
      incident.assignedStaff.push(staffUid);
    }

    incident.timeline.push({
      timestamp: new Date(),
      action: 'staff_assigned',
      actor: 'system',
      detail: `${staffUid} assigned${task ? ` — task: ${task}` : ''}.`,
    });

    return { success: true };
  }

  /** Get incident with full timeline */
  getIncident(eventId: string): IncidentEvent | undefined {
    return this.incidents.get(eventId);
  }

  /** Get all active incidents */
  getActiveIncidents(): IncidentEvent[] {
    return Array.from(this.incidents.values()).filter(
      (i) => !['resolved', 'false_alarm'].includes(i.status),
    );
  }

  /** Get incident metrics */
  getMetrics(): {
    total: number;
    active: number;
    bySeverity: Record<string, number>;
    avgResponseTimeMs: number;
  } {
    const all = Array.from(this.incidents.values());
    const active = all.filter((i) => !['resolved', 'false_alarm'].includes(i.status));

    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const i of active) bySeverity[i.severity]++;

    // Calculate average response time for resolved incidents
    const resolved = all.filter((i) => i.confirmedAt && i.detectedAt);
    const avgResponseTimeMs = resolved.length > 0
      ? resolved.reduce((sum, i) => sum + (i.confirmedAt!.getTime() - i.detectedAt.getTime()), 0) / resolved.length
      : 0;

    return {
      total: all.length,
      active: active.length,
      bySeverity,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
    };
  }

  // ─── Auto-Escalation ──────────────────────────────────────

  private startEscalationTimers(incident: IncidentEvent): void {
    const thresholds = ESCALATION_THRESHOLDS[incident.severity];
    const timers: NodeJS.Timeout[] = [];

    // Timer 1: Auto-confirm if not acknowledged
    timers.push(
      setTimeout(() => {
        const current = this.incidents.get(incident.eventId);
        if (current && current.status === 'detected' && current.acknowledgedBy.length === 0) {
          this.transition(incident.eventId, 'confirmed', 'system', 'admin', 'Auto-confirmed: no acknowledgment received');
          console.log(`[Escalation] ${incident.eventId} auto-confirmed after ${thresholds.autoConfirmMs / 1000}s`);
        }
      }, thresholds.autoConfirmMs),
    );

    // Timer 2: Escalation warning
    timers.push(
      setTimeout(() => {
        const current = this.incidents.get(incident.eventId);
        if (current && current.acknowledgedBy.length === 0 && !['resolved', 'false_alarm'].includes(current.status)) {
          current.timeline.push({
            timestamp: new Date(),
            action: 'escalation_warning',
            actor: 'system',
            detail: `Alert unacknowledged for ${thresholds.unacknowledgedMs / 1000}s — escalating notification priority.`,
          });
          console.log(`[Escalation] ${incident.eventId} notification priority escalated`);
        }
      }, thresholds.unacknowledgedMs),
    );

    // Timer 3: Voice call fallback
    timers.push(
      setTimeout(() => {
        const current = this.incidents.get(incident.eventId);
        if (current && current.acknowledgedBy.length === 0 && !['resolved', 'false_alarm'].includes(current.status)) {
          current.timeline.push({
            timestamp: new Date(),
            action: 'voice_call_triggered',
            actor: 'system',
            detail: `Triggering automated voice call to unresponsive guests.`,
          });
          console.log(`[Escalation] ${incident.eventId} voice call fallback triggered`);
          // In production: call telephony service
        }
      }, thresholds.voiceCallMs),
    );

    this.escalationTimers.set(incident.eventId, timers);
  }

  private clearEscalationTimers(eventId: string): void {
    const timers = this.escalationTimers.get(eventId);
    if (timers) {
      timers.forEach(clearTimeout);
      this.escalationTimers.delete(eventId);
    }
  }
}

/** Singleton instance */
export const lifecycleManager = new IncidentLifecycleManager();
