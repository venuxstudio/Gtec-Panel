import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { BRANCHES, BranchId, Course, DurationUnit, StudentStatus } from '../types';

export type ProgressBand = 'green' | 'yellow' | 'orange' | 'red';

export interface DurationMetrics {
  elapsedDays: number;
  daysLeft: number;
  totalDays: number;
  progressPct: number;
  endDateStr: string;
  band: ProgressBand;
  statusLabel: string;
  isCompletedByDate: boolean;
}

export function durationToDays(value: number, unit: DurationUnit): number {
  const clean = Math.max(1, Math.round(value || 1));
  if (unit === 'days') return Math.min(1825, clean);
  if (unit === 'weeks') return Math.min(1825, clean * 7);
  return Math.min(1825, clean * 30);
}

export function calculateDurationMetrics(
  joiningDateStr: string,
  totalDurationDays: number,
  manualStatus?: StudentStatus
): DurationMetrics {
  const safeTotal = Math.max(1, totalDurationDays || 1);
  let joinDate: Date;
  try {
    joinDate = parseISO(joiningDateStr);
    if (Number.isNaN(joinDate.getTime())) {
      joinDate = new Date();
    }
  } catch {
    joinDate = new Date();
  }

  const today = new Date();
  const elapsedRaw = differenceInCalendarDays(today, joinDate);
  const elapsedDays = Math.max(0, Math.min(safeTotal, elapsedRaw));
  const daysLeft = manualStatus === 'completed' ? 0 : Math.max(0, safeTotal - Math.max(0, elapsedRaw));
  const progressPct =
    manualStatus === 'completed'
      ? 100
      : Math.min(100, Math.max(0, Math.round((elapsedDays / safeTotal) * 100)));

  const endDateStr = format(addDays(joinDate, safeTotal), 'yyyy-MM-dd');
  const isCompletedByDate = manualStatus === 'completed' || daysLeft === 0;

  let band: ProgressBand = 'green';
  let statusLabel = 'On Track';

  if (progressPct <= 50) {
    band = 'green';
    statusLabel = 'On Track';
  } else if (progressPct <= 70) {
    band = 'yellow';
    statusLabel = 'Midway';
  } else if (progressPct <= 90) {
    band = 'orange';
    statusLabel = 'Ending Soon';
  } else {
    band = 'red';
    statusLabel = isCompletedByDate ? 'Completed' : 'Final Days';
  }

  return {
    elapsedDays,
    daysLeft,
    totalDays: safeTotal,
    progressPct,
    endDateStr,
    band,
    statusLabel,
    isCompletedByDate,
  };
}

export function isBranchClassDay(branch: BranchId, date: Date): boolean {
  const dayIndex = date.getDay();
  return BRANCHES[branch].weekdayIndices.includes(dayIndex);
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return 'Not scheduled';
  try {
    const parsed = parseISO(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return format(parsed, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`gtec-mm-pin:${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function makeDocumentId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export const STANDARD_GTEC_COURSES: Array<
  Omit<Course, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
> = [
  {
    shortName: 'DCA',
    fullName: 'Diploma in Computer Applications',
    durationValue: 6,
    durationUnit: 'months',
    durationDays: 180,
    softwares: [
      { fullName: 'Microsoft Word', shortName: 'WORD' },
      { fullName: 'Microsoft Excel', shortName: 'EXCEL' },
      { fullName: 'Microsoft PowerPoint', shortName: 'PPT' },
      { fullName: 'Microsoft Access', shortName: 'ACCESS' },
      { fullName: 'Tally Prime', shortName: 'TALLY' },
      { fullName: 'Internet & Email Operations', shortName: 'WEB' },
    ],
  },
  {
    shortName: 'DTP',
    fullName: 'Diploma in Desktop Publishing & Graphic Design',
    durationValue: 4,
    durationUnit: 'months',
    durationDays: 120,
    softwares: [
      { fullName: 'Adobe Photoshop', shortName: 'PS' },
      { fullName: 'Adobe Illustrator', shortName: 'AI' },
      { fullName: 'CorelDRAW Graphics Suite', shortName: 'COREL' },
      { fullName: 'Adobe InDesign', shortName: 'ID' },
      { fullName: 'Adobe PageMaker', shortName: 'PM' },
      { fullName: 'Malayalam & ISM Typing', shortName: 'ISM' },
    ],
  },
  {
    shortName: 'PGDCA',
    fullName: 'Post Graduate Diploma in Computer Applications',
    durationValue: 12,
    durationUnit: 'months',
    durationDays: 360,
    softwares: [
      { fullName: 'Office Automation Suite', shortName: 'OFFICE' },
      { fullName: 'C & C++ Programming', shortName: 'C/C++' },
      { fullName: 'Python Programming', shortName: 'PY' },
      { fullName: 'SQL & Relational Databases', shortName: 'SQL' },
      { fullName: 'HTML, CSS & JavaScript', shortName: 'WEB' },
      { fullName: 'Tally Prime with GST', shortName: 'TALLY' },
    ],
  },
];
