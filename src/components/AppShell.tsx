import React from 'react';
import { useAuth } from '../context/AuthContext';
import { TopBar } from './TopBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { activeTrainer } = useAuth();

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#F4F5F7] flex flex-col">
      <TopBar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-white/[0.06] bg-[#090B0E]">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 text-xs text-zinc-500 sm:px-6 lg:px-8">
          <span>G-TEC Trainer Panel · Mavelikara &amp; Kayamkulam</span>
          {activeTrainer && (
            <span>
              Trainer: <strong className="text-zinc-300">{activeTrainer.name}</strong> (
              {activeTrainer.designation})
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
