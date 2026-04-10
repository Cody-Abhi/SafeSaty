'use client';

import React, { useState } from 'react';

interface RouteResult {
  origin: string;
  destination: string;
  total_distance_m: number;
  estimated_time_s: number;
  node_count: number;
  waypoints: Array<{
    node_id: string;
    floor: number;
    zone: string;
    type: string;
    cumulative_distance_m: number;
    cumulative_time_s: number;
  }>;
}

const DEMO_ROUTES: RouteResult[] = [
  {
    origin: 'F3-room-east-02', destination: 'exit-east',
    total_distance_m: 34, estimated_time_s: 36, node_count: 7,
    waypoints: [
      { node_id: 'F3-corridor-east', floor: 3, zone: 'east_wing', type: 'corridor', cumulative_distance_m: 8, cumulative_time_s: 6 },
      { node_id: 'F3-stair-east', floor: 3, zone: 'east_wing', type: 'stairwell', cumulative_distance_m: 13, cumulative_time_s: 10 },
      { node_id: 'F2-stair-east', floor: 2, zone: 'east_wing', type: 'stairwell', cumulative_distance_m: 17, cumulative_time_s: 18 },
      { node_id: 'F1-stair-east', floor: 1, zone: 'east_wing', type: 'stairwell', cumulative_distance_m: 21, cumulative_time_s: 26 },
      { node_id: 'F1-corridor-east', floor: 1, zone: 'east_wing', type: 'corridor', cumulative_distance_m: 26, cumulative_time_s: 30 },
      { node_id: 'exit-east', floor: 1, zone: 'east_wing', type: 'exit', cumulative_distance_m: 34, cumulative_time_s: 36 },
    ],
  },
  {
    origin: 'F5-room-west-01', destination: 'exit-west',
    total_distance_m: 46, estimated_time_s: 52, node_count: 9,
    waypoints: [
      { node_id: 'F5-corridor-west', floor: 5, zone: 'west_wing', type: 'corridor', cumulative_distance_m: 8, cumulative_time_s: 6 },
      { node_id: 'F5-stair-west', floor: 5, zone: 'west_wing', type: 'stairwell', cumulative_distance_m: 13, cumulative_time_s: 10 },
      { node_id: 'F4-stair-west', floor: 4, zone: 'west_wing', type: 'stairwell', cumulative_distance_m: 17, cumulative_time_s: 18 },
      { node_id: 'F3-stair-west', floor: 3, zone: 'west_wing', type: 'stairwell', cumulative_distance_m: 21, cumulative_time_s: 26 },
      { node_id: 'F2-stair-west', floor: 2, zone: 'west_wing', type: 'stairwell', cumulative_distance_m: 25, cumulative_time_s: 34 },
      { node_id: 'F1-stair-west', floor: 1, zone: 'west_wing', type: 'stairwell', cumulative_distance_m: 29, cumulative_time_s: 42 },
      { node_id: 'F1-corridor-west', floor: 1, zone: 'west_wing', type: 'corridor', cumulative_distance_m: 34, cumulative_time_s: 46 },
      { node_id: 'exit-west', floor: 1, zone: 'west_wing', type: 'exit', cumulative_distance_m: 42, cumulative_time_s: 52 },
    ],
  },
];

const ASSEMBLY_STATUS = {
  expected_guests: 150,
  total_checked_in: 87,
  unaccounted: 63,
  accounted_pct: 58.0,
  points: [
    { point_id: 'assembly-front', name: 'Front Parking Lot', capacity: 500, current_count: 62, utilization_pct: 12.4 },
    { point_id: 'assembly-rear', name: 'Rear Garden', capacity: 300, current_count: 25, utilization_pct: 8.3 },
  ],
};

const BLOCKED_PATHS = [
  { from: 'F3-corridor-central', to: 'F3-corridor-east', reason: 'Fire in east wing F3' },
];

const NODE_TYPE_ICONS: Record<string, string> = {
  room: '🛏️',
  corridor: '🚶',
  stairwell: '🏗️',
  exit: '🚪',
  assembly: '📍',
};

export default function EvacuationPage() {
  const [selectedRoute, setSelectedRoute] = useState(0);
  const route = DEMO_ROUTES[selectedRoute];

  return (
    <div className="h-full bg-surface-dim overflow-y-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-tighter text-on-surface uppercase flex items-center gap-3">
            <span className="p-2 bg-error/10 text-error rounded-xl border border-error/20">🚪</span>
            Evacuation Control
          </h1>
          <p className="font-body text-on-surface-variant tracking-wide mt-2">
            Route management, assembly tracking, and hazard overlay
          </p>
        </div>
        <div className="bg-error/10 border border-error/30 text-error px-6 py-3 rounded-xl font-headline text-sm font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,46,46,0.2)] animate-pulse flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
          Evacuation Active
        </div>
      </div>

      {/* Assembly Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Expected Guests', value: ASSEMBLY_STATUS.expected_guests, color: '#3B82F6' },
          { label: 'Checked In', value: ASSEMBLY_STATUS.total_checked_in, color: '#22C55E' },
          { label: 'Unaccounted', value: ASSEMBLY_STATUS.unaccounted, color: '#FF2E2E' },
          { label: 'Accounted %', value: `${ASSEMBLY_STATUS.accounted_pct}%`, color: '#FBBF24' },
        ].map((m) => (
          <div key={m.label} className="bg-surface-container-highest/40 border border-outline-variant/10 rounded-2xl p-5 text-center shadow-md">
            <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2 font-bold hover:text-on-surface">
              {m.label}
            </div>
            <div className="font-headline text-3xl font-bold tracking-tighter" style={{ color: m.color }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Route Visualization */}
        <div className="xl:col-span-2 bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
              <span className="text-secondary">🗺️</span> Route Visualization
            </h3>
            <div className="flex gap-2">
              {DEMO_ROUTES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedRoute(i)}
                  className={`px-4 py-2 rounded-lg font-label text-[10px] uppercase tracking-widest transition-all ${
                    selectedRoute === i 
                      ? 'bg-primary/20 text-primary font-bold shadow-sm border border-primary/20' 
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                  }`}
                >
                  Route {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Route info bar */}
          <div className="flex flex-wrap gap-6 p-4 bg-primary/5 border border-primary/10 rounded-xl mb-6 font-label text-xs uppercase tracking-widest">
            <span className="text-on-surface-variant"><strong className="text-primary text-sm">{route.total_distance_m}m</strong> distance</span>
            <span className="text-on-surface-variant"><strong className="text-green-500 text-sm">{route.estimated_time_s}s</strong> ETA</span>
            <span className="text-on-surface-variant"><strong className="text-secondary text-sm">{route.node_count}</strong> nodes</span>
          </div>

          {/* Waypoint list */}
          <div className="flex flex-col gap-2">
            {/* Origin */}
            <div className="flex items-center gap-4 p-4 bg-primary/10 border-l-4 border-l-primary rounded-xl">
              <span className="text-xl">📍</span>
              <div>
                <div className="font-headline text-sm font-bold text-on-surface uppercase tracking-wider">{route.origin}</div>
                <div className="font-label text-[10px] text-primary uppercase tracking-widest font-bold">Start Location</div>
              </div>
            </div>

            {route.waypoints.map((wp) => (
              <div key={wp.node_id} className="flex items-stretch gap-4 group">
                {/* Connector line */}
                <div className="w-14 flex justify-center py-1">
                  <div className={`w-[2px] transition-colors ${
                    wp.type === 'exit' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-outline-variant/30 group-hover:bg-primary/50'
                  }`} />
                </div>

                {/* Waypoint */}
                <div className={`flex-1 flex gap-4 p-3 rounded-xl border-l-[3px] transition-all hover:translate-x-1 ${
                  wp.type === 'exit' 
                    ? 'bg-green-500/10 border-l-green-500' 
                    : 'bg-surface-container-highest/30 border-l-outline-variant/30 hover:border-l-primary hover:bg-surface-container-highest'
                }`}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-dim border border-outline-variant/10 text-sm">
                    {NODE_TYPE_ICONS[wp.type] || '•'}
                  </div>
                  <div className="flex-1 py-1">
                    <div className="font-headline text-sm text-on-surface font-medium capitalize">{wp.node_id.replace(/-/g, ' ')}</div>
                    <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                      F{wp.floor} • {wp.zone?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div className="text-right py-1 flex flex-col justify-between">
                    <div className="font-label text-[10px] text-on-surface-variant">{wp.cumulative_distance_m}m</div>
                    <div className="font-headline text-xs font-bold text-on-surface">{wp.cumulative_time_s}s</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Assembly Points */}
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 shadow-xl">
            <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="text-green-500">📍</span> Assembly Points
            </h3>
            <div className="flex flex-col gap-4">
              {ASSEMBLY_STATUS.points.map((p) => (
                <div key={p.point_id} className="p-4 bg-surface-container-highest/20 rounded-xl border border-outline-variant/5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-headline text-sm font-bold text-on-surface">{p.name}</span>
                    <span className="font-label text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded">
                      {p.current_count}/{p.capacity}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${p.utilization_pct}%`,
                      backgroundColor: p.utilization_pct > 80 ? '#FF2E2E' : p.utilization_pct > 50 ? '#FBBF24' : '#22C55E'
                    }} />
                  </div>
                  <div className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">
                    {p.utilization_pct}% capacity
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blocked Paths */}
          <div className="bg-error/5 border border-error/10 rounded-2xl p-6 shadow-xl">
            <h3 className="font-headline text-sm font-bold text-error uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>🚫</span> Blocked Paths ({BLOCKED_PATHS.length})
            </h3>
            <div className="flex flex-col gap-2">
              {BLOCKED_PATHS.map((bp, i) => (
                <div key={i} className="p-3 bg-error/10 rounded-xl border border-error/20">
                  <div className="font-headline text-xs font-bold text-error mb-1 flex items-center gap-2">
                    {bp.from} <span>→</span> {bp.to}
                  </div>
                  <div className="font-label text-[10px] text-error/70 uppercase tracking-widest">{bp.reason}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Exit Load Balance */}
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 shadow-xl">
            <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-widest mb-6">
              Exit Load Distribution
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { exit: 'Main Entrance', load: 45, color: '#3B82F6' },
                { exit: 'East Exit', load: 30, color: '#22C55E' },
                { exit: 'West Exit', load: 25, color: '#FBBF24' },
              ].map((e) => (
                <div key={e.exit} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-label text-[10px] text-on-surface uppercase tracking-wider font-bold">{e.exit}</span>
                    <span className="font-headline text-sm font-bold" style={{ color: e.color }}>{e.load}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all group-hover:shadow-[0_0_10px_currentColor]" style={{ width: `${e.load}%`, backgroundColor: e.color, color: e.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
