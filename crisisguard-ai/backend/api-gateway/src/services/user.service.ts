/**
 * CrisisGuard AI - User Service
 * Handles user profile CRUD operations in Firestore.
 * Implements the user schema from the PRD.
 */

import { getFirestore, getAuth, admin } from '../config/firebase.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import { FIRESTORE_COLLECTIONS } from './constants.js';

export interface CreateUserData {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: 'guest' | 'staff' | 'admin';
  propertyId?: string;
  locale?: string;
  staffRole?: string;
  certifications?: string[];
  zoneAssignment?: string;
}

export interface UpdateUserData {
  displayName?: string;
  phone?: string;
  locale?: string;
  fcmTokens?: string[];
  lastLocation?: { latitude: number; longitude: number };
  lastLocationFloor?: number;
  status?: 'active' | 'evacuating' | 'safe' | 'sos';
  staffRole?: string;
  certifications?: string[];
  zoneAssignment?: string;
}

export interface UserDocument {
  uid: string;
  role: string;
  displayName: string;
  email: string;
  phone: string;
  propertyId: string;
  locale: string;
  fcmTokens: string[];
  lastLocation: admin.firestore.GeoPoint | null;
  lastLocationFloor: number | null;
  status: string;
  staffRole?: string;
  certifications?: string[];
  zoneAssignment?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export class UserService {
  private get db() {
    return getFirestore();
  }

  private get auth() {
    return getAuth();
  }

  /**
   * Creates a new user profile in Firestore and sets custom claims.
   */
  async createUser(data: CreateUserData): Promise<UserDocument> {
    const userRef = this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc(data.uid);
    
    // Check if user already exists
    const existing = await userRef.get();
    if (existing.exists) {
      throw new ConflictError(`User profile already exists for uid: ${data.uid}`);
    }

    const now = admin.firestore.Timestamp.now();
    const userData: UserDocument = {
      uid: data.uid,
      role: data.role,
      displayName: data.displayName,
      email: data.email,
      phone: data.phone || '',
      propertyId: data.propertyId || '',
      locale: data.locale || 'en',
      fcmTokens: [],
      lastLocation: null,
      lastLocationFloor: null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    // Add staff-specific fields
    if (data.role === 'staff') {
      userData.staffRole = data.staffRole || 'front_desk';
      userData.certifications = data.certifications || [];
      userData.zoneAssignment = data.zoneAssignment || '';
    }

    await userRef.set(userData);

    // Set Firebase Custom Claims for role-based JWT
    await this.auth.setCustomUserClaims(data.uid, {
      role: data.role,
      propertyId: data.propertyId || '',
    });

    logger.info('User profile created', { uid: data.uid, role: data.role });

    return userData;
  }

  /**
   * Retrieves a user profile from Firestore.
   */
  async getUserById(uid: string): Promise<UserDocument> {
    const doc = await this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get();
    
    if (!doc.exists) {
      throw new NotFoundError(`User not found: ${uid}`);
    }

    return doc.data() as UserDocument;
  }

  /**
   * Updates user profile fields. Only provided fields are updated (merge).
   */
  async updateUser(uid: string, data: UpdateUserData): Promise<UserDocument> {
    const userRef = this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid);
    const existing = await userRef.get();

    if (!existing.exists) {
      throw new NotFoundError(`User not found: ${uid}`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.locale !== undefined) updateData.locale = data.locale;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.staffRole !== undefined) updateData.staffRole = data.staffRole;
    if (data.certifications !== undefined) updateData.certifications = data.certifications;
    if (data.zoneAssignment !== undefined) updateData.zoneAssignment = data.zoneAssignment;
    if (data.fcmTokens !== undefined) updateData.fcmTokens = data.fcmTokens;
    if (data.lastLocationFloor !== undefined) updateData.lastLocationFloor = data.lastLocationFloor;

    // Handle GeoPoint conversion for location
    if (data.lastLocation) {
      updateData.lastLocation = new admin.firestore.GeoPoint(
        data.lastLocation.latitude,
        data.lastLocation.longitude
      );
    }

    await userRef.update(updateData);

    const updated = await userRef.get();
    return updated.data() as UserDocument;
  }

  /**
   * Assigns a role to a user. Admin-only operation.
   */
  async assignRole(uid: string, role: 'guest' | 'staff' | 'admin'): Promise<void> {
    const validRoles = ['guest', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      throw new BadRequestError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    const userRef = this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid);
    const existing = await userRef.get();

    if (!existing.exists) {
      throw new NotFoundError(`User not found: ${uid}`);
    }

    // Update Firestore
    await userRef.update({
      role,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Update Firebase Custom Claims
    await this.auth.setCustomUserClaims(uid, {
      role,
      propertyId: existing.data()?.propertyId || '',
    });

    logger.info('User role updated', { uid, role });
  }

  /**
   * Adds an FCM token for push notifications.
   */
  async addFcmToken(uid: string, token: string): Promise<void> {
    const userRef = this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid);
    
    await userRef.update({
      fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  /**
   * Removes an FCM token.
   */
  async removeFcmToken(uid: string, token: string): Promise<void> {
    const userRef = this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid);
    
    await userRef.update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  /**
   * Deletes user account (GDPR compliance).
   */
  async deleteUser(uid: string): Promise<void> {
    const userRef = this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid);
    const existing = await userRef.get();

    if (!existing.exists) {
      throw new NotFoundError(`User not found: ${uid}`);
    }

    // Delete Firestore document
    await userRef.delete();

    // Delete Firebase Auth account
    try {
      await this.auth.deleteUser(uid);
    } catch (error) {
      logger.warn('Failed to delete Firebase Auth user (may not exist)', {
        uid,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info('User account deleted (GDPR)', { uid });
  }
}
