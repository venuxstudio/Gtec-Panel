import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Sparkles, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { isBranchClassDay } from '../lib/duration';
import { BRANCH_LIST } from '../types';

export function BranchesPage() {
  const { students, courses, loading, importStandardCourses } = useData();
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);

  const today = new Date();
  const ongoingCount = students.filter((s) => s.status === 'ongoing').length;
  const upcomingExamsCount = students.filter((s) => Boolean(s.examDate)).length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-400">Institute Branches</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white [text-wrap:balance]">
            Select Branch Workspace
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Open either center to review active batches, track course durations, and record attendance.
          </p>
        </div>

        <div className="flex items-center gap-6 border-t border-white/[0.06] pt-3 sm:border-t-0 sm:pt-0 text-xs text-zinc-400">
          <div>
            <span className="block text-zinc-500">Active Students</span>
            <span className="font-mono text-base font-semibold text-white tabular-nums">
              {loading ? '—' : ongoingCount}
            </span>
          </div>
          <div>
            <span className="block text-zinc-500">Courses</span>
            <span className="font-mono text-base font-semibold text-white tabular-nums">
              {loading ? '—' : courses.length}
            </span>
          </div>
          <div>
            <span className="block text-zinc-500">Scheduled Exams</span>
            <span className="font-mono text-base font-semibold text-white tabular-nums">
              {loading ? '—' : upcomingExamsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Onboarding hint if no courses configured yet */}
      {!loading && courses.length === 0 && (
        <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">No courses configured yet</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Add your institute courses first, or import standard DCA, DTP, and PGDCA templates with 6 software modules each.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                try {
                  await importStandardCourses();
                } finally {
                  setSeeding(false);
                }
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.12] whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>{seeding ? 'Importing...' : 'Load Standard Courses'}</span>
            </button>
            <Link
              to="/courses/new"
              className="inline-flex min-h-[40px] items-center rounded-xl bg-emerald-500 px-3.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
            >
              Create Custom Course
            </Link>
          </div>
        </div>
      )}

      {/* Two Main Branch Panels */}
      <div className="grid gap-6 md:grid-cols-2">
        {BRANCH_LIST.map((branch, idx) => {
          const branchStudents = students.filter((s) => s.branch === branch.id);
          const activeStudents = branchStudents.filter((s) => s.status === 'ongoing').length;
          const completedStudents = branchStudents.filter((s) => s.status === 'completed').length;
          const isClassToday = isBranchClassDay(branch.id, today);

          return (
            <button
              key={branch.id}
              type="button"
              onClick={() => navigate(`/branch/${branch.id}`)}
              className="glass-panel glass-panel-hover group flex flex-col justify-between rounded-[26px] p-7 sm:p-9 text-left min-h-[260px]"
            >
              {/* Top subtle ray accent */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -top-24 ${
                  idx === 0 ? '-left-16' : '-right-16'
                } h-56 w-56 rounded-full bg-emerald-500/[0.08] blur-3xl transition-opacity duration-300 group-hover:bg-emerald-400/[0.15]`}
              />

              <div className="relative flex w-full items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-mono">{branch.scheduleLabel}</span>
                    {isClassToday && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-emerald-400">Class Day Today</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                    {branch.name}
                  </h2>
                </div>

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-zinc-300 transition-all duration-200 group-hover:border-emerald-400/50 group-hover:bg-emerald-500 group-hover:text-zinc-950">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>

              <div className="relative mt-10 grid grid-cols-3 gap-4 border-t border-white/[0.08] pt-5">
                <div>
                  <span className="block text-xs text-zinc-500">Total</span>
                  <span className="mt-0.5 flex items-center gap-1.5 font-mono text-xl font-semibold text-white tabular-nums">
                    <Users className="h-4 w-4 text-zinc-500" />
                    {loading ? '—' : branchStudents.length}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500">Ongoing</span>
                  <span className="mt-0.5 block font-mono text-xl font-semibold text-emerald-400 tabular-nums">
                    {loading ? '—' : activeStudents}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500">Completed</span>
                  <span className="mt-0.5 block font-mono text-xl font-semibold text-zinc-300 tabular-nums">
                    {loading ? '—' : completedStudents}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
