import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookPlus, LogOut, Menu, Search, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotify } from '../context/NotificationContext';

export function TopBar() {
  const { activeTrainer, logout } = useAuth();
  const { students, courses } = useData();
  const { notify } = useNotify();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { students: [], courses: [] };
    return {
      students: students
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.regNo.toLowerCase().includes(q) ||
            s.course1Short.toLowerCase().includes(q) ||
            s.course2Short.toLowerCase().includes(q) ||
            s.contact.toLowerCase().includes(q) ||
            s.branch.toLowerCase().includes(q)
        )
        .slice(0, 5),
      courses: courses
        .filter(
          (c) =>
            c.shortName.toLowerCase().includes(q) ||
            c.fullName.toLowerCase().includes(q)
        )
        .slice(0, 3),
    };
  }, [searchQuery, students, courses]);

  const hasResults = searchResults.students.length > 0 || searchResults.courses.length > 0;
  const isActive = (prefix: string) => location.pathname.startsWith(prefix);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#090B0E]/90 backdrop-blur-xl">
      {/* Persistent Trainer Identity Banner with Periodic Light Sweep */}
      {activeTrainer && (
        <div className="border-b border-white/[0.06] bg-[#0D1117]/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8">
            <Link
              to="/dashboard"
              className="trainer-sweep-badge inline-flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1 text-xs transition-colors hover:border-emerald-500/35"
            >
              <span className="font-semibold text-white">{activeTrainer.name}</span>
              <span className="text-zinc-500" aria-hidden="true">
                ·
              </span>
              <span className="text-emerald-400 font-medium">
                {activeTrainer.designation}
              </span>
            </Link>
            <span className="hidden sm:inline font-mono text-[11px] text-zinc-400">
              {activeTrainer.branches.join(' · ')}
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-15 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Title */}
        <Link
          to="/branches"
          className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] text-emerald-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 7l8-4 8 4-8 4-8-4z" />
              <path d="M4 12l8 4 8-4" />
              <path d="M4 17l8 4 8-4" />
            </svg>
          </span>
          <span>G-TEC Trainer Panel</span>
        </Link>

        {/* Zone 2: Clean Single-line Nav Links */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
          <Link
            to="/dashboard"
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              isActive('/dashboard')
                ? 'text-white border-b border-emerald-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/branches"
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              isActive('/branches') || isActive('/branch/')
                ? 'text-white border-b border-emerald-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Branches
          </Link>
          <Link
            to="/students/manage"
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              isActive('/students')
                ? 'text-white border-b border-emerald-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Students
          </Link>
          <Link
            to="/courses/manage"
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              isActive('/courses')
                ? 'text-white border-b border-emerald-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Courses
          </Link>
        </nav>

        {/* Zone 3: Search Bar + Quick Actions + Logout */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <div ref={searchRef} className="relative">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 focus-within:border-white/25 focus-within:bg-white/[0.06] transition-colors">
              <Search className="mr-2 h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search students, Reg.No..."
                className="w-40 lg:w-48 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                aria-label="Search students or courses"
              />
            </div>

            {searchOpen && searchQuery.trim().length > 0 && (
              <div className="glass-panel absolute right-0 mt-2 w-80 rounded-2xl p-2 shadow-2xl">
                {!hasResults ? (
                  <p className="px-3 py-4 text-center text-xs text-zinc-400">
                    No matching students or courses found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.students.length > 0 && (
                      <div>
                        <p className="px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                          Students
                        </p>
                        {searchResults.students.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              navigate(`/student/${s.id}`);
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors hover:bg-white/[0.06]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">
                                {s.name}
                                {s.regNo ? ` (${s.regNo})` : ''}
                              </p>
                              <p className="truncate text-[11px] text-zinc-400">
                                {s.branch} · {s.course1Short}
                                {s.course2Short ? ` + ${s.course2Short}` : ''}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.courses.length > 0 && (
                      <div className="border-t border-white/[0.06] pt-1">
                        <p className="px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                          Courses
                        </p>
                        {searchResults.courses.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              navigate(`/courses/edit/${c.id}`);
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors hover:bg-white/[0.06]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">{c.shortName}</p>
                              <p className="truncate text-[11px] text-zinc-400">{c.fullName}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            to="/students/new"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Students</span>
          </Link>

          <Link
            to="/courses/new"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.09] hover:text-white whitespace-nowrap shrink-0"
          >
            <BookPlus className="h-3.5 w-3.5" />
            <span>Add Course</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              const name = activeTrainer?.name || 'Trainer';
              logout();
              notify({
                title: 'TRAINER LOGGED OUT',
                message: `Signed out of ${name}'s workspace.`,
                tone: 'info',
              });
              navigate('/');
            }}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out</span>
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 md:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-white/[0.08] bg-[#0B0E13] px-4 py-4 md:hidden">
          <div className="mb-3 flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <Search className="mr-2 h-4 w-4 text-zinc-400 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students, Reg.No..."
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {searchQuery.trim().length > 0 && hasResults && (
            <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              {searchResults.students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setMobileMenuOpen(false);
                    navigate(`/student/${s.id}`);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white/[0.06]"
                >
                  <span className="font-medium text-white">{s.name}</span>
                  <span className="text-zinc-400">
                    {s.branch} · {s.course1Short}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/dashboard"
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-zinc-200"
            >
              Dashboard
            </Link>
            <Link
              to="/branches"
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-zinc-200"
            >
              Branches
            </Link>
            <Link
              to="/students/manage"
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-zinc-200"
            >
              Edit Students
            </Link>
            <Link
              to="/courses/manage"
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-zinc-200"
            >
              Manage Courses
            </Link>
            <Link
              to="/students/new"
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-sm font-semibold text-zinc-950"
            >
              <UserPlus className="h-4 w-4" />
              Add Students
            </Link>
            <Link
              to="/courses/new"
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] text-sm font-medium text-white"
            >
              <BookPlus className="h-4 w-4" />
              Add Course
            </Link>
            <button
              type="button"
              onClick={() => {
                const name = activeTrainer?.name || 'Trainer';
                logout();
                notify({
                  title: 'TRAINER LOGGED OUT',
                  message: `Signed out of ${name}'s workspace.`,
                  tone: 'info',
                });
                navigate('/');
              }}
              className="col-span-2 flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 text-sm font-medium text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
