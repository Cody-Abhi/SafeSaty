/**
 * CrisisGuard AI - Staff Store (Zustand)
 * Global state for staff deployment tracking.
 */

import { create } from 'zustand';

export interface StaffMember {
  uid: string;
  displayName: string;
  role: 'security' | 'medical' | 'maintenance' | 'front_desk' | 'housekeeping';
  status: 'available' | 'assigned' | 'en_route' | 'on_scene' | 'off_duty';
  zone: string;
  floor: number;
  location?: { lat: number; lng: number };
  currentTask?: string;
  certifications: string[];
  lastSeen: string;
}

interface StaffState {
  staff: StaffMember[];
  isLoading: boolean;

  setStaff: (staff: StaffMember[]) => void;
  updateStaffMember: (uid: string, updates: Partial<StaffMember>) => void;
  setLoading: (loading: boolean) => void;

  availableStaff: () => StaffMember[];
  staffByZone: (zone: string) => StaffMember[];
  staffByRole: (role: string) => StaffMember[];
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staff: [],
  isLoading: false,

  setStaff: (staff) => set({ staff }),

  updateStaffMember: (uid, updates) =>
    set((state) => ({
      staff: state.staff.map((s) =>
        s.uid === uid ? { ...s, ...updates } : s,
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  availableStaff: () =>
    get().staff.filter((s) => s.status === 'available'),

  staffByZone: (zone) =>
    get().staff.filter((s) => s.zone === zone),

  staffByRole: (role) =>
    get().staff.filter((s) => s.role === role),
}));
