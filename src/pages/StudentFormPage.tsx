import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import { ArrowLeft, Edit3, Save, Trash2, UserPlus } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useData } from '../context/DataContext';
import { BRANCH_LIST, BranchId, StudentStatus } from '../types';

export function StudentFormPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { courses, students, addStudent, updateStudent, deleteStudent } = useData();

  const isEdit = Boolean(studentId);
  const editingStudent = useMemo(
    () => (studentId ? students.find((s) => s.id === studentId) : undefined),
    [studentId, students]
  );

  const defaultBranch = (
    searchParams.get('branch')?.toUpperCase() === 'KAYAMKULAM'
      ? 'KAYAMKULAM'
      : 'MAVELIKARA'
  ) as BranchId;

  const [name, setName] = useState('');
  const [branch, setBranch] = useState<BranchId>(defaultBranch);
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
      setName(editingStudent.name);
      setBranch(editingStudent.branch);
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
  }, [editingStudent, courses, course1Id]);

  const selectedCourse1 = courses.find((c) => c.id === course1Id);
  const selectedCourse2 =
    course2Id && course2Id !== course1Id
      ? courses.find((c) => c.id === course2Id)
      : undefined;

  const computedTotalDays =
    (selectedCourse1?.durationDays || 0) + (selectedCourse2?.durationDays || 0);

  const computedEndDate = useMemo(() => {
    if (!joiningDate || computedTotalDays <= 0) return '';
    try {
      const parsed = parseISO(joiningDate);
      if (Number.isNaN(parsed.getTime())) return '';
      return format(addDays(parsed, computedTotalDays), 'dd MMM yyyy');
    } catch {
      return '';
    }
  }, [joiningDate, computedTotalDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!course1Id) {
      setErrorMsg('Please add and select a Course first.');
      return;
    }

    setBusy(true);
    try {
      if (isEdit && studentId) {
        await updateStudent(studentId, {
          name,
          branch,
          course1Id,
          course2Id: course2Id === course1Id ? '' : course2Id,
          joiningDate,
          examDate,
          contact,
          notes,
          status,
        });
        navigate(`/student/${studentId}`);
      } else {
        await addStudent({
          name,
          branch,
          course1Id,
          course2Id: course2Id === course1Id ? '' : course2Id,
          joiningDate,
          examDate,
          contact,
          notes,
          status: 'ongoing',
        });
        navigate(`/branch/${branch}`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save student.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!studentId) return;
    setDeleting(true);
    try {
      await deleteStudent(studentId);
      navigate('/students/manage');
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
          <div className="grid gap-5 sm:grid-cols-2">
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
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value as BranchId)}
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-[#12161D] px-3.5 text-sm text-white focus:border-white/35 focus:outline-none"
              >
                {BRANCH_LIST.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.scheduleLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Course *
              </label>
              <select
                required
                value={course1Id}
                onChange={(e) => setCourse1Id(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-[#12161D] px-3.5 text-sm text-white focus:border-white/35 focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName} — {c.fullName} ({c.durationDays}d)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Course 2 (Optional)
              </label>
              <select
                value={course2Id}
                onChange={(e) => setCourse2Id(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-[#12161D] px-3.5 text-sm text-white focus:border-white/35 focus:outline-none"
              >
                <option value="">None (Single course)</option>
                {courses
                  .filter((c) => c.id !== course1Id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName} — {c.fullName} ({c.durationDays}d)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Auto-recorded duration preview */}
          {computedTotalDays > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3 text-xs">
              <span className="text-emerald-300">
                Recorded Duration:{' '}
                <strong className="font-mono">{computedTotalDays} days</strong>
              </span>
              {computedEndDate && (
                <span className="text-zinc-300">
                  Estimated Completion:{' '}
                  <strong className="font-mono text-white">{computedEndDate}</strong>
                </span>
              )}
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
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StudentStatus)}
                className="min-h-[44px] w-full rounded-xl border border-white/12 bg-[#12161D] px-3.5 text-sm text-white focus:border-white/35 focus:outline-none"
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
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
                {busy
                  ? 'Saving...'
                  : isEdit
                  ? 'Save Student'
                  : 'Add Student'}
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
