'use client';

import React, { useState, useEffect } from 'react';
import { useIncidentStore, TimelineEntry } from '@/stores/incidentStore';

type FilterStatus = 'all' | 'active' | 'confirmed' | 'responding' | 'resolved';
type FilterSeverity = 'all' | 'critical' | 'high' | 'medium' | 'low';

const STATUS_COLORS: Record<string, string> = {
  detected: '#FF6B35',
  confirmed: '#FF2E2E',
  responding: '#3B82F6',
  resolved: '#22C55E',
  false_alarm: '#94A3B8',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF0040',
  high: '#FF6B35',
  medium: '#FBBF24',
  low: '#22C55E',
};

export default function IncidentsPage() {
  const { incidents } = useIncidentStore();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredIncidents = incidents.filter((incident) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        if (['resolved', 'false_alarm'].includes(incident.status)) return false;
      } else {
        if (incident.status !== statusFilter) return false;
      }
    }
    if (severityFilter !== 'all' && incident.severity !== severityFilter) return false;
    return true;
  });

  const selected = selectedIncident
    ? incidents.find((i) => i.eventId === selectedIncident)
    : null;

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getTimeSince = (date: string | Date) => {
    const diff = currentTime.getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s ago` : `${secs}s ago`;
  };

  return (
    <div className="h-full bg-surface-dim overflow-y-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-tighter text-on-surface uppercase flex items-center gap-3">
            <span className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20">🚨</span>
            Incident Command
          </h1>
          <p className="font-body text-on-surface-variant tracking-wide mt-2">
            Real-time incident lifecycle management
          </p>
        </div>
        <div className="flex gap-3">
           <div className="p-3 bg-surface-container-highest text-primary/70 rounded-xl border border-outline-variant/10 text-xs font-label uppercase tracking-widest flex items-center gap-2">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
             {currentTime.toLocaleTimeString()} UTC
           </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
          {(['all', 'active', 'confirmed', 'responding', 'resolved'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg font-label text-[10px] uppercase tracking-widest transition-all ${
                statusFilter === s 
                  ? 'bg-primary/20 text-primary font-bold shadow-sm border border-primary/20' 
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
          {(['all', 'critical', 'high', 'medium', 'low'] as FilterSeverity[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-4 py-2 rounded-lg font-label text-[10px] uppercase tracking-widest transition-all ${
                severityFilter === s 
                  ? 'bg-secondary-container/20 text-secondary-container font-bold shadow-sm border border-secondary-container/20' 
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="ml-auto font-label text-xs tracking-widest text-on-surface-variant uppercase bg-surface-container-highest px-4 py-2 rounded-xl">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main content */}
      <div className={`grid ${selected ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
        {/* Incident List */}
        <div className="flex flex-col gap-3">
          {filteredIncidents.length === 0 && (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-12 text-center text-on-surface-variant">
              <p className="text-4xl mb-4">✅</p>
              <p className="font-headline uppercase tracking-widest">No incidents matching filters</p>
            </div>
          )}
          {filteredIncidents.map((incident) => (
            <div
              key={incident.eventId}
              onClick={() => setSelectedIncident(incident.eventId === selectedIncident ? null : incident.eventId)}
              className={`bg-surface-container-low border rounded-2xl p-5 cursor-pointer transition-all hover:bg-surface-container-highest shadow-md ${
                incident.eventId === selectedIncident
                  ? 'border-primary/50 shadow-[0_0_20px_rgba(33,150,243,0.1)]'
                  : 'border-outline-variant/10'
              }`}
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: SEVERITY_COLORS[incident.severity] || '#94A3B8'
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-headline text-lg font-bold text-on-surface tracking-wide">
                      {incident.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span 
                      className="font-label text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold"
                      style={{
                        backgroundColor: `${STATUS_COLORS[incident.status]}22`,
                        color: STATUS_COLORS[incident.status]
                      }}
                    >
                      {incident.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="font-body text-sm text-on-surface-variant">
                    Floor {incident.location.floor} • {incident.location.zone?.replace(/_/g, ' ')} • {incident.assignedStaff?.length || 0} staff responding
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-label text-xs uppercase tracking-widest text-on-surface-variant/70 mb-1">
                    {formatTime(incident.detectedAt)}
                  </div>
                  <div className="font-headline text-sm font-bold tracking-widest" style={{ color: SEVERITY_COLORS[incident.severity] }}>
                    {getTimeSince(incident.detectedAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 h-fit sticky top-8 shadow-xl">
            <h2 className="font-headline text-2xl font-bold tracking-tighter text-on-surface uppercase mb-6 pb-4 border-b border-outline-variant/10">
              {selected.type.replace(/_/g, ' ').toUpperCase()} — Detail
            </h2>

            {/* Status + Severity badges */}
            <div className="flex gap-2 mb-6">
              <span 
                className="font-label text-xs px-3 py-1 rounded-md font-bold uppercase tracking-widest border"
                style={{
                  backgroundColor: `${SEVERITY_COLORS[selected.severity]}11`,
                  color: SEVERITY_COLORS[selected.severity],
                  borderColor: `${SEVERITY_COLORS[selected.severity]}33`
                }}
              >
                {selected.severity}
              </span>
              <span 
                className="font-label text-xs px-3 py-1 rounded-md font-bold uppercase tracking-widest border"
                style={{
                  backgroundColor: `${STATUS_COLORS[selected.status]}11`,
                  color: STATUS_COLORS[selected.status],
                  borderColor: `${STATUS_COLORS[selected.status]}33`
                }}
              >
                {selected.status.replace('_', ' ')}
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { label: 'Event ID', value: selected.eventId },
                { label: 'Source', value: selected.source },
                { label: 'Floor', value: `Floor ${selected.location.floor}` },
                { label: 'Zone', value: selected.location.zone?.replace(/_/g, ' ') },
                { label: 'Detected', value: formatTime(selected.detectedAt) },
                { label: 'Staff Assigned', value: `${selected.assignedStaff?.length || 0}` },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-surface-container-highest/50 border border-outline-variant/10 rounded-xl">
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/70 mb-1">{item.label}</div>
                  <div className="font-body text-sm text-on-surface font-medium">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse"></span>
              Live Timeline
            </h3>
            <div className="flex flex-col gap-3">
              {(selected.timeline || []).map((entry: TimelineEntry, i: number) => (
                <div key={i} className="flex gap-4 p-3 bg-surface-container-highest/30 border border-outline-variant/5 rounded-xl text-sm">
                  <span className="font-label text-xs tracking-widest text-on-surface-variant/70 flex-shrink-0 w-20">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className="w-px bg-outline-variant/20 mx-1"></span>
                  <span className="font-body text-on-surface">{entry.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
