/**
 * CrisisGuard AI - Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind CSS classes with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a timestamp for display */
export function formatTimestamp(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Format relative time (e.g. "2m ago") */
export function relativeTime(date: Date | string | number): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

/** Severity color mapping */
export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return '#6b7280';
  }
}

/** Severity badge classes */
export function severityBadge(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

/** Status badge classes */
export function statusBadge(status: string): string {
  switch (status) {
    case 'detected': return 'bg-purple-500/20 text-purple-400';
    case 'confirmed': return 'bg-red-500/20 text-red-400';
    case 'responding': return 'bg-amber-500/20 text-amber-400';
    case 'resolved': return 'bg-green-500/20 text-green-400';
    case 'false_alarm': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}
