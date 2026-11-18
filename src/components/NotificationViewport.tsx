import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Sparkles, X } from 'lucide-react';
import {
  AppNotification,
  NotificationTone,
  useNotify,
} from '../context/NotificationContext';

const TONE_STYLES: Record<
  NotificationTone,
  {
    card: string;
    iconBox: string;
    title: string;
    bar: string;
  }
> = {
  success: {
    card: 'border-emerald-400/50 bg-[#0B1412]/95 shadow-[0_0_32px_-4px_rgba(16,185,129,0.5),0_20px_48px_-14px_rgba(0,0,0,0.92)]',
    iconBox: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300',
    title: 'text-emerald-300',
    bar: 'bg-emerald-400',
  },
  info: {
    card: 'border-sky-400/50 bg-[#0B111A]/95 shadow-[0_0_32px_-4px_rgba(56,189,248,0.45),0_20px_48px_-14px_rgba(0,0,0,0.92)]',
    iconBox: 'border-sky-400/40 bg-sky-500/20 text-sky-300',
    title: 'text-sky-300',
    bar: 'bg-sky-400',
  },
  warning: {
    card: 'border-amber-400/50 bg-[#15110A]/95 shadow-[0_0_32px_-4px_rgba(251,191,36,0.45),0_20px_48px_-14px_rgba(0,0,0,0.92)]',
    iconBox: 'border-amber-400/40 bg-amber-500/20 text-amber-300',
    title: 'text-amber-300',
    bar: 'bg-amber-400',
  },
  error: {
    card: 'border-red-400/55 bg-[#170C0E]/95 shadow-[0_0_32px_-4px_rgba(248,113,113,0.5),0_20px_48px_-14px_rgba(0,0,0,0.92)]',
    iconBox: 'border-red-400/40 bg-red-500/20 text-red-300',
    title: 'text-red-300',
    bar: 'bg-red-400',
  },
};

function NotificationCard({
  item,
  onDismiss,
}: {
  item: AppNotification;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const style = TONE_STYLES[item.tone];

  useEffect(() => {
    if (paused || item.durationMs <= 0) return;
    const timer = window.setTimeout(() => {
      onDismiss(item.id);
    }, item.durationMs);
    return () => window.clearTimeout(timer);
  }, [item.id, item.durationMs, paused, onDismiss]);

  const Icon =
    item.tone === 'success'
      ? CheckCircle2
      : item.tone === 'error'
      ? AlertTriangle
      : item.tone === 'warning'
      ? Sparkles
      : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`glow-notify-card pointer-events-auto relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl ${style.card}`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${style.iconBox}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className={`font-display text-xs font-bold tracking-wider uppercase ${style.title}`}>
            {item.title}
          </p>
          {item.message && (
            <p className="mt-0.5 text-xs leading-snug text-zinc-200">{item.message}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label={`Close ${item.title} notification`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.12] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className={`h-full rounded-full ${style.bar} ${paused ? 'opacity-60' : 'opacity-90'}`}
            style={{
              animation:
                item.durationMs > 0
                  ? `notifyProgress ${item.durationMs}ms linear forwards`
                  : undefined,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors whitespace-nowrap"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function NotificationViewport() {
  const { notifications, dismiss } = useNotify();

  if (notifications.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
    >
      {notifications.map((item) => (
        <NotificationCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}
