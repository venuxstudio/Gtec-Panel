import React, { useState } from 'react';
import { KeyRound, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TopBar } from './TopBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    hasPinConfigured,
    resendVerificationEmail,
    refreshUserStatus,
    saveQuickPin,
    logout,
  } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMessage, setPinMessage] = useState('');

  // Gate unverified email/password accounts before reading/writing Firestore
  if (user && !user.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090B0E] p-4">
        <div className="glass-panel w-full max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Verify your email</h1>
          <p className="mt-2 text-sm text-zinc-400">
            We sent a verification link to <span className="text-zinc-200">{user.email}</span>.
            Click the link in your inbox, then tap the button below to enter G-TEC MM Panel.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                try {
                  await refreshUserStatus();
                } finally {
                  setChecking(false);
                }
              }}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : "I've verified my email"}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                setResent(true);
              }}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
            >
              {resent ? 'Verification email resent' : 'Resend verification email'}
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2 text-xs text-zinc-400 hover:text-white"
            >
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pinInput)) {
      setPinMessage('Enter a 6-digit numeric code.');
      return;
    }
    setPinBusy(true);
    setPinMessage('');
    try {
      await saveQuickPin(pinInput);
      setPinInput('');
      setShowPinSetup(false);
    } catch (err) {
      setPinMessage(err instanceof Error ? err.message : 'Unable to save PIN');
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#F4F5F7] flex flex-col">
      <TopBar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-white/[0.06] bg-[#090B0E]">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 text-xs text-zinc-500 sm:px-6 lg:px-8">
          <span>G-TEC MM Panel · Mavelikara &amp; Kayamkulam</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowPinSetup(true)}
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              {hasPinConfigured ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Update 6-Digit Quick Re-Login Code</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Set 6-Digit Quick Re-Login Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      {showPinSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-white">6-Digit Quick Re-Login Code</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Use this 6-digit code to lock and quickly re-enter your panel without typing your full password.
            </p>
            <form onSubmit={handleSavePin} className="mt-5 space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white placeholder-zinc-600 focus:border-white/40 focus:outline-none"
              />
              {pinMessage && <p className="text-xs text-red-400">{pinMessage}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinSetup(false);
                    setPinMessage('');
                  }}
                  className="min-h-[40px] rounded-xl border border-white/12 px-4 text-xs font-medium text-zinc-300 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinBusy}
                  className="min-h-[40px] rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {pinBusy ? 'Saving...' : 'Save Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
