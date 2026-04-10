'use client';

/**
 * CrisisGuard AI — AppShell
 * Handles auth-gated layout:
 *   • Unauthenticated → shows spinner or redirects to /login
 *   • Authenticated   → shows the full header + sidebar + main layout
 */

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { Loader2, ShieldAlert, Bell, Search, LogOut, User } from 'lucide-react';

const PUBLIC_ROUTES = ['/login'];

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // ─── Route guard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    if (!user && !isPublicRoute) {
      router.replace('/login');
    } else if (user && isPublicRoute) {
      router.replace('/');
    }
  }, [user, isLoading, isPublicRoute, router]);

  // ─── Loading splash ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0f14] gap-4">
        <div className="flex items-center gap-3 text-blue-400">
          <ShieldAlert className="w-8 h-8" />
          <span className="text-xl font-bold tracking-widest uppercase text-white">CrisisGuard AI</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mt-2" />
        <p className="text-xs text-slate-500 tracking-widest uppercase">Verifying credentials…</p>
      </div>
    );
  }

  // ─── Public pages (login) — no shell ────────────────────────────────────
  if (isPublicRoute || !user) {
    return <>{children}</>;
  }

  // ─── Authenticated shell ─────────────────────────────────────────────────
  return (
    <div className="overflow-hidden flex flex-col min-h-screen">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#111318]/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 shadow-[0_0_40px_rgba(33,150,243,0.06)] border-b border-white/5">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold tracking-widest text-[#9ecaff] uppercase font-headline">
              CrisisGuard AI
            </h1>
          </div>
          <nav className="hidden md:flex gap-6">
            <span className="text-sm font-headline tracking-wider text-[#9ecaff] border-b-2 border-[#2196f3] px-3 py-1">
              COMMAND
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              id="global-search"
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm w-64 focus:ring-1 focus:ring-blue-500/40 focus:outline-none font-body text-white placeholder:text-slate-600"
              placeholder="Search incidents…"
              type="text"
            />
          </div>

          {/* Notifications */}
          <button
            id="notifications-btn"
            aria-label="Notifications"
            className="p-2 text-slate-400 hover:bg-white/5 transition-colors duration-200 rounded-full active:scale-95"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* User avatar + name */}
          <UserMenu />
        </div>
      </header>

      {/* Sidebar + Main */}
      <div className="flex flex-1 pt-16">
        <Sidebar />
        <main className="flex-1 h-[calc(100vh-4rem)] bg-surface overflow-hidden ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── User Menu ────────────────────────────────────────────────────────────────
function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center gap-3">
      {user?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.photoURL}
          alt={user.displayName ?? 'User'}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full border border-white/20 object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full border border-white/20 bg-blue-600/30 flex items-center justify-center">
          <User className="w-4 h-4 text-blue-400" />
        </div>
      )}
      <div className="hidden lg:block text-right">
        <p className="text-xs font-semibold text-white leading-tight">
          {user?.displayName ?? user?.email ?? 'Operator'}
        </p>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{user?.role}</p>
      </div>
      <button
        id="logout-btn"
        aria-label="Sign out"
        onClick={logout}
        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-full"
        title="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
