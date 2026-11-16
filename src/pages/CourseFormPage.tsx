import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useData } from '../context/DataContext';
import { durationToDays } from '../lib/duration';
import { DurationUnit, SoftwareItem } from '../types';

function createEmptySoftwares(count = 6): SoftwareItem[] {
  return Array.from({ length: count }, () => ({ fullName: '', shortName: '' }));
}

export function CourseFormPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { courses, addCourse, updateCourse, deleteCourse } = useData();

  const isEdit = Boolean(courseId);
  const editingCourse = useMemo(
    () => (courseId ? courses.find((c) => c.id === courseId) : undefined),
    [courseId, courses]
  );

  const [shortName, setShortName] = useState('');
  const [fullName, setFullName] = useState('');
  const [durationValue, setDurationValue] = useState<number>(6);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('months');
  const [softwares, setSoftwares] = useState<SoftwareItem[]>(() => createEmptySoftwares(6));

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (editingCourse) {
      setShortName(editingCourse.shortName);
      setFullName(editingCourse.fullName);
      setDurationValue(editingCourse.durationValue);
      setDurationUnit(editingCourse.durationUnit);
      const list = [...editingCourse.softwares];
      while (list.length < 6) {
        list.push({ fullName: '', shortName: '' });
      }
      setSoftwares(list);
    }
  }, [editingCourse]);

  const handleSoftwareChange = (
    index: number,
    field: 'fullName' | 'shortName',
    value: string
  ) => {
    setSoftwares((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddRow = () => {
    if (softwares.length >= 12) return;
    setSoftwares((prev) => [...prev, { fullName: '', shortName: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (softwares.length <= 1) return;
    setSoftwares((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDaysPreview = durationToDays(durationValue, durationUnit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const validSoftwares = softwares.filter(
      (s) => s.fullName.trim().length > 0 && s.shortName.trim().length > 0
    );
    if (validSoftwares.length === 0) {
      setErrorMsg('Please enter at least one software with both Full Name and Short Name.');
      return;
    }

    setBusy(true);
    try {
      if (isEdit && courseId) {
        await updateCourse(courseId, {
          shortName,
          fullName,
          durationValue,
          durationUnit,
          softwares: validSoftwares,
        });
      } else {
        await addCourse({
          shortName,
          fullName,
          durationValue,
          durationUnit,
          softwares: validSoftwares,
        });
      }
      navigate('/courses/manage');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save course.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!courseId) return;
    setDeleting(true);
    try {
      await deleteCourse(courseId);
      navigate('/courses/manage');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={isEdit ? '/courses/manage' : '/branches'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isEdit ? 'Back to Courses' : 'Back to Branches'}</span>
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {isEdit ? 'Edit Course' : 'Add New Course'}
          </h1>
        </div>

        {!isEdit && (
          <Link
            to="/courses/manage"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] whitespace-nowrap"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Course</span>
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Course (Short Name) *
            </label>
            <input
              type="text"
              required
              maxLength={30}
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. DCA"
              className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-sm uppercase text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Course Details (Full Form) *
            </label>
            <input
              type="text"
              required
              maxLength={160}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Diploma in Computer Applications"
              className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-300">
            Duration *
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={1}
              max={1825}
              required
              value={durationValue}
              onChange={(e) => setDurationValue(Number(e.target.value))}
              className="min-h-[44px] w-28 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-sm text-white focus:border-white/35 focus:outline-none"
            />
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
              className="min-h-[44px] rounded-xl border border-white/12 bg-[#12161D] px-3.5 text-sm text-white focus:border-white/35 focus:outline-none"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
            <span className="font-mono text-xs text-zinc-400">
              = {totalDaysPreview} calendar days
            </span>
          </div>
        </div>

        {/* Softwares Section: 6 paired Full Name + Short Name rows */}
        <div className="space-y-3 border-t border-white/[0.08] pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Softwares</h2>
              <p className="text-xs text-zinc-400">
                Enter Full Software Name and Short Name (short names appear inside student panels).
              </p>
            </div>
            {softwares.length < 12 && (
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-white/12 bg-white/[0.04] px-3 text-xs font-medium text-zinc-200 hover:bg-white/[0.09] whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {softwares.map((sw, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2.5">
                <span className="col-span-1 font-mono text-xs text-zinc-500 text-center">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <input
                  type="text"
                  maxLength={100}
                  value={sw.fullName}
                  onChange={(e) => handleSoftwareChange(idx, 'fullName', e.target.value)}
                  placeholder="Full software name (e.g. Adobe Photoshop)"
                  className="col-span-7 sm:col-span-7 min-h-[42px] rounded-xl border border-white/12 bg-white/[0.04] px-3 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
                <input
                  type="text"
                  maxLength={20}
                  value={sw.shortName}
                  onChange={(e) => handleSoftwareChange(idx, 'shortName', e.target.value)}
                  placeholder="Short (PS)"
                  className="col-span-3 sm:col-span-3 min-h-[42px] rounded-xl border border-white/12 bg-white/[0.04] px-3 font-mono text-xs uppercase text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRow(idx)}
                  disabled={softwares.length <= 1}
                  aria-label="Remove software row"
                  className="col-span-1 flex h-10 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
          {isEdit ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove Course</span>
            </button>
          ) : (
            <span className="text-xs text-zinc-500">
              Empty software rows are ignored on save.
            </span>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{busy ? 'Saving...' : 'Save Course'}</span>
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Remove Course?"
        description={`Removing ${shortName || 'this course'} will remove it from future course dropdowns. Existing student records will keep their saved course labels.`}
        confirmLabel="Remove Course"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
