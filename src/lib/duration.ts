import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { BRANCHES, BranchId, Course, DurationUnit, StudentStatus } from '../types';

export type ProgressBand = 'green' | 'yellow' | 'orange' | 'red';

export interface DurationMetrics {
  elapsedDays: number;
  daysLeft: number;
  totalDays: number;
  baseTotalDays: number;
  isExtended: boolean;
  progressPct: number;
  endDateStr: string;
  band: ProgressBand;
  statusLabel: string;
  isCompletedByDate: boolean;
  isDurationOver: boolean;
}

export interface ScheduleDurationOptions {
  branch: BranchId;
  branchSchedule?: string;
  studentClassDays?: string[];
}

export function durationToDays(value: number, unit: DurationUnit): number {
  const clean = Math.max(1, Math.round(value || 1));
  if (unit === 'days') return Math.min(1825, clean);
  if (unit === 'weeks') return Math.min(1825, clean * 7);
  return Math.min(1825, clean * 30);
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const VALID_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function parseScheduleDays(schedule?: string, fallbackDays: string[] = []): string[] {
  if (!schedule || !schedule.trim()) return fallbackDays;
  const tokens = schedule
    .split(/[,·/|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const matched = VALID_WEEKDAYS.filter((day) =>
    tokens.some((tok) => tok.toLowerCase().startsWith(day.toLowerCase()))
  );
  return matched.length > 0 ? [...matched] : fallbackDays;
}

export function formatScheduleDays(days: string[]): string {
  const ordered = VALID_WEEKDAYS.filter((d) => days.includes(d));
  return ordered.join(', ');
}

export function normalizeClassDays(days?: string[], fallback: string[] = []): string[] {
  if (!days || days.length === 0) return [...fallback];
  const ordered = VALID_WEEKDAYS.filter((d) => days.includes(d));
  return ordered.length > 0 ? [...ordered] : [...fallback];
}

export function getStudentScheduleDays(
  branch: BranchId,
  branchSchedule?: string,
  studentClassDays?: string[]
): string[] {
  const branchDays = parseScheduleDays(branchSchedule, BRANCHES[branch].days);
  return normalizeClassDays(studentClassDays, branchDays);
}

export function resolveEffectiveSchedule(params: {
  joiningDateStr: string;
  baseDurationDays: number;
  branch: BranchId;
  branchSchedule?: string;
  studentClassDays?: string[];
}): {
  effectiveTotalDays: number;
  endDateStr: string;
  isExtended: boolean;
  activeDays: string[];
  branchDays: string[];
} {
  const safeBase = Math.max(1, params.baseDurationDays || 1);
  let joinDate: Date;
  try {
    joinDate = parseISO(params.joiningDateStr);
    if (Number.isNaN(joinDate.getTime())) {
      joinDate = new Date();
    }
  } catch {
    joinDate = new Date();
  }

  const branchDays = parseScheduleDays(params.branchSchedule, BRANCHES[params.branch].days);
  const activeDays = normalizeClassDays(params.studentClassDays, branchDays);

  return {
    effectiveTotalDays: safeBase,
    endDateStr: format(addDays(joinDate, safeBase), 'yyyy-MM-dd'),
    isExtended: false,
    activeDays,
    branchDays,
  };
}

export function calculateDurationMetrics(
  joiningDateStr: string,
  totalDurationDays: number,
  manualStatus?: StudentStatus,
  _scheduleOptions?: ScheduleDurationOptions
): DurationMetrics {
  const safeBase = Math.max(1, totalDurationDays || 1);
  let joinDate: Date;
  try {
    joinDate = parseISO(joiningDateStr);
    if (Number.isNaN(joinDate.getTime())) {
      joinDate = new Date();
    }
  } catch {
    joinDate = new Date();
  }

  const effectiveTotal = safeBase;
  const endDateStr = format(addDays(joinDate, safeBase), 'yyyy-MM-dd');
  const isExtended = false;

  const today = new Date();
  const elapsedRaw = differenceInCalendarDays(today, joinDate);
  const elapsedDays = Math.max(0, Math.min(effectiveTotal, elapsedRaw));
  const daysLeft =
    manualStatus === 'completed' ? 0 : Math.max(0, effectiveTotal - Math.max(0, elapsedRaw));
  const progressPct =
    manualStatus === 'completed'
      ? 100
      : Math.min(100, Math.max(0, Math.round((elapsedDays / effectiveTotal) * 100)));

  const isCompletedByDate = manualStatus === 'completed';
  const isDurationOver = manualStatus !== 'completed' && daysLeft === 0;

  let band: ProgressBand = 'green';
  let statusLabel = 'On Track';

  if (manualStatus === 'completed') {
    band = 'red';
    statusLabel = 'Completed';
  } else if (progressPct <= 50) {
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
    statusLabel = daysLeft === 0 ? 'Duration Over' : 'Final Days';
  }

  return {
    elapsedDays,
    daysLeft,
    totalDays: effectiveTotal,
    baseTotalDays: safeBase,
    isExtended,
    progressPct,
    endDateStr,
    band,
    statusLabel,
    isCompletedByDate,
    isDurationOver,
  };
}

export function isBranchClassDay(
  branch: BranchId,
  date: Date,
  customSchedule?: string
): boolean {
  const dayIndex = date.getDay();
  const parsed = parseScheduleDays(customSchedule);
  if (parsed.length > 0) {
    return parsed.some((d) => WEEKDAY_TO_INDEX[d] === dayIndex);
  }
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

function sha256Fallback(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const utf8 = unescape(encodeURIComponent(ascii));
  const asciiBitLength = utf8.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = true;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  const padded = utf8 + '\x80';
  let padStr = padded;
  while ((padStr.length % 64) - 56) padStr += '\x00';
  for (let i = 0; i < padStr.length; i++) {
    const j = padStr.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.unshift((temp1 + temp2) | 0);
      hash.pop();
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export async function hashSecret(trainerId: string, secret: string): Promise<string> {
  const normalized = secret.trim();
  const payload = `gtec-trainer:${trainerId}:${normalized}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256Fallback(payload);
}

export function makeDocumentId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export async function fetchInChunks<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  chunkSize = 10
): Promise<R[]> {
  const results: R[] = [];
  const step = Math.max(1, chunkSize);
  for (let i = 0; i < items.length; i += step) {
    const slice = items.slice(i, i + step);
    const chunkResults = await Promise.all(slice.map(worker));
    results.push(...chunkResults);
  }
  return results;
}

export const RECOVERY_QUESTIONS = [
  'What is your favourite software tool?',
  'What is your birth year or lucky 4-digit number?',
  'What was the name of your first computer or school?',
  'What is your pet or favourite city name?',
  'Custom security phrase',
];

export const STANDARD_GTEC_COURSES: Array<
  Omit<Course, 'id' | 'trainerId' | 'createdAt' | 'updatedAt'>
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
