import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileDown,
  Phone,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DurationProgressBar } from '../components/DurationProgressBar';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotify } from '../context/NotificationContext';
import {
  calculateDurationMetrics,
  formatReadableDate,
  isBranchClassDay,
} from '../lib/duration';
import { AttendanceRecord, AttendanceStatus, BRANCHES } from '../types';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { activeTrainer } = useAuth();
  const {
    students,
    courses,
    loading,
    toggleStudentSoftware,
    updateStudentStatus,
    updateStudentExamDate,
    deleteStudent,
    markAttendance,
    fetchStudentAttendance,
  } = useData();
  const { notify } = useNotify();

  const student = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId]
  );

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attLoading, setAttLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('present');
  const [remark, setRemark] = useState('');
  const [savingAtt, setSavingAtt] = useState(false);

  const [examDateInput, setExamDateInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSavedMsg, setMetaSavedMsg] = useState('');

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (student) {
      setExamDateInput(student.examDate || '');
      setNotesInput(student.notes || '');
    }
  }, [student]);

  const loadAttendance = useCallback(async () => {
    if (!studentId) return;
    setAttLoading(true);
    try {
      const list = await fetchStudentAttendance(studentId);
      setAttendanceRecords(list);
    } catch (err) {
      notify({
        title: 'ATTENDANCE LOAD FAILED',
        message: err instanceof Error ? err.message : 'Could not load attendance records.',
        tone: 'error',
      });
    } finally {
      setAttLoading(false);
    }
  }, [studentId, fetchStudentAttendance, notify]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((rec) => map.set(rec.date, rec));
    return map;
  }, [attendanceRecords]);

  useEffect(() => {
    const existing = attendanceMap.get(selectedDateStr);
    if (existing) {
      setSelectedStatus(existing.status);
      setRemark(existing.remark || '');
    } else {
      setSelectedStatus('present');
      setRemark('');
    }
  }, [selectedDateStr, attendanceMap]);

  if (loading) {
    return <div className="glass-panel h-64 animate-pulse rounded-2xl p-6" />;
  }

  if (!student) {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center">
        <h1 className="text-lg font-semibold text-white">Student record not found</h1>
        <p className="mt-1 text-sm text-zinc-400">
          This record may have been removed or the link is invalid.
        </p>
        <Link
          to="/branches"
          className="mt-5 inline-flex min-h-[40px] items-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950"
        >
          Return to Branches
        </Link>
      </div>
    );
  }

  const branchInfo = BRANCHES[student.branch];
  const branchSchedule =
    activeTrainer?.branchSchedules?.[student.branch] || branchInfo.scheduleLabel;
  const metrics = calculateDurationMetrics(
    student.joiningDate,
    student.totalDurationDays,
    student.status
  );

  const course1 = courses.find((c) => c.id === student.course1Id);
  const course2 = student.course2Id
    ? courses.find((c) => c.id === student.course2Id)
    : undefined;

  const softwareItems = [
    ...(course1?.softwares || []).map((sw) => ({
      key: `c1:${sw.shortName}`,
      courseShort: student.course1Short,
      ...sw,
    })),
    ...(course2?.softwares || []).map((sw) => ({
      key: `c2:${sw.shortName}`,
      courseShort: student.course2Short,
      ...sw,
    })),
  ];

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingEmptyDays = getDay(monthStart);

  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'late').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length;
  const totalMarked = attendanceRecords.length;
  const attendancePct =
    totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 0;

  const handleSaveAttendance = async () => {
    setSavingAtt(true);
    try {
      await markAttendance(student, selectedDateStr, selectedStatus, remark);
      await loadAttendance();
      notify({
        title: 'ATTENDANCE RECORDED',
        message: `${student.name} marked ${STATUS_LABEL[selectedStatus]} for ${selectedDateStr}.`,
        tone: 'success',
      });
    } catch (err) {
      notify({
        title: 'SAVE FAILED',
        message: err instanceof Error ? err.message : 'Could not save attendance entry.',
        tone: 'error',
      });
    } finally {
      setSavingAtt(false);
    }
  };

  const handleSaveExamAndNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMeta(true);
    setMetaSavedMsg('');
    try {
      await updateStudentExamDate(student.id, examDateInput, notesInput);
      setMetaSavedMsg('Saved');
      notify({
        title: 'EXAM & NOTES SAVED',
        message: examDateInput
          ? `Exam scheduled for ${formatReadableDate(examDateInput)}.`
          : `Updated instructor notes for ${student.name}.`,
        tone: 'success',
      });
      setTimeout(() => setMetaSavedMsg(''), 1800);
    } catch (err) {
      notify({
        title: 'SAVE FAILED',
        message: err instanceof Error ? err.message : 'Unable to save exam & notes.',
        tone: 'error',
      });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleExportCsv = () => {
    const trainerFooterName = activeTrainer?.name || 'Trainer';
    const trainerFooterDesig = activeTrainer?.designation || '';
    const header = ['Reg. No.', 'Date', 'Branch', 'Student', 'Status', 'Remark'];
    const rows = attendanceRecords.map((r) => [
      `"${(student.regNo || '').replace(/"/g, '""')}"`,
      r.date,
      r.branch,
      `"${student.name.replace(/"/g, '""')}"`,
      r.status,
      `"${(r.remark || '').replace(/"/g, '""')}"`,
    ]);
    const footer = [
      '',
      `"Trainer: ${trainerFooterName}${trainerFooterDesig ? ` (${trainerFooterDesig})` : ''}"`,
    ];
    const csv = [header.join(','), ...rows.map((r) => r.join(',')), footer.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${student.name.toLowerCase().replace(/\s+/g, '_')}_attendance.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify({
      title: 'CSV SHEET EXPORTED',
      message: `Attendance CSV downloaded for ${student.name}.`,
      tone: 'info',
    });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const removedName = student.name;
      const targetBranch = student.branch;
      await deleteStudent(student.id);
      notify({
        title: 'STUDENT REMOVED',
        message: `${removedName} deleted from ${targetBranch}.`,
        tone: 'warning',
      });
      navigate(`/branch/${targetBranch}`);
    } catch (err) {
      notify({
        title: 'DELETE FAILED',
        message: err instanceof Error ? err.message : 'Unable to delete student.',
        tone: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="font-medium text-emerald-400">{branchInfo.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                {activeTrainer?.branchSchedules?.[student.branch] || branchInfo.scheduleLabel}
              </span>
              {student.regNo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-zinc-300">Reg. No: {student.regNo}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="capitalize">
                Status: {student.status === 'completed' ? 'Completed' : 'Ongoing'}
              </span>
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              {student.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-300">
              <a
                href={`tel:${student.contact}`}
                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-emerald-400 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono">{student.contact}</span>
              </a>
              <span aria-hidden="true" className="text-zinc-600">
                |
              </span>
              <span>
                Joined:{' '}
                <span className="font-mono text-white">
                  {formatReadableDate(student.joiningDate)}
                </span>
              </span>
              <span aria-hidden="true" className="text-zinc-600">
                |
              </span>
              <span>
                Est. End:{' '}
                <span className="font-mono text-white">
                  {formatReadableDate(metrics.endDateStr)}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                try {
                  const { exportStudentPdfReport } = await import('../lib/pdfReport');
                  exportStudentPdfReport({
                    student,
                    courses,
                    attendanceRecords,
                    trainerName: activeTrainer?.name || 'Trainer',
                    trainerDesignation: activeTrainer?.designation || '',
                    branchSchedule,
                  });
                  notify({
                    title: 'PDF REPORT DOWNLOADED',
                    message: `Progress & attendance report saved for ${student.name}.`,
                    tone: 'info',
                  });
                } catch (err) {
                  notify({
                    title: 'PDF EXPORT FAILED',
                    message: err instanceof Error ? err.message : 'Unable to generate PDF.',
                    tone: 'error',
                  });
                }
              }}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 whitespace-nowrap"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const nextStatus =
                  student.status === 'completed' ? 'ongoing' : 'completed';
                try {
                  await updateStudentStatus(student.id, nextStatus);
                  notify({
                    title: 'STATUS UPDATED',
                    message: `${student.name} marked as ${nextStatus}.`,
                    tone: 'success',
                  });
                } catch (err) {
                  notify({
                    title: 'STATUS UPDATE FAILED',
                    message: err instanceof Error ? err.message : 'Could not update status.',
                    tone: 'error',
                  });
                }
              }}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] whitespace-nowrap"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {student.status === 'completed' ? 'Reopen Ongoing' : 'Mark Completed'}
              </span>
            </button>

            <Link
              to={`/students/edit/${student.id}`}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] whitespace-nowrap"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Student</span>
            </Link>

            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove Student</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/branch/${student.branch}`)}
              aria-label="Close student details"
              title="Close"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-7">
            <div className="rounded-xl border border-white/[0.07] bg-black/35 p-4">
              <p className="text-xs text-zinc-400">Enrolled Course(s)</p>
              <p className="mt-1 text-base font-semibold text-white">
                {student.course1Short} — {student.course1Full}
                <span className="ml-2 font-mono text-xs font-normal text-zinc-400">
                  ({student.course1DurationDays}d)
                </span>
              </p>
              {student.course2Id && (
                <p className="mt-1.5 text-sm font-medium text-zinc-200">
                  + {student.course2Short} — {student.course2Full}
                  <span className="ml-2 font-mono text-xs font-normal text-zinc-400">
                    ({student.course2DurationDays}d)
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <DurationProgressBar metrics={metrics} />
          </div>
        </div>
      </div>

      {/* Main Content Split: Softwares & Exam Info + Attendance Tracker */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <section className="glass-panel rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-white">Software Modules</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Click any module to toggle completion. Green = Active · Red = Completed.
                </p>
              </div>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                {student.completedSoftwares.length}/{softwareItems.length}
              </span>
            </div>

            {softwareItems.length === 0 ? (
              <p className="mt-4 text-xs text-zinc-500">
                No software modules found on the linked course.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {softwareItems.map((sw) => {
                  const isCompleted = student.completedSoftwares.includes(sw.key);
                  return (
                    <button
                      key={sw.key}
                      type="button"
                      onClick={async () => {
                        const willComplete = !isCompleted;
                        try {
                          await toggleStudentSoftware(student, sw.key);
                          notify({
                            title: 'MODULE UPDATED',
                            message: `${sw.shortName} marked ${willComplete ? 'Completed' : 'Active'}.`,
                            tone: 'info',
                          });
                        } catch (err) {
                          notify({
                            title: 'UPDATE FAILED',
                            message:
                              err instanceof Error ? err.message : 'Unable to update module.',
                            tone: 'error',
                          });
                        }
                      }}
                      className={`flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                        isCompleted
                          ? 'border-red-500/35 bg-red-500/10 hover:bg-red-500/15'
                          : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {sw.fullName}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-400">
                          {sw.shortName} · {sw.courseShort}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-xs font-semibold ${
                          isCompleted ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {isCompleted ? 'Completed' : 'Active'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="glass-panel rounded-2xl p-5 sm:p-6">
            <h2 className="text-base font-semibold text-white">Exam Date &amp; Notes</h2>
            <form onSubmit={handleSaveExamAndNotes} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-white/12 bg-black/40 px-3.5 font-mono text-sm text-white focus:border-white/35 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Instructor Remarks
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Batch timing, project status, or exam notes..."
                  className="w-full rounded-xl border border-white/12 bg-black/40 p-3 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400">{metaSavedMsg}</span>
                <button
                  type="submit"
                  disabled={savingMeta}
                  className="min-h-[40px] rounded-xl bg-white px-4 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
                >
                  {savingMeta ? 'Saving...' : 'Save Exam & Notes'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="glass-panel rounded-2xl p-5 sm:p-6 lg:col-span-7">
          <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>Attendance Record</span>
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Scheduled days ({branchSchedule}) are highlighted. Select any date to record attendance.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={attendanceRecords.length === 0}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] disabled:opacity-40 whitespace-nowrap self-start"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[11px] text-zinc-500">Attendance Rate</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-white tabular-nums">
                {attendancePct}%
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[11px] text-zinc-500">Present</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-emerald-400 tabular-nums">
                {presentCount}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[11px] text-zinc-500">Late</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-amber-400 tabular-nums">
                {lateCount}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[11px] text-zinc-500">Absent</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-red-400 tabular-nums">
                {absentCount}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-white">
                {format(calendarMonth, 'MMMM yyyy')}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                  aria-label="Previous month"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date())}
                  className="min-h-[32px] rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs text-zinc-300 hover:bg-white/[0.08]"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  aria-label="Next month"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-zinc-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1.5">
              {Array.from({ length: leadingEmptyDays }).map((_, i) => (
                <div key={`empty-${i}`} className="h-11" />
              ))}
              {daysInMonth.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const rec = attendanceMap.get(dateStr);
                const isSelected = selectedDateStr === dateStr;
                const isToday = isSameDay(day, new Date());
                const classDay = isBranchClassDay(student.branch, day, branchSchedule);

                let stateClasses = classDay
                  ? 'border-white/15 bg-white/[0.05] text-white'
                  : 'border-white/[0.05] bg-black/25 text-zinc-500';

                if (rec?.status === 'present') {
                  stateClasses = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
                } else if (rec?.status === 'absent') {
                  stateClasses = 'border-red-500/40 bg-red-500/15 text-red-300';
                } else if (rec?.status === 'late') {
                  stateClasses = 'border-amber-400/40 bg-amber-400/15 text-amber-300';
                } else if (rec?.status === 'excused') {
                  stateClasses = 'border-sky-400/40 bg-sky-400/15 text-sky-300';
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`relative flex h-11 flex-col items-center justify-center rounded-xl border font-mono text-xs transition-all ${stateClasses} ${
                      isSelected ? 'ring-2 ring-white' : 'hover:border-white/30'
                    }`}
                  >
                    <span className={isToday ? 'underline decoration-emerald-400 underline-offset-2' : ''}>
                      {format(day, 'd')}
                    </span>
                    {rec && (
                      <span className="mt-0.5 text-[9px] font-sans uppercase tracking-wider opacity-90">
                        {rec.status.slice(0, 1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-200">
                Record for{' '}
                <span className="font-mono text-white">
                  {format(parseISO(selectedDateStr), 'EEE, dd MMM yyyy')}
                </span>
              </p>
              {attendanceMap.get(selectedDateStr) && (
                <span className="text-xs text-zinc-400">
                  Currently: {STATUS_LABEL[attendanceMap.get(selectedDateStr)!.status]}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`min-h-[38px] rounded-xl border text-xs font-medium capitalize transition-colors ${
                    selectedStatus === st
                      ? st === 'present'
                        ? 'border-emerald-500 bg-emerald-500 text-zinc-950 font-semibold'
                        : st === 'absent'
                        ? 'border-red-500 bg-red-500 text-white font-semibold'
                        : st === 'late'
                        ? 'border-amber-400 bg-amber-400 text-zinc-950 font-semibold'
                        : 'border-sky-400 bg-sky-400 text-zinc-950 font-semibold'
                      : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                maxLength={200}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional note (e.g. Lab practice, leave informed)"
                className="min-h-[40px] flex-1 rounded-xl border border-white/12 bg-white/[0.04] px-3 text-xs text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
              />
              <button
                type="button"
                disabled={savingAtt}
                onClick={handleSaveAttendance}
                className="min-h-[40px] rounded-xl bg-emerald-500 px-5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 whitespace-nowrap"
              >
                {savingAtt ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-medium text-zinc-400">Recent Entries</h3>
            {attLoading ? (
              <p className="mt-2 text-xs text-zinc-500">Loading entries...</p>
            ) : attendanceRecords.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                No attendance logged yet for this student.
              </p>
            ) : (
              <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {attendanceRecords.slice(0, 12).map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedDateStr(rec.date)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2 text-left text-xs hover:border-white/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-zinc-300 tabular-nums shrink-0">
                        {rec.date}
                      </span>
                      {rec.remark && (
                        <span className="truncate text-zinc-500">{rec.remark}</span>
                      )}
                    </div>
                    <span
                      className={`shrink-0 font-medium capitalize ${
                        rec.status === 'present'
                          ? 'text-emerald-400'
                          : rec.status === 'absent'
                          ? 'text-red-400'
                          : rec.status === 'late'
                          ? 'text-amber-400'
                          : 'text-sky-400'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Remove Student?"
        description={`This will permanently remove ${student.name} and all their attendance records.`}
        confirmLabel="Remove Student"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
