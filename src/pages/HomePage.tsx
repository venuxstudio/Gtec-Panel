import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  KeyRound,
  Lock,
  RotateCcw,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { Trainer } from '../types';

export function HomePage() {
  const {
    trainers,
    trainersLoading,
    verifyAndLogin,
    getRecoveryQuestion,
    resetPasskeyWithRecovery,
  } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<'ALL' | 'MAVELIKARA' | 'KAYAMKULAM'>('ALL');

  // Passkey modal state
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [modalMode, setModalMode] = useState<'passkey' | 'recover'>('passkey');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPasskey, setNewPasskey] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredTrainers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trainers.filter((t) => {
      if (branchFilter !== 'ALL' && !t.branches.includes(branchFilter)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.designation.toLowerCase().includes(q) ||
        t.branches.some((b) => b.toLowerCase().includes(q)) ||
        t.softwares.some((sw) => sw.toLowerCase().includes(q))
      );
    });
  }, [trainers, searchQuery, branchFilter]);

  const openTrainerModal = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setModalMode('passkey');
    setPasskeyInput('');
    setRecoveryQuestion('');
    setRecoveryAnswer('');
    setNewPasskey('');
    setErrorMsg('');
  };

  const closeModal = () => {
    setSelectedTrainer(null);
    setErrorMsg('');
    setPasskeyInput('');
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;
    if (!passkeyInput.trim()) {
      setErrorMsg('Please enter your passkey.');
      return;
    }
    setErrorMsg('');
    setBusy(true);
    try {
      const res = await verifyAndLogin(selectedTrainer.id, passkeyInput);
      if (!res.ok) {
        setErrorMsg('Incorrect passkey. Try again or reset using your security question.');
        return;
      }
      const nextRoute = res.dashboardConfigured ? '/branches' : '/dashboard';
      const trainerName = selectedTrainer.name;
      closeModal();
      notify({
        title: 'TRAINER LOGGED IN',
        message: `Welcome back, ${trainerName}.`,
        tone: 'success',
      });
      navigate(nextRoute);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to verify passkey.';
      setErrorMsg('Could not verify passkey. Please check your connection and try again.');
      notify({
        title: 'LOGIN ERROR',
        message,
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const switchToRecovery = async () => {
    if (!selectedTrainer) return;
    setErrorMsg('');
    setBusy(true);
    try {
      const q = await getRecoveryQuestion(selectedTrainer.id);
      setRecoveryQuestion(q || 'Enter your saved security answer');
      setModalMode('recover');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load recovery question.';
      setErrorMsg('Could not load security question. Please try again.');
      notify({
        title: 'RECOVERY ERROR',
        message,
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;
    setErrorMsg('');
    setBusy(true);
    try {
      const res = await resetPasskeyWithRecovery(
        selectedTrainer.id,
        recoveryAnswer,
        newPasskey
      );
      if (!res.ok) {
        setErrorMsg(res.error || 'Unable to reset passkey.');
        return;
      }
      const nextRoute = res.dashboardConfigured ? '/branches' : '/dashboard';
      const trainerName = selectedTrainer.name;
      closeModal();
      notify({
        title: 'PASSKEY RESET & LOGGED IN',
        message: `New passkey saved for ${trainerName}.`,
        tone: 'success',
      });
      navigate(nextRoute);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reset passkey.';
      setErrorMsg('Could not reset passkey. Please try again.');
      notify({
        title: 'RESET ERROR',
        message,
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090B0E] text-[#F4F5F7] flex flex-col">
      {/* Lightweight Animated Obsidian Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <img
          src="/src/assets/images/auth_glass_backdrop_1794804454859.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090B0E]/80 via-[#090B0E]/85 to-[#090B0E]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="animate-orb-slow absolute -top-28 left-[12%] h-80 w-80 rounded-full bg-emerald-500/[0.10] blur-[110px]" />
        <div className="animate-orb-reverse absolute bottom-[-80px] right-[10%] h-96 w-96 rounded-full bg-sky-500/[0.07] blur-[130px]" />
      </div>

      {/* Home Top Bar */}
      <header className="relative z-20 border-b border-white/[0.08] bg-[#090B0E]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] text-emerald-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 7l8-4 8 4-8 4-8-4z" />
                <path d="M4 12l8 4 8-4" />
                <path d="M4 17l8 4 8-4" />
              </svg>
            </span>
            <span>G-TEC Trainer Panel</span>
          </div>

          <div className="flex w-full items-center gap-2.5 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trainers, softwares..."
                aria-label="Search trainers"
                className="min-h-[40px] w-full rounded-xl border border-white/12 bg-white/[0.04] pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
              />
            </div>

            <Link
              to="/trainer/new"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Trainer</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-400">Trainer Profiles</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white [text-wrap:balance]">
              Select Your Trainer Workspace
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Click your trainer card and enter your passkey to access branches, student batches, courses, and attendance.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 self-start sm:self-auto">
            {(['ALL', 'MAVELIKARA', 'KAYAMKULAM'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBranchFilter(b)}
                className={`min-h-[34px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  branchFilter === b
                    ? 'bg-white text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {b === 'ALL' ? 'All Branches' : b}
              </button>
            ))}
          </div>
        </div>

        {/* Uniform Size Trainer Cards Grid */}
        <div className="mt-7">
          {trainersLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass-panel h-[248px] animate-pulse rounded-2xl p-6"
                />
              ))}
            </div>
          ) : filteredTrainers.length === 0 ? (
            <div className="glass-panel mx-auto max-w-xl rounded-3xl p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {trainers.length === 0
                  ? 'No trainer profiles created yet'
                  : 'No trainers match your search'}
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                {trainers.length === 0
                  ? 'Create your trainer ID with your designation, branches, softwares, and a quick passkey to begin.'
                  : 'Try clearing the search input or switching the branch filter.'}
              </p>
              {trainers.length === 0 && (
                <Link
                  to="/trainer/new"
                  className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add First Trainer</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTrainers.map((trainer) => (
                  <button
                    key={trainer.id}
                    type="button"
                    onClick={() => openTrainerModal(trainer)}
                    className="glass-panel glass-panel-hover group flex h-[248px] flex-col justify-between rounded-2xl p-6 text-left"
                  >
                    <div className="w-full min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-semibold text-white">
                            {trainer.name}
                          </h2>
                          <p className="mt-0.5 truncate text-xs font-medium text-emerald-400">
                            {trainer.designation}
                          </p>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors group-hover:border-emerald-400/40 group-hover:bg-emerald-500/15 group-hover:text-emerald-300">
                          <Lock className="h-4 w-4" />
                        </span>
                      </div>

                      <p className="mt-3 truncate font-mono text-[11px] text-zinc-400">
                        {trainer.branches
                          .map((b) => {
                            const days = trainer.branchSchedules?.[b];
                            return days ? `${b} (${days})` : b;
                          })
                          .join(' · ')}
                      </p>

                      <div className="mt-3">
                        <p className="text-[11px] text-zinc-500">Softwares</p>
                        <p className="mt-1 line-clamp-2 font-mono text-xs text-zinc-300">
                          {trainer.softwares.length > 0
                            ? trainer.softwares.join(' · ')
                            : 'General Courses'}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between border-t border-white/[0.08] pt-3.5 text-xs">
                      <div className="flex items-center gap-3 tabular-nums">
                        <span className="text-zinc-400">
                          Ongoing:{' '}
                          <strong className="font-mono text-emerald-400">
                            {trainer.ongoingCount}
                          </strong>
                        </span>
                        <span className="text-zinc-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-zinc-400">
                          Completed:{' '}
                          <strong className="font-mono text-zinc-200">
                            {trainer.completedCount}
                          </strong>
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Action bar below trainer cards */}
              <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-4 sm:flex-row">
                <p className="text-xs text-zinc-400 text-center sm:text-left">
                  Select your trainer card above and enter your passkey to log in, or register another trainer profile.
                </p>
                <Link
                  to="/trainer/new"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Trainer</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] bg-[#090B0E]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 text-xs text-zinc-500 sm:px-6 lg:px-8">
          <span>G-TEC Trainer Panel · Mavelikara &amp; Kayamkulam</span>
          <span className="font-mono tabular-nums">{trainers.length} Trainers</span>
        </div>
      </footer>

      {/* Passkey Verification & Recovery Modal */}
      {selectedTrainer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-[410px] rounded-[28px] border border-white/12 bg-gradient-to-b from-[#131824]/95 to-[#0B0E17]/95 p-7 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.95)]">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close passkey prompt"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-emerald-400">
              {modalMode === 'passkey' ? (
                <KeyRound className="h-7 w-7" />
              ) : (
                <RotateCcw className="h-7 w-7" />
              )}
            </div>

            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">{selectedTrainer.name}</h2>
              <p className="mt-0.5 text-xs text-emerald-400">{selectedTrainer.designation}</p>
            </div>

            {modalMode === 'passkey' ? (
              <form onSubmit={handleUnlock} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Enter Trainer Passkey
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    placeholder="Enter your passkey"
                    className="min-h-[46px] w-full rounded-xl border border-white/15 bg-black/45 px-4 text-center font-mono text-base tracking-widest text-white placeholder-zinc-600 focus:border-white/40 focus:outline-none"
                  />
                </div>

                {errorMsg && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  <span>{busy ? 'Verifying...' : 'Log In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={switchToRecovery}
                  className="w-full py-1 text-center text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Forgot passkey? Reset with security answer
                </button>
              </form>
            ) : (
              <form onSubmit={handleRecoverSubmit} className="mt-6 space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-xs">
                  <span className="block text-zinc-500">Security Question</span>
                  <span className="mt-0.5 block font-medium text-zinc-200">
                    {recoveryQuestion}
                  </span>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Security Answer
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    placeholder="Your saved answer"
                    className="min-h-[42px] w-full rounded-xl border border-white/15 bg-black/45 px-3.5 text-sm text-white placeholder-zinc-600 focus:border-white/40 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    New Passkey (min 4 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPasskey}
                    onChange={(e) => setNewPasskey(e.target.value)}
                    placeholder="Set new passkey"
                    className="min-h-[42px] w-full rounded-xl border border-white/15 bg-black/45 px-3.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-white/40 focus:outline-none"
                  />
                </div>

                {errorMsg && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  <span>{busy ? 'Resetting...' : 'Reset Passkey & Enter'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setModalMode('passkey');
                  }}
                  className="w-full py-1 text-center text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Back to passkey entry
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
