'use client';

import React, { useState } from 'react';

interface MetricCard {
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'flat';
  color: string;
}

const METRICS: MetricCard[] = [
  { label: 'Total Incidents (24h)', value: 12, change: '-3 vs yesterday', trend: 'down', color: '#3B82F6' },
  { label: 'Avg Response Time', value: '2m 14s', change: '-18s vs avg', trend: 'down', color: '#22C55E' },
  { label: 'Staff Utilization', value: '78%', change: '+5%', trend: 'up', color: '#FBBF24' },
  { label: 'False Alarm Rate', value: '8.3%', change: '-2.1%', trend: 'down', color: '#8B5CF6' },
  { label: 'AI Detection Accuracy', value: '96.7%', change: '+0.3%', trend: 'up', color: '#06B6D4' },
  { label: 'Guest Satisfaction', value: '4.8/5', change: '+0.2', trend: 'up', color: '#EC4899' },
];

const HOURLY_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  incidents: Math.max(0, Math.round(3 + Math.sin(i / 3) * 4 + (Math.random() - 0.5) * 2)),
  responseTime: Math.round(100 + Math.sin(i / 4) * 40 + (Math.random() - 0.5) * 20),
  staffOnDuty: Math.round(i >= 6 && i <= 22 ? 12 + Math.round(Math.sin((i - 6) / 5) * 4) : 5),
}));

const INCIDENT_TYPES = [
  { type: 'Medical', count: 5, pct: 41.7, color: '#FF6B35' },
  { type: 'Security', count: 3, pct: 25.0, color: '#FF2E2E' },
  { type: 'Fire Alarm', count: 2, pct: 16.7, color: '#FBBF24' },
  { type: 'Natural Disaster', count: 1, pct: 8.3, color: '#3B82F6' },
  { type: 'Other', count: 1, pct: 8.3, color: '#94A3B8' },
];

const ZONE_HEATMAP = [
  { zone: 'East Wing F1', incidents: 4, risk: 'high' },
  { zone: 'West Wing F2', incidents: 3, risk: 'medium' },
  { zone: 'Central F3', incidents: 2, risk: 'medium' },
  { zone: 'East Wing F4', incidents: 1, risk: 'low' },
  { zone: 'Pool Area', incidents: 2, risk: 'medium' },
  { zone: 'Lobby', incidents: 0, risk: 'low' },
  { zone: 'Parking', incidents: 0, risk: 'low' },
  { zone: 'Restaurant', incidents: 0, risk: 'low' },
];

const RISK_COLORS: Record<string, string> = {
  high: '#FF2E2E',
  medium: '#FBBF24',
  low: '#22C55E',
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const maxIncidents = Math.max(...HOURLY_DATA.map((d) => d.incidents), 1);

  return (
    <div className="h-full bg-surface-dim overflow-y-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-tighter text-on-surface uppercase flex items-center gap-3">
            <span className="p-2 bg-secondary/10 text-secondary rounded-xl border border-secondary/20">📊</span>
            Analytics Dashboard
          </h1>
          <p className="font-body text-on-surface-variant tracking-wide mt-2">
            Incident analytics and performance metrics
          </p>
        </div>
        <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-label text-[10px] uppercase tracking-widest transition-all ${
                timeRange === range 
                  ? 'bg-primary/20 text-primary font-bold shadow-sm border border-primary/20' 
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="bg-surface-container-highest/40 border border-outline-variant/10 rounded-2xl p-5 hover:bg-surface-container-highest/80 transition-all shadow-md group"
          >
            <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2 font-bold line-clamp-1 group-hover:text-on-surface">
              {m.label}
            </div>
            <div className="font-headline text-3xl font-bold mb-3 tracking-tighter" style={{ color: m.color }}>
              {m.value}
            </div>
            <div 
              className="font-label text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md inline-flex items-center gap-1"
              style={{
                backgroundColor: m.trend === 'down' ? '#22C55E22' : m.trend === 'up' ? (m.label.includes('Accuracy') || m.label.includes('Satisfaction') || m.label.includes('Utilization') ? '#22C55E22' : '#FF2E2E22') : '#94A3B822',
                color: m.trend === 'down' ? '#22C55E' : m.trend === 'up' ? (m.label.includes('Accuracy') || m.label.includes('Satisfaction') || m.label.includes('Utilization') ? '#22C55E' : '#FF2E2E') : '#94A3B8',
              }}
            >
              {m.trend === 'down' ? '▼' : m.trend === 'up' ? '▲' : '▶'} {m.change}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Hourly Incident Bar Chart */}
        <div className="lg:col-span-2 bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 shadow-xl">
          <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest mb-6">
            Hourly Incident Volume
          </h3>
          <div className="flex items-end gap-1 h-[180px] px-2 w-full">
            {HOURLY_DATA.map((d) => (
              <div key={d.hour} className="flex flex-col items-center flex-1 group">
                <div
                  className="w-full rounded-t-sm opacity-80 group-hover:opacity-100 transition-all cursor-crosshair min-w-[4px]"
                  style={{
                    height: `${Math.max(2, (d.incidents / maxIncidents) * 100)}%`,
                    backgroundColor: d.incidents > 5 ? '#FF2E2E' : d.incidents > 2 ? '#FBBF24' : '#3B82F6',
                  }}
                />
                {d.hour % 4 === 0 && (
                  <span className="font-label text-[9px] text-on-surface-variant mt-2 tracking-widest">{d.hour}:00</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Incident Type Breakdown */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest mb-6">
            Incident Types
          </h3>
          <div className="flex flex-col gap-5 flex-1 justify-center">
            {INCIDENT_TYPES.map((t) => (
              <div key={t.type} className="group">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-label text-[10px] text-on-surface uppercase tracking-wider font-bold">{t.type}</span>
                  <span className="font-body text-xs text-on-surface-variant font-medium">{t.count} <span className="text-[10px] opacity-70">({t.pct}%)</span></span>
                </div>
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all group-hover:shadow-[0_0_10px_currentColor]" style={{ width: `${t.pct}%`, backgroundColor: t.color, color: t.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zone Risk Heatmap */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 shadow-xl">
          <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest mb-6">
            Zone Risk Map
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {ZONE_HEATMAP.map((z) => (
              <div
                key={z.zone}
                className="p-3 rounded-xl border flex justify-between items-center bg-surface-container-highest/20"
                style={{
                  borderColor: `${RISK_COLORS[z.risk]}33`,
                }}
              >
                <span className="font-body text-sm text-on-surface">{z.zone}</span>
                <span 
                  className="font-label text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest"
                  style={{
                    backgroundColor: `${RISK_COLORS[z.risk]}22`,
                    color: RISK_COLORS[z.risk],
                  }}
                >
                  {z.incidents} ({z.risk})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time Trend */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest mb-6">
            Response Time Trend (Sec)
          </h3>
          <div className="flex items-end gap-1 flex-1 px-2 pt-4">
            {HOURLY_DATA.map((d) => (
              <div key={d.hour} className="flex flex-col items-center flex-1 group">
                <div
                  className="w-full rounded-t-sm opacity-60 group-hover:opacity-100 transition-all cursor-crosshair min-w-[4px]"
                  style={{
                    height: `${Math.max(4, (d.responseTime / 160) * 100)}%`,
                    backgroundColor: d.responseTime > 130 ? '#FF2E2E' : d.responseTime > 100 ? '#FBBF24' : '#22C55E',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 px-2 font-label text-[9px] uppercase tracking-widest text-on-surface-variant border-t border-outline-variant/10 pt-2">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
