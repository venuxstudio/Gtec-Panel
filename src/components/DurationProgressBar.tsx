import { DurationMetrics } from '../lib/duration';

interface DurationProgressBarProps {
  metrics: DurationMetrics;
  compact?: boolean;
}

const BAND_STYLES = {
  green: {
    bar: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]',
    text: 'text-emerald-400',
  },
  yellow: {
    bar: 'bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]',
    text: 'text-yellow-400',
  },
  orange: {
    bar: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.55)]',
    text: 'text-orange-400',
  },
  red: {
    bar: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.55)]',
    text: 'text-red-400',
  },
};

export function DurationProgressBar({ metrics, compact = false }: DurationProgressBarProps) {
  const style = BAND_STYLES[metrics.band];
  const widthPct = Math.max(4, Math.min(100, metrics.progressPct));

  return (
    <div
      className={`rounded-xl border border-white/[0.07] bg-black/45 ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className={`font-medium whitespace-nowrap ${style.text}`}>
          {metrics.statusLabel}
        </span>
        <span className="font-mono text-[11px] text-zinc-300 tabular-nums whitespace-nowrap">
          {metrics.daysLeft > 0 ? `${metrics.daysLeft}d left` : '0d left'} · {metrics.progressPct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}
