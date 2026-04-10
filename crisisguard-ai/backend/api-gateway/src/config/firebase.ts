/**
 * CrisisGuard AI - Firebase Admin SDK Initialization
 * Singleton pattern ensures single Firebase app instance.
 */

import * as admin from 'firebase-admin';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

let firebaseApp: admin.app.App;

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const initOptions: admin.AppOptions = {
      projectId: config.firebaseProjectId,
      databaseURL: config.firebaseDatabaseUrl,
    };

    // In production, use service account credentials
    if (config.googleApplicationCredentials) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(config.googleApplicationCredentials);
      initOptions.credential = admin.credential.cert(serviceAccount);
    } else {
      // In development or when running on GCP (uses Application Default Credentials)
      initOptions.credential = admin.credential.applicationDefault();
    }

    firebaseApp = admin.initializeApp(initOptions);

    logger.info('Firebase Admin SDK initialized', {
      projectId: config.firebaseProjectId,
    });

    return firebaseApp;
  } catch (error) {
    logger.warn('Firebase Admin SDK initialization skipped (no credentials)', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Initialize without credentials for local development
    firebaseApp = admin.initializeApp({
      projectId: config.firebaseProjectId,
      databaseURL: config.firebaseDatabaseUrl,
    });
    return firebaseApp;
  }
}

export function getRTDB(): admin.database.Database {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.database();
}

export function getFirestore(): admin.firestore.Firestore {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

export function getAuth(): admin.auth.Auth {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

export { admin };
