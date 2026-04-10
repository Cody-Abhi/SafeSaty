/**
 * CrisisGuard AI - Staff Dispatch Service
 * Manages staff availability, task assignment, and location-based dispatch.
 */

export type StaffRole = 'security' | 'medical' | 'engineering' | 'manager' | 'front_desk';
export type StaffStatus = 'available' | 'busy' | 'on_break' | 'off_duty' | 'dispatched';

export interface StaffMember {
  uid: string;
  displayName: string;
  role: StaffRole;
  status: StaffStatus;
  currentLocation?: {
    coordinates: { lat: number; lng: number };
    floor: number;
    zone: string;
  };
  assignedIncidents: string[];
  certifications: string[];
  shiftStart?: string;
  shiftEnd?: string;
  lastUpdated: string;
}

export interface DispatchTask {
  taskId: string;
  incidentId: string;
  staffUid: string;
  task: string;
  priority: 'immediate' | 'high' | 'normal';
  status: 'assigned' | 'en_route' | 'on_scene' | 'completed';
  assignedAt: string;
  completedAt?: string;
}

export class StaffDispatchService {
  private staff: Map<string, StaffMember> = new Map();
  private tasks: Map<string, DispatchTask> = new Map();

  /** Register a staff member */
  registerStaff(member: StaffMember): void {
    this.staff.set(member.uid, member);
  }

  /** Update staff status */
  updateStatus(uid: string, status: StaffStatus): boolean {
    const member = this.staff.get(uid);
    if (!member) return false;
    member.status = status;
    member.lastUpdated = new Date().toISOString();
    return true;
  }

  /** Update staff location */
  updateLocation(uid: string, location: StaffMember['currentLocation']): boolean {
    const member = this.staff.get(uid);
    if (!member) return false;
    member.currentLocation = location;
    member.lastUpdated = new Date().toISOString();
    return true;
  }

  /** Find optimal staff for an incident based on role, distance, and availability */
  findOptimalStaff(
    incidentType: string,
    incidentLocation: { floor: number; zone: string },
    count: number = 1,
  ): StaffMember[] {
    const requiredRoles = this.getRequiredRoles(incidentType);

    const candidates = Array.from(this.staff.values())
      .filter((s) => s.status === 'available')
      .filter((s) => requiredRoles.length === 0 || requiredRoles.includes(s.role))
      .sort((a, b) => {
        // Prioritize by floor proximity
        const aDist = a.currentLocation
          ? Math.abs(a.currentLocation.floor - incidentLocation.floor)
          : 100;
        const bDist = b.currentLocation
          ? Math.abs(b.currentLocation.floor - incidentLocation.floor)
          : 100;
        return aDist - bDist;
      });

    return candidates.slice(0, count);
  }

  /** Dispatch staff to an incident with a specific task */
  dispatch(staffUid: string, incidentId: string, task: string, priority: DispatchTask['priority'] = 'high'): DispatchTask | null {
    const member = this.staff.get(staffUid);
    if (!member) return null;

    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const dispatchTask: DispatchTask = {
      taskId,
      incidentId,
      staffUid,
      task,
      priority,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
    };

    member.status = 'dispatched';
    member.assignedIncidents.push(incidentId);
    member.lastUpdated = new Date().toISOString();

    this.tasks.set(taskId, dispatchTask);

    console.log(`[Dispatch] ${member.displayName} (${member.role}) dispatched to ${incidentId}: ${task}`);
    return dispatchTask;
  }

  /** Update task status */
  updateTaskStatus(taskId: string, status: DispatchTask['status']): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date().toISOString();
      // Free up staff
      const member = this.staff.get(task.staffUid);
      if (member) {
        member.assignedIncidents = member.assignedIncidents.filter((id) => id !== task.incidentId);
        if (member.assignedIncidents.length === 0) {
          member.status = 'available';
        }
        member.lastUpdated = new Date().toISOString();
      }
    }
    return true;
  }

  /** Get all on-duty staff */
  getOnDutyStaff(): StaffMember[] {
    return Array.from(this.staff.values()).filter(
      (s) => s.status !== 'off_duty',
    );
  }

  /** Get staff deployed to a specific incident */
  getIncidentStaff(incidentId: string): StaffMember[] {
    return Array.from(this.staff.values()).filter(
      (s) => s.assignedIncidents.includes(incidentId),
    );
  }

  /** Get dispatch metrics */
  getMetrics() {
    const all = Array.from(this.staff.values());
    return {
      total: all.length,
      available: all.filter((s) => s.status === 'available').length,
      dispatched: all.filter((s) => s.status === 'dispatched').length,
      onBreak: all.filter((s) => s.status === 'on_break').length,
      offDuty: all.filter((s) => s.status === 'off_duty').length,
      activeTasks: Array.from(this.tasks.values()).filter((t) => t.status !== 'completed').length,
    };
  }

  /** Get staff by role */
  getByRole(role: StaffRole): StaffMember[] {
    return Array.from(this.staff.values()).filter((s) => s.role === role);
  }

  private getRequiredRoles(incidentType: string): StaffRole[] {
    const map: Record<string, StaffRole[]> = {
      fire: ['security', 'engineering'],
      medical: ['medical'],
      security: ['security', 'manager'],
      natural_disaster: ['security', 'engineering', 'manager'],
      hazard: ['engineering', 'security'],
    };
    return map[incidentType] || [];
  }
}

export const staffDispatchService = new StaffDispatchService();
