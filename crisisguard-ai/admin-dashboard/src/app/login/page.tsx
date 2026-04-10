'use client';

/**
 * CrisisGuard AI — Login Page
 * Supports Email/Password and Google OAuth via Firebase Authentication.
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ShieldAlert, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, resetPassword, error, clearError, isLoading } = useAuth();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [mode, setMode]           = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  // ─── Email / Password submit ───────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setResetSent(true);
      } else {
        await signInWithEmail(email, password);
        router.replace('/');
      }
    } catch {
      // Error is set by the context
    }
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────────
  async function handleGoogle() {
    clearError();
    try {
      await signInWithGoogle();
      router.replace('/');
    } catch {
      // Error is set by the context
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#111318]/90 backdrop-blur-xl p-10 shadow-2xl">
          
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-10">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30">
              <ShieldAlert className="w-7 h-7 text-blue-400" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-widest text-white uppercase font-headline">
                CrisisGuard AI
              </h1>
              <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase">
                {mode === 'reset' ? 'Password Reset' : 'Command Center Access'}
              </p>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 mb-6 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reset sent confirmation */}
          {resetSent && mode === 'reset' && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 mb-6 text-sm text-green-400 text-center">
              Password reset email sent — check your inbox.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs text-slate-400 mb-2 uppercase tracking-widest">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
                  placeholder="operator@property.com"
                />
              </div>
            </div>

            {/* Password (hidden in reset mode) */}
            {mode === 'login' && (
              <div>
                <label htmlFor="password" className="block text-xs text-slate-400 mb-2 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold py-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</>
              ) : mode === 'reset' ? (
                'Send Reset Email'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Google button (login only) */}
          {mode === 'login' && (
            <>
              <div className="flex items-center gap-4 my-6">
                <hr className="flex-1 border-white/10" />
                <span className="text-xs text-slate-500 uppercase tracking-widest">or</span>
                <hr className="flex-1 border-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {/* Google logo inline SVG */}
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {/* Footer links */}
          <div className="mt-6 flex justify-between text-xs text-slate-500">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => { setMode('reset'); clearError(); setResetSent(false); }}
                className="hover:text-slate-300 transition"
              >
                Forgot password?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('login'); clearError(); setResetSent(false); }}
                className="hover:text-slate-300 transition"
              >
                ← Back to Sign In
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          CrisisGuard AI · safestay-12b52 · Authorised Personnel Only
        </p>
      </div>
    </div>
  );
}
