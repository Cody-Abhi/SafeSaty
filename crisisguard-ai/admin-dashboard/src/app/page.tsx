'use client';

import { useState, useEffect } from 'react';
import { useIncidentStore } from '@/stores/incidentStore';
import { useStaffStore } from '@/stores/staffStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useFirestoreIncidents, useFirestoreStaff } from '@/hooks/useFirestore';
import { useRTDBAlertStream, useRTDBStaffLocations, usePresence } from '@/hooks/useRTDB';
import { useAuth } from '@/lib/auth';
import MetricCard from '@/components/MetricCard';
import IncidentFeed from '@/components/IncidentFeed';
import StaffDispatchPanel from '@/components/StaffDispatchPanel';
import SitrepDisplay from '@/components/SitrepDisplay';
import CommunicationHub from '@/components/CommunicationHub';
import {
  AlertTriangle,
  Users,
  Clock,
  Activity,
} from 'lucide-react';

// Property linked to the authenticated user's account
const PROPERTY_ID = 'hotel-grand-001';

export default function DashboardPage() {
  const { user } = useAuth();

  // ─── Firebase real-time subscriptions ─────────────────────────────────────
  useFirestoreIncidents(PROPERTY_ID);          // Firestore → incidentStore
  useFirestoreStaff(PROPERTY_ID);              // Firestore → staffStore
  useRTDBAlertStream(PROPERTY_ID);             // RTDB alert stream → incidentStore
  useRTDBStaffLocations(PROPERTY_ID);          // RTDB staff GPS → staffStore
  usePresence(user?.uid ?? null);              // Write own presence to RTDB

  // ─── WebSocket with Firebase ID token ─────────────────────────────────────
  const { latency } = useWebSocket({
    propertyId: PROPERTY_ID,
    token: user?.idToken,
    enabled: !!user,
  });

  const incidents = useIncidentStore((s) => s.incidents);
  const staff     = useStaffStore((s) => s.staff);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeIncidents = incidents.filter(
    (i) => !['resolved', 'false_alarm'].includes(i.status),
  );
  const criticalCount = incidents.filter(
    (i) => i.severity === 'critical' && !['resolved', 'false_alarm'].includes(i.status),
  ).length;
  const onDutyCount = staff.filter((s) => s.status !== 'off_duty').length;

  return (
    <div className="h-full bg-surface-dim overflow-y-auto">
      {/* ─── Main Content ────────────────────────────── */}
      <div className="max-w-[1920px] mx-auto p-8 space-y-8">
        
        {/* Header Info */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-primary-container/20 text-primary font-label text-[10px] font-bold uppercase rounded-full tracking-widest border border-primary-container/30">Live</span>
              <span className="font-body text-sm text-on-surface-variant tracking-wide">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tighter text-on-surface uppercase">Command Center</h1>
            {user && (
              <p className="text-xs text-slate-500 mt-1">
                Property: <span className="text-slate-300">{PROPERTY_ID}</span>
                {' · '}Role: <span className="text-slate-300 uppercase">{user.role}</span>
              </p>
            )}
          </div>
          <div className="flex gap-3">
             <div className={`p-3 text-xs font-label uppercase tracking-widest flex items-center gap-2 rounded-xl border ${latency > 0 ? 'bg-surface-container-highest border-outline-variant/10 text-primary/70' : 'bg-surface-container border-outline-variant/5 text-slate-500'}`}>
               <div className={`w-2 h-2 rounded-full flex-shrink-0 ${latency > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
               {latency > 0 ? `WS: ${latency}ms` : 'WS: connecting…'}
             </div>
          </div>
        </div>

        {/* Metric row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Active Incidents"
            value={activeIncidents.length}
            subtitle={`${criticalCount} critical`}
            icon={AlertTriangle}
            accentColor={criticalCount > 0 ? '#ef4444' : '#f97316'}
            pulse={criticalCount > 0}
          />
          <MetricCard
            title="On-Duty Staff"
            value={onDutyCount}
            subtitle={`${staff.length} total`}
            icon={Users}
            accentColor="#9ecaff"
          />
          <MetricCard
            title="Response Time"
            value="—"
            subtitle="Avg 24h window"
            icon={Clock}
            accentColor="#22c55e"
          />
          <MetricCard
            title="System Status"
            value="Live"
            subtitle="Firebase connected"
            icon={Activity}
            accentColor="#3b82f6"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Incident Feed */}
          <div className="lg:col-span-4 min-h-[500px]">
            <IncidentFeed />
          </div>

          {/* Center: Staff Panel */}
          <div className="lg:col-span-4 min-h-[500px]">
            <StaffDispatchPanel />
          </div>

          {/* Right: SITREP */}
          <div className="lg:col-span-4 min-h-[500px]">
             <SitrepDisplay />
          </div>
        </div>

        {/* Bottom: Communication Hub */}
        <div className="h-[400px]">
          <CommunicationHub />
        </div>
      </div>
    </div>
  );
}
