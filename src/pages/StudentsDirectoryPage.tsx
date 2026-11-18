import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, ExternalLink, FileDown, Search, UserPlus } from 'lucide-react';
import { DarkSelect } from '../components/DarkSelect';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotify } from '../context/NotificationContext';
import {
  calculateDurationMetrics,
  fetchInChunks,
  formatScheduleDays,
  getStudentScheduleDays,
} from '../lib/duration';
import { AttendanceRecord, BRANCH_LIST, BranchId } from '../types';

export function StudentsDirectoryPage() {
  const { activeTrainer } = useAuth();
  const { students, courses, loading, fetchStudentAttendance } = useData();
  const { notify } = useNotify();
  const [selectedBranch, setSelectedBranch] = useState<'ALL' | BranchId>('ALL');
  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [exportingPdf, setExportingPdf] = useState(false);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return students.filter((s) => {
      if (selectedBranch !== 'ALL' && s.branch !== selectedBranch) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.regNo.toLowerCase().includes(q) ||
        s.course1Short.toLowerCase().includes(q) ||
        s.course2Short.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q)
      );
    });
  }, [students, selectedBranch, statusFilter, queryText]);

  const handleExportDirectoryPdf = async () => {
    if (filtered.length === 0) return;
    setExportingPdf(true);
    try {
      const entries = await fetchInChunks(
        filtered,
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
      const scopeLabel = selectedBranch === 'ALL' ? 'All Branches' : selectedBranch;
      const { exportBatchPdfReport } = await import('../lib/pdfReport');
      exportBatchPdfReport({
        title: `Administrative Student Report (${scopeLabel})`,
        subtitle: `Filter: ${statusFilter} · Attendance & Course Progress Summary`,
        filePrefix: `GTEC_${selectedBranch}_Students_Report`,
        students: filtered,
        courses,
        attendanceByStudentId,
        trainerName: activeTrainer?.name || 'Trainer',
        trainerDesignation: activeTrainer?.designation || '',
        branchSchedules: activeTrainer?.branchSchedules,
      });
      notify({
        title: 'PDF REPORT DOWNLOADED',
        message: `${scopeLabel} report (${filtered.length} students) exported.`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-400">Student Directory</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Manage &amp; Edit Students
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            disabled={exportingPdf || filtered.length === 0}
            onClick={handleExportDirectoryPdf}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-40 whitespace-nowrap"
          >
            <FileDown className="h-4 w-4 text-emerald-400" />
            <span>{exportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>

          <Link
            to="/students/new"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Student</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar with Search + Select Branch */}
      <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search student name, Reg.No., course, or contact..."
            className="min-h-[44px] w-full rounded-xl border border-white/12 bg-black/40 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
          />
        </div>

        <DarkSelect
          value={selectedBranch}
          onChange={(val) => setSelectedBranch(val as 'ALL' | BranchId)}
          ariaLabel="Select Branch"
          className="sm:w-52"
          options={[
            { value: 'ALL', label: 'Select Branch (All)' },
            ...BRANCH_LIST.map((b) => ({
              value: b.id,
              label: b.name,
            })),
          ]}
        />

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/35 p-1">
          {(['all', 'ongoing', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`min-h-[34px] rounded-lg px-3 text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Directory List */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        {loading ? (
          <div className="p-6 text-sm text-zinc-400">Loading students...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-white">No students found</p>
            <p className="mt-1 text-xs text-zinc-400">
              Try changing the selected branch or add a new student admission.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((student) => {
              const branchSchedule = activeTrainer?.branchSchedules?.[student.branch];
              const metrics = calculateDurationMetrics(
                student.joiningDate,
                student.totalDurationDays,
                student.status,
                {
                  branch: student.branch,
                  branchSchedule,
                  studentClassDays: student.classDays,
                }
              );
              const isCompleted = student.status === 'completed';
              const isDurationOver = metrics.isDurationOver;
              const studentDaysLabel = formatScheduleDays(
                getStudentScheduleDays(student.branch, branchSchedule, student.classDays)
              );

              return (
                <div
                  key={student.id}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/student/${student.id}`}
                        className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors"
                      >
                        {student.name}
                      </Link>
                      {student.regNo && (
                        <span className="font-mono text-xs text-zinc-400">
                          #{student.regNo}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">·</span>
                      <span className="font-mono text-xs text-zinc-400">{student.branch}</span>
                      {metrics.isExtended && (
                        <>
                          <span className="text-xs text-zinc-500">·</span>
                          <span className="font-mono text-[11px] text-amber-300">
                            {studentDaysLabel}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span className="text-zinc-200">
                        {student.course1Short}
                        {student.course2Short ? ` + ${student.course2Short}` : ''}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          isCompleted
                            ? 'text-red-400'
                            : isDurationOver
                            ? 'text-orange-400'
                            : 'text-emerald-400'
                        }
                      >
                        {isCompleted
                          ? 'Completed'
                          : isDurationOver
                          ? 'Duration Over'
                          : 'Ongoing'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{metrics.daysLeft}d left</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{student.contact}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/student/${student.id}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white whitespace-nowrap"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Link>
                    <Link
                      to={`/students/edit/${student.id}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 text-xs font-semibold text-white hover:bg-white/[0.14] whitespace-nowrap"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
