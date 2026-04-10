/**
 * CrisisGuard AI — Realtime Database Hooks
 * Subscribes to live presence, staff location, and alert stream
 * via Firebase Realtime Database.
 */

'use client';

import { useEffect } from 'react';
import { ref, onValue, set, serverTimestamp, off, onDisconnect, type DatabaseReference } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { useStaffStore } from '@/stores/staffStore';
import { useIncidentStore } from '@/stores/incidentStore';
import type { Incident } from '@/stores/incidentStore';

// ─── Presence ─────────────────────────────────────────────────────────────────

/**
 * Write own presence to RTDB under /presence/{uid}.
 * Auto-removes on disconnect using onDisconnect().
 */
export function usePresence(uid: string | null) {
  useEffect(() => {
    if (!uid) return;

    const presenceRef: DatabaseReference = ref(rtdb, `presence/${uid}`);

    // Write connected status — RTDB will auto-clear on disconnect
    const connectedRef = ref(rtdb, '.info/connected');
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Set to offline on disconnect
        onDisconnect(presenceRef).set({ online: false, lastSeen: Date.now() });
        // Mark as online now
        set(presenceRef, { online: true, lastSeen: serverTimestamp() });
      }
    });

    return () => {
      off(connectedRef);
    };
  }, [uid]);
}

// ─── Live Alert Stream ─────────────────────────────────────────────────────────

/**
 * Subscribes to /alerts/{propertyId}/stream for incoming real-time alerts.
 * Pushes each new alert to the Zustand incidentStore.
 */
export function useRTDBAlertStream(propertyId: string | null) {
  const addIncident = useIncidentStore((s) => s.addIncident);

  useEffect(() => {
    if (!propertyId) return;

    const alertStreamRef = ref(rtdb, `alerts/${propertyId}/stream`);

    const unsubscribe = onValue(alertStreamRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();
      // RTDB stores keyed objects; iterate children
      Object.entries(data).forEach(([key, value]) => {
        const incident = value as Partial<Incident>;
        if (incident && incident.eventId) {
          addIncident(incident as Incident);
        }
      });
    });

    return () => {
      off(alertStreamRef);
    };
  }, [propertyId, addIncident]);
}

// ─── Staff Live Location ─────────────────────────────────────────────────────

/**
 * Subscribes to /location/{propertyId}/staff for real-time staff positions.
 */
export function useRTDBStaffLocations(propertyId: string | null) {
  const updateStaffMember = useStaffStore((s) => s.updateStaffMember);

  useEffect(() => {
    if (!propertyId) return;

    const locationRef = ref(rtdb, `location/${propertyId}/staff`);

    const unsubscribe = onValue(locationRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val() as Record<
        string,
        { zone: string; floor: number; lat?: number; lng?: number; lastSeen: number }
      >;

      Object.entries(data).forEach(([uid, pos]) => {
        updateStaffMember(uid, {
          zone:     pos.zone,
          floor:    pos.floor,
          lastSeen: new Date(pos.lastSeen).toISOString(),
        });
      });
    });

    return () => {
      off(locationRef);
    };
  }, [propertyId, updateStaffMember]);
}

// ─── Property Occupancy ───────────────────────────────────────────────────────

/**
 * Returns a callback that subscribes to /occupancy/{propertyId} and calls
 * the provided setter with the current headcount.
 */
export function useRTDBOccupancy(
  propertyId: string | null,
  onUpdate: (count: number) => void,
) {
  useEffect(() => {
    if (!propertyId) return;

    const occupancyRef = ref(rtdb, `occupancy/${propertyId}/current`);

    const unsubscribe = onValue(occupancyRef, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.val() as number);
      }
    });

    return () => {
      off(occupancyRef);
    };
  }, [propertyId, onUpdate]);
}
