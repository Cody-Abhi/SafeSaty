'use client';

/**
 * CrisisGuard AI — Authentication Context
 * Provides Firebase Auth state (user, role, token) to the entire app.
 * Supports Email/Password login and Google OAuth sign-in.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

// ─── Types ──────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer';

export interface CrisisGuardUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  propertyId: string | null;
  idToken: string;
}

interface AuthState {
  user: CrisisGuardUser | null;
  firebaseUser: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    firebaseUser: null,
    isLoading: true,
    error: null,
  });

  /**
   * After sign-in, fetch or create the user document in Firestore
   * and return an enriched CrisisGuardUser.
   */
  const enrichUser = useCallback(async (fbUser: User): Promise<CrisisGuardUser> => {
    const idToken = await fbUser.getIdToken();

    const userRef = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // First-ever sign-in: create profile with default viewer role
      await setDoc(userRef, {
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        role: 'viewer' as UserRole,
        propertyId: null,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });
    } else {
      // Update lastSeen on every login
      await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
    }

    const data = snap.exists() ? snap.data() : {};

    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      role: (data.role as UserRole) ?? 'viewer',
      propertyId: data.propertyId ?? null,
      idToken,
    };
  }, []);

  // ─── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setState({ user: null, firebaseUser: null, isLoading: false, error: null });
        return;
      }
      try {
        const enriched = await enrichUser(fbUser);
        setState({ user: enriched, firebaseUser: fbUser, isLoading: false, error: null });
      } catch (err) {
        setState({ user: null, firebaseUser: null, isLoading: false, error: 'Failed to load user profile.' });
      }
    });

    return unsubscribe;
  }, [enrichUser]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will pick up the new user
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      setState((s) => ({ ...s, isLoading: false, error: formatAuthError(msg) }));
      throw err;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setState((s) => ({ ...s, isLoading: false, error: formatAuthError(msg) }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithEmail,
        signInWithGoogle,
        logout,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ─── Error formatter ──────────────────────────────────────────────────────────
function formatAuthError(msg: string): string {
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'Invalid email or password.';
  if (msg.includes('too-many-requests'))
    return 'Too many failed attempts. Please try again later.';
  if (msg.includes('email-already-in-use'))
    return 'An account with this email already exists.';
  if (msg.includes('popup-closed-by-user'))
    return 'Google sign-in was cancelled.';
  if (msg.includes('network-request-failed'))
    return 'Network error. Check your connection.';
  return msg.replace(/Firebase: /g, '').replace(/\(auth\/.*?\)\.?/g, '').trim();
}
