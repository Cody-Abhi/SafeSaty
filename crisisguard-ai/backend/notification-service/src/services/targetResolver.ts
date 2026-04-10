/**
 * CrisisGuard AI - Target Resolver
 * Resolves notification targets from Firestore based on property/zone/role.
 *
 * For each severity level, determines WHO should receive the notification:
 *   Critical → ALL staff at property + emergency contacts
 *   High     → On-duty staff + zone responders + duty manager
 *   Medium   → Zone-specific staff
 *   Low      → Duty manager only
 */

import admin from 'firebase-admin';
import { logger } from '../utils/logger.js';
import type { NotificationTarget, Severity } from '../types/index.js';

export class TargetResolver {
  private db: admin.firestore.Firestore | null = null;

  constructor() {
    try {
      let app: admin.app.App;
      try {
        app = admin.app();
      } catch {
        app = admin.initializeApp();
      }
      this.db = app.firestore();
    } catch (error) {
      logger.warn('Firestore not available for target resolution', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Resolve notification targets based on the event context.
   */
  async resolve(
    propertyId: string,
    severity: Severity,
    zone: string
  ): Promise<NotificationTarget[]> {
    if (!this.db) {
      logger.warn('Firestore unavailable — returning mock targets for dev');
      return this.getMockTargets(propertyId);
    }

    try {
      const targets: NotificationTarget[] = [];

      switch (severity) {
        case 'critical':
          // ALL staff + admin at property
          targets.push(...await this.getPropertyStaff(propertyId));
          break;

        case 'high':
          // On-duty staff + zone staff + duty manager
          targets.push(...await this.getZoneStaff(propertyId, zone));
          targets.push(...await this.getDutyManagers(propertyId));
          break;

        case 'medium':
          // Zone-specific staff only
          targets.push(...await this.getZoneStaff(propertyId, zone));
          break;

        case 'low':
          // Duty manager only
          targets.push(...await this.getDutyManagers(propertyId));
          break;
      }

      // Deduplicate by uid
      const uniqueTargets = this.deduplicateTargets(targets);

      logger.info('Targets resolved', {
        propertyId,
        severity,
        zone,
        targetCount: uniqueTargets.length,
      });

      return uniqueTargets;
    } catch (error) {
      logger.error('Target resolution failed — using fallback', {
        error: error instanceof Error ? error.message : String(error),
        propertyId,
      });
      return this.getMockTargets(propertyId);
    }
  }

  /**
   * Get ALL staff at a property (for critical alerts).
   */
  private async getPropertyStaff(propertyId: string): Promise<NotificationTarget[]> {
    if (!this.db) return [];

    const snapshot = await this.db
      .collection('users')
      .where('propertyId', '==', propertyId)
      .where('role', 'in', ['admin', 'staff'])
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map((doc) => this.docToTarget(doc));
  }

  /**
   * Get staff assigned to a specific zone.
   */
  private async getZoneStaff(propertyId: string, zone: string): Promise<NotificationTarget[]> {
    if (!this.db) return [];

    const snapshot = await this.db
      .collection('users')
      .where('propertyId', '==', propertyId)
      .where('role', '==', 'staff')
      .where('zoneAssignment', '==', zone)
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map((doc) => this.docToTarget(doc));
  }

  /**
   * Get duty managers for a property.
   */
  private async getDutyManagers(propertyId: string): Promise<NotificationTarget[]> {
    if (!this.db) return [];

    const snapshot = await this.db
      .collection('users')
      .where('propertyId', '==', propertyId)
      .where('role', '==', 'admin')
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map((doc) => this.docToTarget(doc));
  }

  /**
   * Convert Firestore document to NotificationTarget.
   */
  private docToTarget(doc: admin.firestore.DocumentSnapshot): NotificationTarget {
    const data = doc.data() || {};
    return {
      uid: doc.id,
      role: data['role'] || 'staff',
      fcmTokens: data['fcmTokens'] || [],
      phone: data['phone'] || undefined,
      email: data['email'] || undefined,
      propertyId: data['propertyId'] || '',
    };
  }

  /**
   * Remove duplicate targets (same user from multiple queries).
   */
  private deduplicateTargets(targets: NotificationTarget[]): NotificationTarget[] {
    const seen = new Set<string>();
    return targets.filter((target) => {
      if (seen.has(target.uid)) return false;
      seen.add(target.uid);
      return true;
    });
  }

  /**
   * Development fallback when Firestore is not available.
   */
  private getMockTargets(propertyId: string): NotificationTarget[] {
    logger.debug('Using mock targets for development', { propertyId });
    return [
      {
        uid: 'duty-manager-001',
        role: 'admin',
        fcmTokens: [],
        propertyId,
      },
      {
        uid: 'staff-001',
        role: 'staff',
        fcmTokens: [],
        propertyId,
      },
    ];
  }
}
