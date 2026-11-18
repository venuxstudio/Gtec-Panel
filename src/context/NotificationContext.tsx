import React, { createContext, useCallback, useContext, useState } from 'react';

export type NotificationTone = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message?: string;
  tone: NotificationTone;
  durationMs: number;
}

export interface NotifyOptions {
  title: string;
  message?: string;
  tone?: NotificationTone;
  durationMs?: number;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  notify: (options: NotifyOptions) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const DEFAULT_DURATION_BY_TONE: Record<NotificationTone, number> = {
  success: 1800,
  info: 1800,
  warning: 2400,
  error: 3200,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const notify = useCallback(
    ({ title, message, tone = 'success', durationMs }: NotifyOptions): string => {
      const id = `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const entry: AppNotification = {
        id,
        title,
        message,
        tone,
        durationMs: durationMs ?? DEFAULT_DURATION_BY_TONE[tone],
      };
      setNotifications((prev) => [entry, ...prev].slice(0, 3));
      return id;
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ notifications, notify, dismiss, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used inside NotificationProvider');
  return ctx;
}
