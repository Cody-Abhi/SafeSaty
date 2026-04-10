/**
 * CrisisGuard AI — Firestore Hooks
 * Real-time subscriptions to incidents and staff from Firebase.
 */

'use client';

import { useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useIncidentStore, type Incident } from '@/stores/incidentStore';
import { useStaffStore, type StaffMember } from '@/stores/staffStore';

// ─── Incident subscription ─────────────────────────────────────────────────

/**
 * Subscribes to all non-resolved incidents for a property in real time.
 * Populates the Zustand incidentStore automatically.
 */
export function useFirestoreIncidents(propertyId: string) {
  const setIncidents = useIncidentStore((s) => s.setIncidents);
  const setLoading   = useIncidentStore((s) => s.setLoading);

  useEffect(() => {
    if (!propertyId) return;

    setLoading(true);

    const q = query(
      collection(db, 'incidents'),
      where('propertyId', '==', propertyId),
      where('status', 'not-in', ['resolved', 'false_alarm']),
      orderBy('detectedAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const incidents: Incident[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            eventId:       d.id,
            propertyId:    data.propertyId,
            type:          data.type,
            severity:      data.severity,
            status:        data.status,
            source:        data.source,
            location:      data.location,
            detectedAt:    toISO(data.detectedAt),
            confirmedAt:   toISO(data.confirmedAt),
            resolvedAt:    toISO(data.resolvedAt),
            assignedStaff: data.assignedStaff ?? [],
            guestCount:    data.guestCount ?? 0,
            metadata:      data.metadata ?? {},
            timeline:      data.timeline ?? [],
          } as Incident;
        });

        setIncidents(incidents);
        setLoading(false);
      },
      (error) => {
        console.error('[Firestore] incidents subscription error:', error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [propertyId, setIncidents, setLoading]);
}

// ─── Staff subscription ────────────────────────────────────────────────────

/**
 * Subscribes to all staff members for a property in real time.
 * Populates the Zustand staffStore automatically.
 */
export function useFirestoreStaff(propertyId: string) {
  const setStaff = useStaffStore((s) => s.setStaff);

  useEffect(() => {
    if (!propertyId) return;

    const q = query(
      collection(db, 'users'),
      where('propertyId', '==', propertyId),
      where('role', 'in', ['staff', 'manager']),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const staff: StaffMember[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid:            d.id,
            displayName:    data.displayName ?? 'Unknown',
            role:           data.staffRole ?? data.role ?? 'staff',
            status:         data.status ?? 'available',
            zone:           data.zone ?? '',
            floor:          data.floor ?? 0,
            certifications: data.certifications ?? [],
            lastSeen:       toISO(data.lastSeen),
          } as StaffMember;
        });

        setStaff(staff);
      },
      (error) => {
        console.error('[Firestore] staff subscription error:', error);
      },
    );

    return unsubscribe;
  }, [propertyId, setStaff]);
}

// ─── Incident status update ────────────────────────────────────────────────

export async function updateIncidentStatus(
  incidentId: string,
  status: Incident['status'],
): Promise<void> {
  const ref = doc(db, 'incidents', incidentId);
  await updateDoc(ref, {
    status,
    ...(status === 'resolved' ? { resolvedAt: serverTimestamp() } : {}),
    ...(status === 'confirmed' ? { confirmedAt: serverTimestamp() } : {}),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISO(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}
