/**
 * CrisisGuard AI — Firebase Client SDK
 * Project: safestay-12b52
 *
 * Initialises every Firebase service used by the Admin Dashboard:
 *   • Authentication  — Email/Password + Google OAuth
 *   • Firestore       — structured incident / user data
 *   • Realtime DB     — live presence, staff location, alert stream
 *   • FCM             — push notification token registration
 *   • Analytics       — usage telemetry
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  getDatabase,
  type Database,
} from 'firebase/database';
import {
  getMessaging,
  getToken,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import {
  getAnalytics,
  isSupported,
  type Analytics,
} from 'firebase/analytics';

// ─── Config ────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ─── Singleton app ─────────────────────────────────────────────────────────
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ─── Auth ──────────────────────────────────────────────────────────────────
const auth: Auth = getAuth(app);
const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// ─── Firestore ─────────────────────────────────────────────────────────────
const db: Firestore = getFirestore(app);

// ─── Realtime Database ─────────────────────────────────────────────────────
const rtdb: Database = getDatabase(app);

// ─── FCM Messaging (browser-only) ─────────────────────────────────────────
let messaging: Messaging | null = null;

/**
 * Lazily initialise FCM messaging.
 * Only available in browser + when SW is supported.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messaging) return messaging;
  try {
    messaging = getMessaging(app);
  } catch {
    // Browser doesn't support notifications or SW
    messaging = null;
  }
  return messaging;
}

/**
 * Request notification permission and return the FCM registration token.
 * Returns null if permission is denied or not supported.
 */
export async function requestFCMToken(): Promise<string | null> {
  const m = await getMessagingInstance();
  if (!m) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(m, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // placeholder; swap for VAPID key when set
    });
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to foreground FCM messages.
 * Returns an unsubscribe function.
 */
export async function onForegroundMessage(
  callback: (payload: unknown) => void,
): Promise<() => void> {
  const m = await getMessagingInstance();
  if (!m) return () => {};
  return onMessage(m, callback);
}

// ─── Analytics (browser-only, lazy) ────────────────────────────────────────
let analytics: Analytics | null = null;

export async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (analytics) return analytics;
  const supported = await isSupported();
  if (supported) {
    analytics = getAnalytics(app);
  }
  return analytics;
}

// Kick off analytics initialisation on module load (fire-and-forget)
if (typeof window !== 'undefined') {
  getAnalyticsInstance().catch(() => {});
}

// ─── Exports ────────────────────────────────────────────────────────────────
export { app, auth, googleProvider, db, rtdb };
