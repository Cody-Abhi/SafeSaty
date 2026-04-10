'use client';

import { motion } from 'framer-motion';

interface SitrepEntry {
  time: string;
  summary: string;
  severity: 'info' | 'warning' | 'critical';
}

// During real operation this will be replaced with Gemini-generated rolling SITREPs
const DEMO_SITREPS: SitrepEntry[] = [
  {
    time: new Date().toISOString(),
    summary: 'System initialized. All zones reporting normal status. 0 active incidents across all monitored properties.',
    severity: 'info',
  },
];

export default function SitrepDisplay() {
  return (
    <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 h-full flex flex-col shadow-xl">
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-outline-variant/10">
        <h2 className="font-headline text-lg font-bold tracking-widest text-on-surface uppercase">
          AI Situation Report
        </h2>
        <span className="font-label text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-widest">
          Auto-Refresh 60s
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {DEMO_SITREPS.map((sitrep, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 rounded-xl bg-surface-container-highest/60 border border-outline-variant/10 hover:bg-surface-variant transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  sitrep.severity === 'critical'
                    ? 'bg-tertiary animate-pulse shadow-[0_0_8px_rgba(255,180,169,0.8)]'
                    : sitrep.severity === 'warning'
                      ? 'bg-secondary-container'
                      : 'bg-primary'
                }`}
              />
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/80">
                {new Date(sitrep.time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </span>
            </div>
            <p className="font-body text-sm text-on-surface leading-relaxed">
              {sitrep.summary}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
