'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  accentColor?: string;
  pulse?: boolean;
  className?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = '#3b82f6',
  pulse = false,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('glass-card p-6 flex items-start justify-between relative overflow-hidden transition-all hover:bg-surface-container-highest/60', pulse && 'pulse-critical border-error-container', className)}
    >
      {/* Decorative top border */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 opacity-80"
        style={{ backgroundColor: accentColor }}
      />
      
      <div className="flex-1">
        <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">
          {title}
        </p>
        <p className="font-headline text-4xl font-bold tracking-tight mb-2" style={{ color: accentColor }}>
          {value}
        </p>
        {subtitle && (
          <p className="font-body text-xs text-on-surface-variant/70">{subtitle}</p>
        )}
        
        {trend && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/10">
            <span
              className={cn(
                'text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase tracking-widest',
                trend.value > 0 ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary',
              )}
            >
              {trend.value > 0 ? '▲' : '▼'} {Math.abs(trend.value)}%
            </span>
            <span className="text-[10px] uppercase font-label tracking-wide text-on-surface-variant/50">{trend.label}</span>
          </div>
        )}
      </div>

      <div
        className="p-3 rounded-xl border border-outline-variant/20 shadow-inner"
        style={{ backgroundColor: `${accentColor}10` }}
      >
        <Icon size={24} style={{ color: accentColor }} strokeWidth={1.5} />
      </div>
    </motion.div>
  );
}
