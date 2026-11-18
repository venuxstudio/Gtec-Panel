import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  KeyRound,
  Save,
  Trash2,
} from 'lucide-react';
import { BranchSchedulePicker } from '../components/BranchSchedulePicker';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotify } from '../context/NotificationContext';
import { formatReadableDate } from '../lib/duration';
import { BranchId } from '../types';

export function TrainerDashboardPage() {
  const {
    activeTrainer,
    updateTrainerProfile,
    markDashboardConfigured,
    changeTrainerPasskey,
    deleteTrainerAccount,
  } = useAuth();
  const { students, courses } = useData();
  const { notify } = useNotify();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [branches, setBranches] = useState<BranchId[]>(['MAVELIKARA']);
  const [mavelikaraDays, setMavelikaraDays] = useState('Tue, Thu, Fri');
  const [kayamkulamDays, setKayamkulamDays] = useState('Mon, Wed, Sat');
  const [softwaresText, setSoftwaresText] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  const [currentPasskey, setCurrentPasskey] = useState('');
  const [newPasskey, setNewPasskey] = useState('');
  const [passkeyNotice, setPasskeyNotice] = useState('');
  const [passkeyError, setPasskeyError] = useState('');

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeTrainer) {
      setName(activeTrainer.name);
      setDesignation(activeTrainer.designation);
      setBranches(
        activeTrainer.branches.length > 0 ? activeTrainer.branches : ['MAVELIKARA']
      );
      setMavelikaraDays(activeTrainer.branchSchedules.MAVELIKARA || 'Tue, Thu, Fri');
      setKayamkulamDays(activeTrainer.branchSchedules.KAYAMKULAM || 'Mon, Wed, Sat');
      setSoftwaresText(activeTrainer.softwares.join(', '));
    }
  }, [activeTrainer]);

  if (!activeTrainer) return null;

  const ongoingCount = students.filter((s) => s.status === 'ongoing').length;
  const completedCount = students.filter((s) => s.status === 'completed').length;
  const upcomingExams = students
    .filter((s) => Boolean(s.examDate))
    .sort((a, b) => a.examDate.localeCompare(b.examDate))
    .slice(0, 5);

  const toggleBranch = (id: BranchId) => {
    setBranches((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((b) => b !== id);
      }
      return [...prev, id];
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !designation.trim()) {
      notify({
        title: 'VALIDATION ERROR',
        message: 'Trainer Name and Designation cannot be empty.',
        tone: 'error',
      });
      return;
    }
    setSaving(true);
    setSavedNotice('');
    try {
      const softwares = softwaresText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateTrainerProfile(activeTrainer.id, {
        name,
        designation,
        branches,
        branchSchedules: {
          MAVELIKARA: mavelikaraDays,
          KAYAMKULAM: kayamkulamDays,
        },
        softwares,
        dashboardConfigured: true,
      });
      setSavedNotice('Dashboard profile saved.');
      notify({
        title: 'DASHBOARD SAVED',
        message: `Updated profile for ${name.trim()}.`,
        tone: 'success',
      });
      setTimeout(() => setSavedNotice(''), 1800);
    } catch (err) {
      notify({
        title: 'SAVE FAILED',
        message: err instanceof Error ? err.message : 'Could not update dashboard details.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnterBranches = async () => {
    try {
      await markDashboardConfigured(activeTrainer.id);
      navigate('/branches');
    } catch (err) {
      notify({
        title: 'UNABLE TO OPEN BRANCHES',
        message: err instanceof Error ? err.message : 'Please try again.',
        tone: 'error',
      });
    }
  };

  const handlePasskeyChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyNotice('');
    setPasskeyError('');
    try {
      const res = await changeTrainerPasskey(
        activeTrainer.id,
        currentPasskey,
        newPasskey
      );
      if (!res.ok) {
        setPasskeyError(res.error || 'Unable to update passkey.');
      } else {
        setCurrentPasskey('');
        setNewPasskey('');
        setPasskeyNotice('Passkey updated.');
        notify({
          title: 'PASSKEY UPDATED',
          message: 'Your login passkey has been updated.',
          tone: 'success',
        });
        setTimeout(() => setPasskeyNotice(''), 1800);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update passkey.';
      setPasskeyError(message);
      notify({
        title: 'PASSKEY UPDATE FAILED',
        message,
        tone: 'error',
      });
    }
  };

  const handleDeleteTrainer = async () => {
    setDeleting(true);
    try {
      const removedName = activeTrainer.name;
      await deleteTrainerAccount(activeTrainer.id);
      notify({
        title: 'TRAINER REMOVED',
        message: `${removedName} and linked records removed.`,
        tone: 'warning',
      });
      navigate('/');
    } catch (err) {
      notify({
        title: 'DELETE FAILED',
        message: err instanceof Error ? err.message : 'Unable to delete trainer profile.',
        tone: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-400">Trainer Dashboard</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {activeTrainer.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {activeTrainer.designation} ·{' '}
            {!activeTrainer.dashboardConfigured
              ? 'Review your setup below, then proceed to your Branch Workspace.'
              : 'Summary of your students, attendance logs, courses, and profile settings.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleEnterBranches}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap self-start sm:self-auto"
        >
          <span>Continue to Branches</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-panel rounded-2xl p-5">
          <span className="text-xs text-zinc-400">Number of Students</span>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-white tabular-nums">
            {students.length}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <span className="text-xs text-zinc-400">Ongoing</span>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
            {ongoingCount}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <span className="text-xs text-zinc-400">Completed</span>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-zinc-200 tabular-nums">
            {completedCount}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <span className="text-xs text-zinc-400">Attendance Logs</span>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-white tabular-nums">
            {activeTrainer.attendanceCount || 0}
          </p>
        </div>
      </div>

      {/* Profile Editor & Upcoming Exams */}
      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSaveProfile}
          className="glass-panel rounded-3xl p-6 space-y-5 lg:col-span-7"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="text-base font-semibold text-white">
              Trainer Details &amp; Branches
            </h2>
            <span className="font-mono text-xs text-zinc-500">
              {courses.length} Courses Created
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Trainer Name
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Designation
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-white/35 focus:outline-none"
              />
            </div>
          </div>

          <BranchSchedulePicker
            selectedBranches={branches}
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

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Softwares Handled (Comma separated)
            </label>
            <input
              type="text"
              value={softwaresText}
              onChange={(e) => setSoftwaresText(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-xs uppercase text-white focus:border-white/35 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-emerald-400">{savedNotice}</span>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-white px-5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Dashboard Details'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Upcoming Exams + Security Passkey */}
        <div className="space-y-6 lg:col-span-5">
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              <span>Upcoming Exam Dates</span>
            </h2>
            {upcomingExams.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-400">
                No exam dates scheduled yet. Add an exam date inside any student profile.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {upcomingExams.map((s) => (
                  <Link
                    key={s.id}
                    to={`/student/${s.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/30 px-3.5 py-2.5 text-xs hover:border-white/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{s.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {s.branch} · {s.course1Short}
                      </p>
                    </div>
                    <span className="font-mono text-emerald-400 shrink-0">
                      {formatReadableDate(s.examDate)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="glass-panel rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <KeyRound className="h-4 w-4 text-emerald-400" />
              <span>Update Passkey</span>
            </h2>
            <form onSubmit={handlePasskeyChange} className="mt-4 space-y-3">
              <input
                type="password"
                required
                value={currentPasskey}
                onChange={(e) => setCurrentPasskey(e.target.value)}
                placeholder="Current passkey"
                className="min-h-[40px] w-full rounded-xl border border-white/12 bg-black/35 px-3 font-mono text-xs text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={4}
                value={newPasskey}
                onChange={(e) => setNewPasskey(e.target.value)}
                placeholder="New passkey (min 4 chars)"
                className="min-h-[40px] w-full rounded-xl border border-white/12 bg-black/35 px-3 font-mono text-xs text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
              />
              {passkeyError && <p className="text-xs text-red-400">{passkeyError}</p>}
              {passkeyNotice && <p className="text-xs text-emerald-400">{passkeyNotice}</p>}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Trainer ID</span>
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] rounded-xl border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/[0.12]"
                >
                  Change Passkey
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Remove Trainer Profile?"
        description={`This deletes the trainer card for ${activeTrainer.name} from the home page.`}
        confirmLabel="Remove Trainer"
        busy={deleting}
        onConfirm={handleDeleteTrainer}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
