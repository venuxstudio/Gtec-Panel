import React, { useRef, useState } from 'react';
import { ArrowRight, KeyRound, Lock, Mail, RotateCcw, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'signin' | 'register' | 'forgot' | 'emaillink' | 'pin';

export function LoginPage() {
  const {
    user,
    isLocked,
    hasPinConfigured,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    sendEmailSignInLink,
    unlockWithPin,
    logout,
  } = useAuth();

  const initialMode: AuthMode = user && isLocked && hasPinConfigured ? 'pin' : 'signin';
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [showConsoleHelp, setShowConsoleHelp] = useState(false);

  const resetMessages = () => {
    setErrorMsg('');
    setInfoMsg('');
    setShowConsoleHelp(false);
  };

  const handleAuthError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/operation-not-allowed')) {
      setShowConsoleHelp(true);
      setErrorMsg(
        'Email/Password sign-in is not enabled in your Firebase Console yet. Use Continue with Google below or enable Email/Password in Firebase Console.'
      );
    } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      setErrorMsg('Invalid email or password. Please try again or use Forgot Password.');
    } else if (msg.includes('auth/user-not-found')) {
      setErrorMsg('No account found with that email. You can create a new account or sign in with Google.');
    } else if (msg.includes('auth/email-already-in-use')) {
      setErrorMsg('An account with this email already exists. Try signing in instead.');
    } else if (msg.includes('auth/weak-password')) {
      setErrorMsg('Password must be at least 6 characters.');
    } else if (msg.includes('auth/popup-closed-by-user')) {
      setErrorMsg('Sign-in window was closed before completing.');
    } else {
      setErrorMsg(msg);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      await signInWithEmail(identifier, password);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      await registerWithEmail(name, username, email, password);
      setInfoMsg('Account created. Please check your email inbox for the verification link.');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setInfoMsg(`Password reset link sent to ${email}. Check your inbox.`);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      await sendEmailSignInLink(email);
      setInfoMsg(`One-tap email sign-in link sent to ${email}. Open it on this device to enter.`);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setErrorMsg('Enter all 6 digits.');
      return;
    }
    setBusy(true);
    try {
      const ok = await unlockWithPin(code);
      if (!ok) {
        setErrorMsg('Incorrect 6-digit code. Try again or switch account.');
        setOtpDigits(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } finally {
      setBusy(false);
    }
  };

  // Locked 6-digit OTP style screen (inspired by Reference Image 1)
  if (user && isLocked && hasPinConfigured && mode === 'pin') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06080D] p-4">
        <img
          src="/src/assets/images/auth_glass_backdrop_1794804454859.jpg"
          alt="Obsidian backdrop"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#06080D]/80 via-[#06080D]/75 to-[#06080D]/95" />

        <div className="relative z-10 w-full max-w-[420px] rounded-[28px] border border-white/12 bg-gradient-to-b from-[#131824]/95 to-[#0B0E17]/95 p-8 text-center shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-black/60 shadow-inner">
            <Lock className="h-9 w-9 text-zinc-200" strokeWidth={1.7} />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white">6 digit code</h1>
          <p className="mt-2 text-xs text-zinc-400">
            Enter your 6-digit quick re-login code for{' '}
            <span className="text-zinc-200">{user.email}</span>
          </p>

          <form onSubmit={handlePinSubmit} className="mt-6">
            <div className="grid grid-cols-6 gap-2.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpRefs.current[idx] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] text-center font-mono text-lg font-semibold text-white transition-all focus:border-white focus:bg-white/[0.09] focus:outline-none"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>

            {errorMsg && <p className="mt-3 text-xs text-red-400">{errorMsg}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-6 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              <span>{busy ? 'Unlocking...' : 'Unlock Panel'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => logout()}
              className="hover:text-white transition-colors"
            >
              Use another account
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                setMode('emaillink');
              }}
              className="hover:text-white transition-colors"
            >
              Sign in via email link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080A0D] p-4 sm:p-6">
      <img
        src="/src/assets/images/auth_glass_backdrop_1794804454859.jpg"
        alt="G-TEC MM Panel obsidian backdrop"
        referrerPolicy="no-referrer"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#080A0D]/85 via-[#080A0D]/70 to-[#080A0D]/95" />

      <div className="relative z-10 grid w-full max-w-5xl items-stretch overflow-hidden rounded-[28px] border border-white/12 bg-[#0D1016]/85 shadow-[0_32px_90px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl lg:grid-cols-12">
        {/* Left Brand Editorial Panel */}
        <div className="hidden flex-col justify-between border-r border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-10 lg:col-span-5 lg:flex">
          <div>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-emerald-400">
                <Shield className="h-4 w-4" />
              </span>
              <span>G-TEC MM Panel</span>
            </div>

            <h1 className="mt-10 text-3xl font-semibold leading-tight tracking-tight text-white [text-wrap:balance]">
              Institute operations for Mavelikara &amp; Kayamkulam.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Manage admissions, dual-course durations, software modules, exam dates, and daily branch attendance from desktop or mobile.
            </p>
          </div>

          <div className="space-y-3 border-t border-white/[0.08] pt-6 text-xs text-zinc-400">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-200">Mavelikara</span>
              <span className="font-mono text-zinc-400">Tue · Thu · Fri</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-200">Kayamkulam</span>
              <span className="font-mono text-zinc-400">Mon · Wed · Sat</span>
            </div>
          </div>
        </div>

        {/* Right Auth Form Panel */}
        <div className="p-6 sm:p-10 lg:col-span-7">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <span className="text-base font-semibold text-white">G-TEC MM Panel</span>
            <span className="font-mono text-xs text-zinc-400">Mavelikara · Kayamkulam</span>
          </div>

          {/* Mode Tabs */}
          <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-black/35 p-1">
            <button
              type="button"
              onClick={() => {
                resetMessages();
                setMode('signin');
              }}
              className={`min-h-[38px] flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'signin'
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                resetMessages();
                setMode('emaillink');
              }}
              className={`min-h-[38px] flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'emaillink'
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Email Link
            </button>
            <button
              type="button"
              onClick={() => {
                resetMessages();
                setMode('register');
              }}
              className={`min-h-[38px] flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="instructor@gtec.edu or username"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      setEmail(identifier.includes('@') ? identifier : '');
                      setMode('forgot');
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                <span>{busy ? 'Signing in...' : 'Sign in to Panel'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Instructor Name"
                    className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. mm_instructor"
                    className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="instructor@gmail.com"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                <span>{busy ? 'Creating account...' : 'Create Instructor Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your account email"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{busy ? 'Sending...' : 'Send Password Reset Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setMode('signin');
                }}
                className="w-full py-1 text-xs text-zinc-400 hover:text-white"
              >
                Back to password sign-in
              </button>
            </form>
          )}

          {mode === 'emaillink' && (
            <form onSubmit={handleEmailLink} className="space-y-4">
              <p className="text-xs leading-relaxed text-zinc-400">
                Receive a free passwordless sign-in link in your email inbox for instant one-tap re-login without a password.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="instructor@gmail.com"
                  className="min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-white/35 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                <span>{busy ? 'Sending link...' : 'Send Sign-In Link'}</span>
              </button>
            </form>
          )}

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {showConsoleHelp && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <p className="font-semibold">How to enable Email/Password in Firebase (free):</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-amber-200/90">
                <li>Open Firebase Console &rarr; Authentication &rarr; Sign-in method.</li>
                <li>Click Add new provider &rarr; Email/Password.</li>
                <li>Enable Email/Password (and Email link if desired), then click Save.</li>
              </ol>
            </div>
          )}

          {infoMsg && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
              {infoMsg}
            </div>
          )}

          {/* Divider + Instant Google Sign-In */}
          <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
            <div className="h-px flex-1 bg-white/10" />
            <span>or instant verified access</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              resetMessages();
              setBusy(true);
              try {
                await signInWithGoogle();
              } catch (err) {
                handleAuthError(err);
              } finally {
                setBusy(false);
              }
            }}
            className="flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4 text-emerald-400" />
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
