'use client';

import { useStaffStore, type StaffMember } from '@/stores/staffStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, HeartPulse, Wrench, UserCheck, Building2,
  MapPin, CheckCircle2, Truck, Eye, Clock,
} from 'lucide-react';

const roleIcons: Record<string, React.ReactNode> = {
  security: <Shield size={14} className="text-purple-400" />,
  medical: <HeartPulse size={14} className="text-red-400" />,
  maintenance: <Wrench size={14} className="text-amber-400" />,
  front_desk: <UserCheck size={14} className="text-blue-400" />,
  housekeeping: <Building2 size={14} className="text-green-400" />,
};

const statusIcons: Record<string, React.ReactNode> = {
  available: <CheckCircle2 size={12} className="text-green-400" />,
  assigned: <MapPin size={12} className="text-amber-400" />,
  en_route: <Truck size={12} className="text-blue-400" />,
  on_scene: <Eye size={12} className="text-red-400" />,
  off_duty: <Clock size={12} className="text-gray-500" />,
};

function StaffRow({ member }: { member: StaffMember }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex items-center gap-4 p-3 rounded-xl transition-all border border-outline-variant/10 mb-2',
        'bg-surface-container-highest/60 hover:bg-surface-variant cursor-pointer',
        member.status === 'off_duty' && 'opacity-40 hover:opacity-70',
      )}
    >
      {/* Role Icon */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center border border-outline-variant/10',
         member.role === 'security' ? 'bg-purple-500/10' :
         member.role === 'medical' ? 'bg-red-500/10' :
         member.role === 'maintenance' ? 'bg-amber-500/10' :
         member.role === 'front_desk' ? 'bg-blue-500/10' : 'bg-green-500/10'
      )}>
        {roleIcons[member.role] || <UserCheck size={18} className="text-on-surface-variant"/>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-headline text-sm font-bold truncate text-on-surface">{member.displayName}</p>
        <p className="font-body text-xs text-on-surface-variant/70 mt-0.5">
          {member.zone} · Floor {member.floor}
        </p>
      </div>

      {/* Status */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-primary/10 border border-outline-variant/20">
          {statusIcons[member.status]}
          <span className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant">
            {member.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function StaffDispatchPanel() {
  const staff = useStaffStore((s) => s.staff);

  const onDuty = staff.filter((s) => s.status !== 'off_duty');
  const offDuty = staff.filter((s) => s.status === 'off_duty');

  return (
    <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 h-full flex flex-col shadow-xl">
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-outline-variant/10">
        <h2 className="font-headline text-lg font-bold tracking-widest text-on-surface uppercase">
          Required Roles
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-label text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-widest">{onDuty.length} Active</span>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{offDuty.length} Off</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 mt-2 pr-2">
        <AnimatePresence>
          {staff.length === 0 ? (
            <p className="text-center font-body text-sm text-on-surface-variant py-8">
              No staff data
            </p>
          ) : (
            [...onDuty, ...offDuty].map((member) => (
              <StaffRow key={member.uid} member={member} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
