'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/incidents', label: 'Incidents', icon: 'emergency' },
  { href: '/evacuation', label: 'Evacuation', icon: 'directions_run' },
  { href: '/analytics', label: 'Analytics', icon: 'monitoring' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 z-40 bg-surface-container-low flex flex-col pt-20 pb-6 px-4 border-r border-[#33353a]">
      <div className="px-4 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></div>
          <span className="font-headline text-xs uppercase tracking-widest text-on-surface-variant">System Status</span>
        </div>
        <p className="text-primary font-headline text-sm font-bold">ALL SYSTEMS NOMINAL</p>
      </div>
      
      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 transition-all rounded-xl font-label text-sm uppercase tracking-wider ${
                active 
                  ? 'bg-surface-variant text-primary font-bold border-r-4 border-primary-container active:translate-x-1' 
                  : 'text-on-surface-variant opacity-70 hover:bg-surface-variant hover:opacity-100'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button className="mx-2 my-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-headline font-bold uppercase tracking-tighter shadow-lg shadow-primary/10 active:scale-95 transition-transform">
          New Incident
      </button>

      <div className="pt-6 border-t border-outline-variant/20 space-y-2">
        <a className="flex items-center gap-4 px-4 py-2 text-on-surface-variant opacity-70 hover:bg-surface-variant rounded-xl font-label text-xs uppercase tracking-wider" href="#">
          <span className="material-symbols-outlined text-lg">help</span>
          <span>Support</span>
        </a>
        <a className="flex items-center gap-4 px-4 py-2 text-on-surface-variant opacity-70 hover:bg-surface-variant rounded-xl font-label text-xs uppercase tracking-wider" href="#">
          <span className="material-symbols-outlined text-lg">history</span>
          <span>Logs</span>
        </a>
      </div>
    </aside>
  );
}
