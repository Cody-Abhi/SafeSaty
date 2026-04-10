/**
 * CrisisGuard AI - Location Service
 * Real-time location tracking with zone-based proximity queries.
 * Stores positions in Firestore with floor/zone indexing.
 */

import admin from 'firebase-admin';
import { getFirestore } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

export interface LocationUpdate {
  uid: string;
  propertyId: string;
  latitude: number;
  longitude: number;
  floor: number;
  zone: string;
  accuracy?: number;
  heading?: number;
  speed?: number;
  batteryLevel?: number;
  timestamp: string;
}

export interface LocationRecord extends LocationUpdate {
  updatedAt: admin.firestore.FieldValue;
}

export interface ZoneOccupancy {
  zone: string;
  floor: number;
  count: number;
  users: Array<{
    uid: string;
    role: string;
    latitude: number;
    longitude: number;
    lastUpdate: string;
  }>;
}

const COLLECTION = 'userLocations';
const HISTORY_COLLECTION = 'locationHistory';

export class LocationService {
  /**
   * Update a user's current location.
   * Stores in userLocations (current) and appends to locationHistory (audit trail).
   */
  async updateLocation(data: LocationUpdate): Promise<void> {
    const db = getFirestore();
    if (!db) {
      logger.warn('Firestore unavailable — location update skipped');
      return;
    }

    const record: LocationRecord = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = db.batch();

    // Upsert current location
    const currentRef = db.collection(COLLECTION).doc(data.uid);
    batch.set(currentRef, record, { merge: true });

    // Append to history (for evacuation path reconstruction)
    const historyRef = db.collection(HISTORY_COLLECTION).doc();
    batch.set(historyRef, {
      ...data,
      recordedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    logger.debug('Location updated', {
      uid: data.uid,
      floor: data.floor,
      zone: data.zone,
    });
  }

  /**
   * Get a user's current location.
   */
  async getUserLocation(uid: string): Promise<LocationUpdate | null> {
    const db = getFirestore();
    if (!db) return null;

    const doc = await db.collection(COLLECTION).doc(uid).get();
    if (!doc.exists) return null;

    return doc.data() as LocationUpdate;
  }

  /**
   * Get all users in a specific zone of a property.
   * Used during evacuations to locate people in affected areas.
   */
  async getZoneOccupants(
    propertyId: string,
    zone: string,
    floor?: number
  ): Promise<ZoneOccupancy> {
    const db = getFirestore();
    if (!db) {
      return { zone, floor: floor || 0, count: 0, users: [] };
    }

    let query = db
      .collection(COLLECTION)
      .where('propertyId', '==', propertyId)
      .where('zone', '==', zone);

    if (floor !== undefined) {
      query = query.where('floor', '==', floor);
    }

    const snapshot = await query.get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        role: data['role'] || 'guest',
        latitude: data['latitude'] as number,
        longitude: data['longitude'] as number,
        lastUpdate: data['timestamp'] as string,
      };
    });

    return {
      zone,
      floor: floor || 0,
      count: users.length,
      users,
    };
  }

  /**
   * Get all users on a specific floor.
   * Used for floor-level evacuation coordination.
   */
  async getFloorOccupants(
    propertyId: string,
    floor: number
  ): Promise<Array<{ uid: string; zone: string; latitude: number; longitude: number }>> {
    const db = getFirestore();
    if (!db) return [];

    const snapshot = await db
      .collection(COLLECTION)
      .where('propertyId', '==', propertyId)
      .where('floor', '==', floor)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        zone: data['zone'] as string,
        latitude: data['latitude'] as number,
        longitude: data['longitude'] as number,
      };
    });
  }

  /**
   * Get total headcount for a property broken down by floor.
   */
  async getPropertyHeadcount(
    propertyId: string
  ): Promise<{ total: number; byFloor: Record<number, number> }> {
    const db = getFirestore();
    if (!db) return { total: 0, byFloor: {} };

    const snapshot = await db
      .collection(COLLECTION)
      .where('propertyId', '==', propertyId)
      .get();

    const byFloor: Record<number, number> = {};
    for (const doc of snapshot.docs) {
      const floor = doc.data()['floor'] as number;
      byFloor[floor] = (byFloor[floor] || 0) + 1;
    }

    return { total: snapshot.size, byFloor };
  }

  /**
   * Get user's recent location history (for path reconstruction).
   */
  async getUserHistory(
    uid: string,
    minutesBack = 30
  ): Promise<LocationUpdate[]> {
    const db = getFirestore();
    if (!db) return [];

    const cutoff = new Date(Date.now() - minutesBack * 60 * 1000);

    const snapshot = await db
      .collection(HISTORY_COLLECTION)
      .where('uid', '==', uid)
      .where('recordedAt', '>=', cutoff)
      .orderBy('recordedAt', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => doc.data() as LocationUpdate);
  }
}
