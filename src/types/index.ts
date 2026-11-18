export type BranchId = 'MAVELIKARA' | 'KAYAMKULAM';

export interface BranchInfo {
  id: BranchId;
  name: string;
  scheduleLabel: string;
  days: string[];
  weekdayIndices: number[]; // 0=Sun, 1=Mon, ... 6=Sat
}

export const CLASS_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type ClassWeekday = (typeof CLASS_WEEKDAYS)[number];

export const BRANCHES: Record<BranchId, BranchInfo> = {
  MAVELIKARA: {
    id: 'MAVELIKARA',
    name: 'MAVELIKARA',
    scheduleLabel: 'Tue, Thu, Fri',
    days: ['Tue', 'Thu', 'Fri'],
    weekdayIndices: [2, 4, 5],
  },
  KAYAMKULAM: {
    id: 'KAYAMKULAM',
    name: 'KAYAMKULAM',
    scheduleLabel: 'Mon, Wed, Sat',
    days: ['Mon', 'Wed', 'Sat'],
    weekdayIndices: [1, 3, 6],
  },
};

export const BRANCH_LIST: BranchInfo[] = [BRANCHES.MAVELIKARA, BRANCHES.KAYAMKULAM];

export interface Trainer {
  id: string;
  name: string;
  designation: string;
  branches: BranchId[];
  branchSchedules: Partial<Record<BranchId, string>>;
  softwares: string[];
  ongoingCount: number;
  completedCount: number;
  attendanceCount: number;
  dashboardConfigured: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TrainerCredentials {
  trainerId: string;
  passkeyHash: string;
  recoveryQuestion: string;
  recoveryAnswerHash: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type DurationUnit = 'days' | 'weeks' | 'months';

export interface SoftwareItem {
  fullName: string;
  shortName: string;
}

export interface Course {
  id: string;
  trainerId: string;
  shortName: string;
  fullName: string;
  durationValue: number;
  durationUnit: DurationUnit;
  durationDays: number;
  softwares: SoftwareItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type StudentStatus = 'ongoing' | 'completed';

export interface Student {
  id: string;
  trainerId: string;
  regNo: string;
  name: string;
  branch: BranchId;
  course1Id: string;
  course1Short: string;
  course1Full: string;
  course1DurationDays: number;
  course2Id: string;
  course2Short: string;
  course2Full: string;
  course2DurationDays: number;
  totalDurationDays: number;
  joiningDate: string; // YYYY-MM-DD
  examDate: string; // YYYY-MM-DD or ''
  contact: string;
  completedSoftwares: string[]; // keys like "c1:PS" or "c2:PY"
  status: StudentStatus;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string; // YYYY-MM-DD
  trainerId: string;
  studentId: string;
  branch: BranchId;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  remark: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
