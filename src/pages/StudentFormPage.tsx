import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, Edit3, RotateCcw, Save, Trash2, UserPlus } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DarkSelect } from '../components/DarkSelect';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotify } from '../context/NotificationContext';
import {
  formatReadableDate,
  getStudentScheduleDays,
  resolveEffectiveSchedule,
} from '../lib/duration';
import { BRANCHES, BRANCH_LIST, BranchId, CLASS_WEEKDAYS, StudentStatus } from '../types';

export function StudentFormPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeTrainer } = useAuth();
  const { courses, students, addStudent, updateStudent, deleteStudent } = useData();
  const { notify } = useNotify();

  const isEdit = Boolean(studentId);
  const editingStudent = useMemo(
    () => (studentId ? students.find((s) => s.id === studentId) : undefined),
    [studentId, students]
  );

  const defaultBranch = (
    searchParams.get('branch')?.toUpperCase() === 'KAYAMKULAM'
      ? 'KAYAMKULAM'
      : activeTrainer?.branches?.[0] || 'MAVELIKARA'
  ) as BranchId;

  const [regNo, setRegNo] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState<BranchId>(defaultBranch);
  const [classDays, setClassDays] = useState<string[]>(() =>
    getStudentScheduleDays(defaultBranch, activeTrainer?.branchSchedules?.[defaultBranch])
  );
  const [daysCustomized, setDaysCustomized] = useState(false);
  const [course1Id, setCourse1Id] = useState('');
  const [course2Id, setCourse2Id] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [examDate, setExamDate] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<StudentStatus>('ongoing');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (editingStudent) {
      setRegNo(editingStudent.regNo || '');
      setName(editingStudent.name);
      setBranch(editingStudent.branch);
      setClassDays(
        getStudentScheduleDays(
          editingStudent.branch,
          activeTrainer?.branchSchedules?.[editingStudent.branch],
          editingStudent.classDays
        )
      );
      setDaysCustomized(Boolean(editingStudent.classDays && editingStudent.classDays.length > 0));
      setCourse1Id(editingStudent.course1Id);
      setCourse2Id(editingStudent.course2Id || '');
      setJoiningDate(editingStudent.joiningDate);
      setExamDate(editingStudent.examDate || '');
      setContact(editingStudent.contact);
      setNotes(editingStudent.notes || '');
      setStatus(editingStudent.status);
    } else if (!course1Id && courses.length > 0) {
      setCourse1Id(courses[0].id);
    }
  }, [editingStudent, courses, course1Id, activeTrainer]);

  const selectedCourse1 = courses.find((c) => c.id === course1Id);
  const selectedCourse2 =
    course2Id && course2Id !== course1Id
      ? courses.find((c) => c.id === course2Id)
      : undefined;

  const computedTotalDays = Math.max(
    selectedCourse1?.durationDays || 0,
    selectedCourse2?.durationDays || 0
  );

  const branchScheduleLabel =
    activeTrainer?.branchSchedules?.[branch] || BRANCHES[branch].scheduleLabel;

  const schedulePreview = useMemo(() => {
    if (!joiningDate || computedTotalDays <= 0) return null;
    return resolveEffectiveSchedule({
      joiningDateStr: joiningDate,
      baseDurationDays: computedTotalDays,
      branch,
      branchSchedule: branchScheduleLabel,
      studentClassDays: classDays,
    });
  }, [joiningDate, computedTotalDays, branch, branchScheduleLabel, classDays]);

  const handleBranchChange = (nextVal: string) => {
    const nextBranch = nextVal as BranchId;
    setBranch(nextBranch);
    if (!isEdit && !daysCustomized) {
      setClassDays(
        getStudentScheduleDays(nextBranch, activeTrainer?.branchSchedules?.[nextBranch])
      );
    }
  };

  const toggleClassDay = (day: string) => {
    setDaysCustomized(true);
    setClassDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return CLASS_WEEKDAYS.filter((d) => d === day || prev.includes(d));
    });
  };

  const resetToBranchDays = () => {
    setDaysCustomized(false);
    setClassDays(getStudentScheduleDays(branch, activeTrainer?.branchSchedules?.[branch]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter the student name.');
      return;
    }
    if (contact.trim().length < 5) {
      setErrorMsg('Please enter a valid contact number (min 5 characters).');
      return;
    }
    if (!course1Id || !courses.some((c) => c.id === course1Id)) {
      setErrorMsg('Please select a valid Course from your catalog.');
      return;
    }
    if (classDays.length === 0) {
      setErrorMsg('Please select at least one weekly attendance day.');
      return;
    }

    setBusy(true);
    try {
      if (isEdit && studentId) {
        await updateStudent(studentId, {
          regNo,
          name,
          branch,
          classDays,
          course1Id,
          course2Id: course2Id === course1Id ? '' : course2Id,
          joiningDate,
          examDate,
          contact,
          notes,
          status,
        });
        notify({
          title: 'STUDENT UPDATED',
          message: `${name.trim()} (${branch}) record saved.`,
          tone: 'success',
        });
        navigate(`/student/${studentId}`);
      } else {
        await addStudent({
          regNo,
          name,
          branch,
          classDays,
          course1Id,
          course2Id: course2Id === course1Id ? '' : course2Id,
          joiningDate,
          examDate,
          contact,
          notes,
          status: 'ongoing',
        });
        notify({
          title: 'STUDENT ADDED',
          message: `${name.trim()} enrolled in ${branch}${selectedCourse1 ? ` · ${selectedCourse1.shortName}` : ''}.`,
          tone: 'success',
        });
        navigate(`/branch/${branch}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save student.';
      setErrorMsg(message);
      notify({
        title: 'SAVE FAILED',
        message,
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!studentId) return;
    setDeleting(true);
    try {
      const removedName = name || 'Student';
      await deleteStudent(studentId);
      notify({
        title: 'STUDENT REMOVED',
        message: `${removedName} and linked attendance logs removed.`,
        tone: 'warning',
      });
      navigate('/students/manage');
    } catch (err) {
      notify({
        title: 'REMOVE FAILED',
        message: err instanceof Error ? err.message : 'Unable to remove student.',
        tone: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={isEdit ? '/students/manage' : '/branches'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isEdit ? 'Back to Students' : 'Back to Branches'}</span>
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {isEdit ? 'Edit Student' : 'Add Student Admission'}
          </h1>
        </div>

        {!isEdit && (
          <Link
            to="/students/manage"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] whitespace-nowrap"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Student</span>
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <h2 className="text-base font-semibold text-white">Create a Course First</h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Student admissions automatically record course duration and software modules from your Course catalog.
          </p>
          <Link
            to="/courses/new"
            className="mt-5 inline-flex min-h-[42px] items-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Add First Course
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Reg. No. (Optional)
              </label>
              <input
                type="text"
                maxLength={40}
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="e.g. GT-2026-042"
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Name *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student full name"
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Branch *
              </label>
              <DarkSelect
                value={branch}
                onChange={handleBranchChange}
                ariaLabel="Branch"
                options={BRANCH_LIST.filter(
                  (b) =>
                    !activeTrainer?.branches?.length ||
                    activeTrainer.branches.includes(b.id) ||
                    editingStudent?.branch === b.id
                ).map((b) => ({
                  value: b.id,
                  label: b.name,
                  sublabel: activeTrainer?.branchSchedules?.[b.id] || b.scheduleLabel,
                }))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Weekly Attendance Days *</span>
                </label>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Branch default: {branchScheduleLabel}. Selecting fewer days automatically extends the final completion date while keeping course duration unchanged.
                </p>
              </div>
              <button
                type="button"
                onClick={resetToBranchDays}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Use branch days</span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {CLASS_WEEKDAYS.map((day) => {
                const selected = classDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleClassDay(day)}
                    className={`min-h-[40px] rounded-xl border font-mono text-xs font-semibold transition-colors ${
                      selected
                        ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Course *
              </label>
              <DarkSelect
                value={course1Id}
                onChange={setCourse1Id}
                ariaLabel="Primary Course"
                options={courses.map((c) => ({
                  value: c.id,
                  label: `${c.shortName} (${c.durationDays}d)`,
                  sublabel: c.fullName,
                }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Course 2 (Optional)
              </label>
              <DarkSelect
                value={course2Id}
                onChange={setCourse2Id}
                ariaLabel="Secondary Course"
                options={[
                  { value: '', label: 'None (Single course)' },
                  ...courses
                    .filter((c) => c.id !== course1Id)
                    .map((c) => ({
                      value: c.id,
                      label: `${c.shortName} (${c.durationDays}d)`,
                      sublabel: c.fullName,
                    })),
                ]}
              />
            </div>
          </div>

          {computedTotalDays > 0 && schedulePreview && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-emerald-300">
                  Course Duration:{' '}
                  <strong className="font-mono">{computedTotalDays} days</strong>
                </span>
                {schedulePreview.isExtended && (
                  <span className="text-amber-300">
                    Extended Timeline ({classDays.join(', ')}):{' '}
                    <strong className="font-mono">{schedulePreview.effectiveTotalDays} days</strong>
                  </span>
                )}
              </div>
              <span className="text-zinc-300">
                Estimated Completion:{' '}
                <strong className="font-mono text-white">
                  {formatReadableDate(schedulePreview.endDateStr)}
                </strong>
              </span>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Date of Joining *
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-sm text-white focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Exam Date (Optional)
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-sm text-white focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Contact *
              </label>
              <input
                type="tel"
                required
                minLength={5}
                maxLength={30}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+91 98765 43210"
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 font-mono text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
              />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Enrollment Status
              </label>
              <DarkSelect
                value={status}
                onChange={(val) => setStatus(val as StudentStatus)}
                ariaLabel="Enrollment Status"
                options={[
                  { value: 'ongoing', label: 'Ongoing' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Batch slot, remarks, or fee/exam notes..."
              className="w-full rounded-xl border border-white/12 bg-white/[0.04] p-3 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
            />
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
                <span>Remove Student</span>
              </button>
            ) : (
              <span className="text-xs text-zinc-500">
                Course duration and software modules auto-attach on save.
              </span>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              <span>
                {busy ? 'Saving...' : isEdit ? 'Save Student' : 'Add Student'}
              </span>
            </button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Remove Student?"
        description={`Are you sure you want to delete ${name || 'this student'} and all their attendance records?`}
        confirmLabel="Remove Student"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
