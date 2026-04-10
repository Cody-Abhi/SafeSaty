'use client';

import { useIncidentStore, type Incident } from '@/stores/incidentStore';
import { cn, relativeTime } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  HeartPulse,
  Shield,
  AlertTriangle,
  CloudLightning,
  ChevronRight,
} from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  fire: <Flame size={16} className="text-red-400" />,
  medical: <HeartPulse size={16} className="text-blue-400" />,
  security: <Shield size={16} className="text-purple-400" />,
  hazard: <AlertTriangle size={16} className="text-yellow-400" />,
  natural_disaster: <CloudLightning size={16} className="text-cyan-400" />,
};

function IncidentRow({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left mb-2',
        'bg-surface-container-highest/20 hover:bg-surface-container-highest/60 border border-outline-variant/10 shadow-sm shadow-black/10',
        incident.severity === 'critical' ? 'border-l-[3px] border-l-tertiary shadow-[0_0_15px_rgba(255,180,169,0.05)]' :
        incident.severity === 'high' ? 'border-l-[3px] border-l-secondary-container' :
        incident.severity === 'medium' ? 'border-l-[3px] border-l-secondary' :
        'border-l-[3px] border-l-primary',
        incident.status !== 'resolved' && incident.severity === 'critical' && 'pulse-critical'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 relative">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center border border-outline-variant/10',
            incident.severity === 'critical' ? 'bg-tertiary/10 text-tertiary' :
            incident.severity === 'high' ? 'bg-secondary-container/10 text-secondary-container' :
            incident.severity === 'medium' ? 'bg-secondary/10 text-secondary' :
            'bg-primary/10 text-primary',
          )}
        >
          {typeIcons[incident.type] || <AlertTriangle size={18} />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-headline text-sm font-bold truncate capitalize text-on-surface">
            {incident.type.replace('_', ' ')}
          </span>
          <span
            className={cn(
              'font-label text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold',
              incident.severity === 'critical' ? 'bg-tertiary/20 text-tertiary' :
              incident.severity === 'high' ? 'bg-secondary-container/20 text-secondary-container' :
              incident.severity === 'medium' ? 'bg-secondary/20 text-secondary' :
              'bg-primary/20 text-primary',
            )}
          >
            {incident.severity}
          </span>
        </div>
        <p className="font-body text-xs text-on-surface-variant truncate">
          {incident.location.zone} · Floor {incident.location.floor}
        </p>
      </div>

      {/* Status + time */}
      <div className="flex-shrink-0 text-right pr-2">
        <span
          className={cn(
            'font-label text-[9px] px-2 py-0.5 rounded-sm capitalize tracking-wider',
            incident.status === 'resolved' ? 'text-on-surface-variant' : 'bg-surface-primary/10 text-primary border border-primary/20'
          )}
        >
          {incident.status.replace('_', ' ')}
        </span>
        <p className="font-body text-[10px] text-on-surface-variant/60 mt-2">
          {relativeTime(incident.detectedAt)}
        </p>
      </div>

      <ChevronRight size={16} className="text-on-surface-variant flex-shrink-0" />
    </motion.button>
  );
}

export default function IncidentFeed() {
  const incidents = useIncidentStore((s) => s.incidents);
  const setActiveIncident = useIncidentStore((s) => s.setActiveIncident);

  const sorted = [...incidents].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const statusOrder = { detected: 0, confirmed: 1, responding: 2, resolved: 3, false_alarm: 4 };
    const sDiff =
      (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
    if (sDiff !== 0) return sDiff;
    return (
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
    );
  });

  return (
    <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 h-full flex flex-col shadow-xl">
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-outline-variant/10">
        <h2 className="font-headline text-lg font-bold tracking-widest text-on-surface uppercase">
          Live Feed
        </h2>
        <span className="font-label text-[10px] bg-surface-container-highest px-3 py-1 rounded-full uppercase tracking-widest text-on-surface-variant">
          {incidents.filter((i) => !['resolved', 'false_alarm'].includes(i.status)).length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        <AnimatePresence mode="popLayout">
          {sorted.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center font-body text-sm text-on-surface-variant py-12"
            >
              No incidents — all clear ✓
            </motion.p>
          ) : (
            sorted.map((incident) => (
              <IncidentRow
                key={incident.eventId}
                incident={incident}
                onClick={() => setActiveIncident(incident)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
