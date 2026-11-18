import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { BranchSchedulePicker } from '../components/BranchSchedulePicker';
import { DarkSelect } from '../components/DarkSelect';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { RECOVERY_QUESTIONS } from '../lib/duration';
import { BranchId } from '../types';

export function AddTrainerPage() {
  const { createTrainer } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<BranchId[]>([
    'MAVELIKARA',
    'KAYAMKULAM',
  ]);
  const [mavelikaraDays, setMavelikaraDays] = useState('Tue, Thu, Fri');
  const [kayamkulamDays, setKayamkulamDays] = useState('Mon, Wed, Sat');
  const [softwaresText, setSoftwaresText] = useState('WORD, EXCEL, PPT, TALLY, PS, AI');
  const [passkey, setPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [recoveryPreset, setRecoveryPreset] = useState(RECOVERY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleBranch = (id: BranchId) => {
    setSelectedBranches((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // at least one branch required
        return prev.filter((b) => b !== id);
      }
      return [...prev, id];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !designation.trim()) {
      setErrorMsg('Please enter both Trainer Name and Designation.');
      return;
    }

    if (passkey.trim().length < 4) {
      setErrorMsg('Passkey must be at least 4 characters.');
      return;
    }
    if (passkey !== confirmPasskey) {
      setErrorMsg('Passkeys do not match.');
      return;
    }

    const finalQuestion =
      recoveryPreset === 'Custom security phrase' ? customQuestion.trim() : recoveryPreset;
    if (finalQuestion.length < 3) {
      setErrorMsg('Please enter a security recovery question.');
      return;
    }
    if (recoveryAnswer.trim().length < 1) {
      setErrorMsg('Please provide a recovery answer for passkey reset.');
      return;
    }

    const softwares = softwaresText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setBusy(true);
    try {
      await createTrainer({
        name,
        designation,
        branches: selectedBranches,
        branchSchedules: {
          MAVELIKARA: mavelikaraDays,
          KAYAMKULAM: kayamkulamDays,
        },
        softwares,
        passkey,
        recoveryQuestion: finalQuestion,
        recoveryAnswer,
      });
      notify({
        title: 'TRAINER ADDED',
        message: `${name.trim()} added. Click your card on the home page to log in with your passkey.`,
        tone: 'success',
      });
      // Show the newly created trainer card on the first page
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create trainer profile.';
      setErrorMsg(message);
      notify({
        title: 'TRAINER CREATION FAILED',
        message,
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B0E] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Trainer Home</span>
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Add Trainer ID
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create your trainer profile and passkey. Your data, courses, students, and reports stay linked to this trainer ID.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Trainer Name *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arun Kumar"
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Designation *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Software Faculty"
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
              />
            </div>
          </div>

          {/* Branch Selection (Single or Both) + Days (Mon-Sat) */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-300">
              Branches &amp; Class Days (Select single or both branches, then pick days) *
            </label>
            <BranchSchedulePicker
              selectedBranches={selectedBranches}
              branchSchedules={{
                MAVELIKARA: mavelikaraDays,
                KAYAMKULAM: kayamkulamDays,
              }}
              onToggleBranch={toggleBranch}
              onChangeSchedule={(branchId, nextSchedule) => {
                if (branchId === 'MAVELIKARA') setMavelikaraDays(nextSchedule);
                else setKayamkulamDays(nextSchedule);
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Softwares Handled (Comma separated)
            </label>
            <input
              type="text"
              value={softwaresText}
              onChange={(e) => setSoftwaresText(e.target.value)}
              placeholder="WORD, EXCEL, TALLY, PS, AI, PYTHON"
              className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-xs uppercase text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
            />
          </div>

          {/* Passkey & Passwordless Security Recovery */}
          <div className="space-y-4 border-t border-white/[0.08] pt-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Passkey (min 4 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Create quick login passkey"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Confirm Passkey *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={confirmPasskey}
                  onChange={(e) => setConfirmPasskey(e.target.value)}
                  placeholder="Re-enter passkey"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Forgot-Passkey Recovery Question *
                </label>
                <DarkSelect
                  value={recoveryPreset}
                  onChange={setRecoveryPreset}
                  ariaLabel="Recovery Question"
                  options={RECOVERY_QUESTIONS.map((q) => ({ value: q, label: q }))}
                />
                {recoveryPreset === 'Custom security phrase' && (
                  <input
                    type="text"
                    required
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Type your custom question"
                    className="mt-2 min-h-[40px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 text-xs text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Secret Recovery Answer *
                </label>
                <input
                  type="text"
                  required
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  placeholder="Used if you forget your passkey"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-5">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-white/12 px-4 text-sm font-medium text-zinc-300 hover:bg-white/[0.06]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              <span>{busy ? 'Saving Trainer...' : 'Add Trainer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
