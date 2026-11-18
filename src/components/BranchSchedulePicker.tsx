import { Check } from 'lucide-react';
import { formatScheduleDays, parseScheduleDays } from '../lib/duration';
import { BRANCH_LIST, BranchId, CLASS_WEEKDAYS } from '../types';

interface BranchSchedulePickerProps {
  selectedBranches: BranchId[];
  branchSchedules: Partial<Record<BranchId, string>>;
  onToggleBranch: (branchId: BranchId) => void;
  onChangeSchedule: (branchId: BranchId, nextSchedule: string) => void;
}

export function BranchSchedulePicker({
  selectedBranches,
  branchSchedules,
  onToggleBranch,
  onChangeSchedule,
}: BranchSchedulePickerProps) {
  const handleToggleDay = (branchId: BranchId, day: string, currentDays: string[]) => {
    const exists = currentDays.includes(day);
    if (exists && currentDays.length === 1) {
      return; // Keep at least one active day per selected branch
    }
    const nextDays = exists
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    onChangeSchedule(branchId, formatScheduleDays(nextDays));
  };

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {BRANCH_LIST.map((b) => {
        const active = selectedBranches.includes(b.id);
        const currentDays = parseScheduleDays(branchSchedules[b.id], b.days);

        return (
          <div
            key={b.id}
            className={`rounded-2xl border p-4 transition-colors ${
              active
                ? 'border-emerald-500/45 bg-emerald-500/[0.06]'
                : 'border-white/10 bg-black/30 opacity-65'
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleBranch(b.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <span className="block text-sm font-semibold text-white">{b.name}</span>
                <span className="block text-[11px] text-zinc-400">
                  {active ? 'Included in workspace' : 'Click to enable branch'}
                </span>
              </div>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  active
                    ? 'border-emerald-400 bg-emerald-500 text-zinc-950'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {active && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>

            <div className="mt-3.5 border-t border-white/[0.08] pt-3">
              <p className="mb-2 text-[11px] font-medium text-zinc-400">
                Select Class Days ({currentDays.length} selected)
              </p>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {CLASS_WEEKDAYS.map((day) => {
                  const selected = currentDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!active}
                      onClick={() => handleToggleDay(b.id, day, currentDays)}
                      aria-pressed={selected}
                      className={`min-h-[34px] rounded-lg border px-1.5 font-mono text-[11px] font-medium transition-colors ${
                        selected
                          ? 'border-emerald-400/60 bg-emerald-500 text-zinc-950 font-semibold'
                          : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/25 hover:text-white'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
