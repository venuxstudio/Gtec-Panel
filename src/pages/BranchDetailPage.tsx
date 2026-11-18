import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CalendarCheck2,
  Check,
  FileDown,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { DarkSelect } from '../components/DarkSelect';
import { DurationProgressBar } from '../components/DurationProgressBar';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotify } from '../context/NotificationContext';
import {
  calculateDurationMetrics,
  fetchInChunks,
  isBranchClassDay,
} from '../lib/duration';
import { AttendanceRecord, AttendanceStatus, BRANCHES, BranchId, Student } from '../types';

export function BranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { activeTrainer } = useAuth();
  const { students, courses, loading, markAttendance, fetchStudentAttendance } = useData();
  const { notify } = useNotify();

  const normalizedId: BranchId =
    branchId?.toUpperCase() === 'KAYAMKULAM' ? 'KAYAMKULAM' : 'MAVELIKARA';
  const branch = BRANCHES[normalizedId];
  const scheduleLabel =
    activeTrainer?.branchSchedules?.[normalizedId] || branch.scheduleLabel;

  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  const [rollCallOpen, setRollCallOpen] = useState(false);
  const [rollDate, setRollDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [markedMap, setMarkedMap] = useState<Record<string, AttendanceStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const branchStudents = useMemo(
    () => students.filter((s) => s.branch === normalizedId),
    [students, normalizedId]
  );

  const courseMap = useMemo(() => {
    const map = new Map<string, (typeof courses)[number]>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const filteredStudents = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return branchStudents.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (
        courseFilter !== 'all' &&
        s.course1Id !== courseFilter &&
        s.course2Id !== courseFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.regNo.toLowerCase().includes(q) ||
        s.course1Short.toLowerCase().includes(q) ||
        s.course2Short.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q)
      );
    });
  }, [branchStudents, statusFilter, courseFilter, queryText]);

  const getStudentSoftwareChips = (student: Student) => {
    const chips: Array<{ key: string; shortName: string; completed: boolean }> = [];
    const c1 = courseMap.get(student.course1Id);
    if (c1) {
      c1.softwares.forEach((sw) => {
        const key = `c1:${sw.shortName}`;
        chips.push({
          key,
          shortName: sw.shortName,
          completed: student.completedSoftwares.includes(key),
        });
      });
    }
    if (student.course2Id) {
      const c2 = courseMap.get(student.course2Id);
      if (c2) {
        c2.softwares.forEach((sw) => {
          const key = `c2:${sw.shortName}`;
          chips.push({
            key,
            shortName: sw.shortName,
            completed: student.completedSoftwares.includes(key),
          });
        });
      }
    }
    return chips;
  };

  const handleQuickMark = async (student: Student, status: AttendanceStatus) => {
    setSavingId(student.id);
    try {
      await markAttendance(student, rollDate, status, '');
      setMarkedMap((prev) => ({ ...prev, [student.id]: status }));
      notify({
        title: 'ATTENDANCE RECORDED',
        message: `${student.name} marked ${status} for ${rollDate}.`,
        tone: 'success',
      });
    } catch (err) {
      notify({
        title: 'ATTENDANCE FAILED',
        message: err instanceof Error ? err.message : 'Unable to save attendance.',
        tone: 'error',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleExportBranchPdf = async () => {
    if (filteredStudents.length === 0) return;
    setExportingPdf(true);
    try {
      const entries = await fetchInChunks(
        filteredStudents,
        async (s) => {
          const recs = await fetchStudentAttendance(s.id);
          return [s.id, recs] as const;
        },
        10
      );
      const attendanceByStudentId: Record<string, AttendanceRecord[]> = {};
      entries.forEach(([id, recs]) => {
        attendanceByStudentId[id] = recs;
      });
      const { exportBatchPdfReport } = await import('../lib/pdfReport');
      exportBatchPdfReport({
        title: `${branch.name} Branch Report`,
        subtitle: `Schedule: ${scheduleLabel} · Attendance & Course Progress Summary`,
        filePrefix: `GTEC_${branch.name}_Report`,
        students: filteredStudents,
        courses,
        attendanceByStudentId,
        trainerName: activeTrainer?.name || 'Trainer',
        trainerDesignation: activeTrainer?.designation || '',
      });
      notify({
        title: 'PDF REPORT DOWNLOADED',
        message: `${branch.name} report (${filteredStudents.length} students) exported.`,
        tone: 'info',
      });
    } catch (err) {
      notify({
        title: 'PDF EXPORT FAILED',
        message: err instanceof Error ? err.message : 'Could not generate PDF report.',
        tone: 'error',
      });
    } finally {
      setExportingPdf(false);
    }
  };

  const isClassToday = isBranchClassDay(normalizedId, new Date(), scheduleLabel);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/branches"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Branches</span>
          </Link>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              {branch.name}
            </h1>
            <span className="font-mono text-xs text-zinc-400">{scheduleLabel}</span>
            {isClassToday && (
              <span className="text-xs font-medium text-emerald-400">· Class Day</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={exportingPdf || filteredStudents.length === 0}
            onClick={handleExportBranchPdf}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-40 whitespace-nowrap"
          >
            <FileDown className="h-4 w-4 text-emerald-400" />
            <span>{exportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setRollCallOpen((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] hover:text-white whitespace-nowrap"
          >
            <CalendarCheck2 className="h-4 w-4 text-emerald-400" />
            <span>{rollCallOpen ? 'Close Daily Attendance' : 'Quick Attendance'}</span>
          </button>

          <Link
            to={`/students/new?branch=${branch.id}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Student to {branch.name}</span>
          </Link>
        </div>
      </div>

      {/* Quick Daily Roll Call Drawer */}
      {rollCallOpen && (
        <section className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Quick Roll Call · {branch.name}
              </h2>
              <p className="text-xs text-zinc-400">
                Tap Present, Absent, or Late for any ongoing student to record attendance immediately.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={rollDate}
                onChange={(e) => {
                  setRollDate(e.target.value);
                  setMarkedMap({});
                }}
                className="min-h-[38px] rounded-xl border border-white/15 bg-black/40 px-3 font-mono text-xs text-white focus:border-white/35 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setRollCallOpen(false)}
                aria-label="Close quick attendance"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
            {branchStudents.filter((s) => s.status === 'ongoing').length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">
                No ongoing students in {branch.name}.
              </p>
            ) : (
              branchStudents
                .filter((s) => s.status === 'ongoing')
                .map((s) => {
                  const chosen = markedMap[s.id];
                  const isSaving = savingId === s.id;
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-black/30 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {s.name}
                          {s.regNo && (
                            <span className="ml-2 font-mono text-xs text-zinc-400">
                              #{s.regNo}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {s.course1Short}
                          {s.course2Short ? ` + ${s.course2Short}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(['present', 'absent', 'late'] as AttendanceStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleQuickMark(s, st)}
                            className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg border px-2.5 text-xs font-medium capitalize transition-colors ${
                              chosen === st
                                ? st === 'present'
                                  ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                                  : st === 'absent'
                                  ? 'border-red-500 bg-red-500 text-white'
                                  : 'border-amber-400 bg-amber-400 text-zinc-950'
                                : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.09]'
                            }`}
                          >
                            {chosen === st && <Check className="h-3 w-3" />}
                            <span>{st}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </section>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Filter by name, Reg.No., course, phone..."
            className="min-h-[42px] w-full rounded-xl border border-white/12 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {(['all', 'ongoing', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`min-h-[34px] rounded-lg px-3 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-white text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <DarkSelect
            value={courseFilter}
            onChange={setCourseFilter}
            ariaLabel="Filter by course"
            className="w-52"
            options={[
              { value: 'all', label: 'All Courses' },
              ...courses.map((c) => ({
                value: c.id,
                label: c.shortName,
                sublabel: c.fullName,
              })),
            ]}
          />
        </div>
      </div>

      {/* Students Panels Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel h-52 animate-pulse rounded-2xl p-5" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <h2 className="text-base font-semibold text-white">
            {branchStudents.length === 0
              ? `No students enrolled in ${branch.name} yet`
              : 'No students match your filters'}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-400">
            {branchStudents.length === 0
              ? 'Admit your first student to start tracking software modules, duration progress, exam dates, and attendance.'
              : 'Try clearing the search box or switching the status/course filters.'}
          </p>
          {branchStudents.length === 0 && (
            <Link
              to={`/students/new?branch=${branch.id}`}
              className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add First Student</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => {
            const metrics = calculateDurationMetrics(
              student.joiningDate,
              student.totalDurationDays,
              student.status
            );
            const swChips = getStudentSoftwareChips(student);

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => navigate(`/student/${student.id}`)}
                className="glass-panel glass-panel-hover flex flex-col justify-between rounded-2xl p-5 text-left"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <h3 className="truncate text-lg font-semibold text-white">
                          {student.name}
                        </h3>
                        {student.regNo && (
                          <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                            {student.regNo}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-emerald-400">
                        {student.course1Short}
                        {student.course2Short ? ` + ${student.course2Short}` : ''}
                        <span className="text-zinc-500"> · Joined {student.joiningDate}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                      Softwares ({swChips.filter((c) => c.completed).length}/{swChips.length} completed)
                    </p>
                    {swChips.length === 0 ? (
                      <p className="text-xs text-zinc-500">No modules linked</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
                        {swChips.map((chip, i) => (
                          <span key={chip.key} className="inline-flex items-center gap-1.5">
                            <span
                              className={
                                chip.completed
                                  ? 'text-red-400 line-through decoration-red-500/70'
                                  : 'text-emerald-300'
                              }
                            >
                              {chip.shortName}
                            </span>
                            {i < swChips.length - 1 && (
                              <span className="text-zinc-600" aria-hidden="true">
                                ·
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <DurationProgressBar metrics={metrics} compact />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
