import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookPlus, Edit3, Search, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';

export function CoursesDirectoryPage() {
  const { courses, loading, importStandardCourses } = useData();
  const [queryText, setQueryText] = useState('');
  const [seeding, setSeeding] = useState(false);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.shortName.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.softwares.some(
          (sw) =>
            sw.shortName.toLowerCase().includes(q) ||
            sw.fullName.toLowerCase().includes(q)
        )
    );
  }, [courses, queryText]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-400">Course Catalog</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Manage &amp; Edit Courses
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>{seeding ? 'Loading...' : 'Import Standard Courses'}</span>
          </button>

          <Link
            to="/courses/new"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
          >
            <BookPlus className="h-4 w-4" />
            <span>Add Course</span>
          </Link>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search courses or software modules..."
            className="min-h-[42px] w-full rounded-xl border border-white/12 bg-black/40 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="glass-panel h-48 animate-pulse rounded-2xl p-6" />
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <p className="text-base font-semibold text-white">No courses found</p>
          <p className="mt-1 text-sm text-zinc-400">
            Create a custom course or import standard G-TEC DCA, DTP, and PGDCA templates.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((course) => (
            <div
              key={course.id}
              className="glass-panel flex flex-col justify-between rounded-2xl p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {course.shortName}
                    </h2>
                    <p className="mt-0.5 text-sm text-zinc-300">{course.fullName}</p>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 whitespace-nowrap">
                    {course.durationValue} {course.durationUnit} ({course.durationDays}d)
                  </span>
                </div>

                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                    Softwares ({course.softwares.length})
                  </p>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-xs text-zinc-300">
                    {course.softwares.map((sw, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5">
                        <span>{sw.shortName}</span>
                        {idx < course.softwares.length - 1 && (
                          <span className="text-zinc-600" aria-hidden="true">
                            ·
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Link
                  to={`/courses/edit/${course.id}`}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 text-xs font-semibold text-white hover:bg-white/[0.14]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Course</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
