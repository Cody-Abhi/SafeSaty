/**
 * CrisisGuard AI - Incident Store (Zustand)
 * Global state for real-time incident management.
 */

import { create } from 'zustand';

export interface IncidentLocation {
  coordinates: { lat: number; lng: number };
  floor: number;
  zone: string;
  description?: string;
}

export interface TimelineEntry {
  timestamp: string;
  action: string;
  actor: string;
  detail: string;
}

export interface Incident {
  eventId: string;
  propertyId: string;
  type: 'fire' | 'medical' | 'security' | 'natural_disaster' | 'hazard';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'confirmed' | 'responding' | 'resolved' | 'false_alarm';
  source: string;
  location: IncidentLocation;
  detectedAt: string;
  confirmedAt?: string;
  resolvedAt?: string;
  assignedStaff: string[];
  guestCount: number;
  metadata: Record<string, unknown>;
  timeline?: TimelineEntry[];
}

interface IncidentState {
  incidents: Incident[];
  activeIncident: Incident | null;
  isLoading: boolean;

  // Actions
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (eventId: string, updates: Partial<Incident>) => void;
  removeIncident: (eventId: string) => void;
  setActiveIncident: (incident: Incident | null) => void;
  setLoading: (loading: boolean) => void;

  // Computed
  activeIncidents: () => Incident[];
  criticalCount: () => number;
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  activeIncident: null,
  isLoading: false,

  setIncidents: (incidents) => set({ incidents }),

  addIncident: (incident) =>
    set((state) => {
      // Prevent duplicates
      if (state.incidents.some((i) => i.eventId === incident.eventId)) {
        return state;
      }
      return { incidents: [incident, ...state.incidents] };
    }),

  updateIncident: (eventId, updates) =>
    set((state) => ({
      incidents: state.incidents.map((i) =>
        i.eventId === eventId ? { ...i, ...updates } : i,
      ),
      activeIncident:
        state.activeIncident?.eventId === eventId
          ? { ...state.activeIncident, ...updates }
          : state.activeIncident,
    })),

  removeIncident: (eventId) =>
    set((state) => ({
      incidents: state.incidents.filter((i) => i.eventId !== eventId),
      activeIncident:
        state.activeIncident?.eventId === eventId
          ? null
          : state.activeIncident,
    })),

  setActiveIncident: (incident) => set({ activeIncident: incident }),
  setLoading: (loading) => set({ isLoading: loading }),

  activeIncidents: () =>
    get().incidents.filter(
      (i) => !['resolved', 'false_alarm'].includes(i.status),
    ),

  criticalCount: () =>
    get().incidents.filter(
      (i) =>
        i.severity === 'critical' &&
        !['resolved', 'false_alarm'].includes(i.status),
    ).length,
}));
