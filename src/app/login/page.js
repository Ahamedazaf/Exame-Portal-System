'use client';
import { Suspense } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePortal } from '@/context/PortalContext';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, AlertCircle, Clock, CheckCircle } from 'lucide-react';

// Inner component that uses useSearchParams
function LoginContent() {
  const { login, user, loading, pendingApproval, pendingUser, logout } = useAuth();
  const { portalName, portalLogoText, portalLogoUrl } = usePortal();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirected   = useRef(false);

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (loading || redirected.current || pendingApproval) return;
    if (user) {
      redirected.current = true;
      router.replace(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    }
  }, [user, loading, pendingApproval, router]);

  useEffect(() => {
    const e = searchParams.get('error');
    if (!e || e === 'undefined' || e === 'not_registered') return;
    if (e === 'OAuthAccountNotLinked') setError('This email is registered with a password. Please sign in with email.');
    else if (e === 'AccessDenied')  setError('Access denied. Account may be blocked.');
    else if (e === 'Configuration') setError('Google sign-in not configured. Use email/password.');
    else setError('Google sign-in failed. Please try again.');
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    const result = await login(form.email.trim().toLowerCase(), form.password);
    if (result?.error) setError(result.error);
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('');
    await signIn('google', { callbackUrl: '/login' });
  };

  // Pending approval screen
  if (!loading && pendingApproval) return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{background:'linear-gradient(135deg,#2e1065 0%,#4c1d95 50%,#6d28d9 100%)'}}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center animate-fade-in">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock size={36} className="text-amber-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Approval Pending</h2>
        <p className="text-slate-500 text-sm mb-6">
          Hi <strong>{pendingUser?.name}</strong>! The teacher needs to approve your account.
        </p>
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left space-y-2.5">
          <div className="flex items-center gap-2 text-sm"><CheckCircle size={15} className="text-emerald-500" /><span>Account registered</span></div>
          <div className="flex items-center gap-2 text-sm"><Clock size={15} className="text-amber-500" /><span>Waiting for teacher approval</span></div>
          <div className="flex items-center gap-2 text-sm opacity-40"><CheckCircle size={15} /><span>Login access (after approval)</span></div>
        </div>
        <button onClick={logout} className="w-full btn-secondary py-3 text-sm">
          Sign Out / Use Different Account
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#f5f3ff'}}>
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row"
      style={{background:'linear-gradient(135deg,#2e1065 0%,#4c1d95 50%,#7c3aed 100%)'}}>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 p-12 xl:p-16 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{background:'rgba(255,255,255,0.15)'}}>
            {portalLogoUrl
              ? <img src={portalLogoUrl} alt="logo" className="w-full h-full object-cover" />
              : <span className="text-white font-extrabold">{portalLogoText}</span>}
          </div>
          <span className="text-xl font-extrabold">{portalName}</span>
        </div>
        <div>
          <div className="inline-block bg-white/10 rounded-2xl px-4 py-2 text-sm font-semibold text-purple-200 mb-6">
            🎓 Online Examination System
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight mb-5">
            Smart Exams.<br />Better Learning.<br />
            <span style={{color:'#c4b5fd'}}>Real Results.</span>
          </h1>
          <p className="text-purple-200 text-base leading-relaxed max-w-sm mb-8">
            Take class-based MCQ exams, get instant results, and track your progress.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[{i:'⚡',l:'Instant Marks'},{i:'📊',l:'Track Progress'},{i:'🏆',l:'Earn Grades'}].map(f=>(
              <div key={f.l} className="rounded-2xl p-3 text-center" style={{background:'rgba(255,255,255,0.08)'}}>
                <div className="text-2xl mb-1">{f.i}</div>
                <div className="text-xs font-semibold text-purple-200">{f.l}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-purple-400/60 text-xs">© 2025 {portalName}</p>
      </div>

      {/* Right login card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2.5 mb-7 lg:hidden">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{background:'rgba(255,255,255,0.15)'}}>
              {portalLogoUrl
                ? <img src={portalLogoUrl} alt="logo" className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold">{portalLogoText}</span>}
            </div>
            <span className="text-2xl font-extrabold text-white">{portalName}</span>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="h-1.5" style={{background:'linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)'}} />
            <div className="p-6 sm:p-8 lg:p-10">
              <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Welcome back! 👋</h2>
              <p className="text-slate-500 text-sm mb-6">Sign in to continue your learning</p>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              <button onClick={handleGoogle} disabled={googleLoading || submitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 mb-5 bg-white border-2 border-purple-200 rounded-xl font-semibold text-slate-700 hover:bg-purple-50 hover:border-purple-400 transition-all active:scale-95 disabled:opacity-60 text-sm sm:text-base">
                {googleLoading
                  ? <span className="w-5 h-5 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
                  : <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>}
                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
              </button>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400 font-medium">or sign in with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email Address</label>
                  <input type="email" required autoComplete="email" value={form.email}
                    onChange={e=>setForm({...form,email:e.target.value})}
                    placeholder="you@example.com" className="input-field text-base" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input type={showPw?'text':'password'} required autoComplete="current-password"
                      value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                      placeholder="••••••••" className="input-field pr-11 text-base" />
                    <button type="button" onClick={()=>setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                      {showPw?<EyeOff size={17}/>:<Eye size={17}/>}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={submitting||googleLoading}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base mt-1">
                  {submitting
                    ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><LogIn size={17}/> Sign In</>}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                New student?{' '}
                <Link href="/register" className="font-bold hover:underline" style={{color:'#7c3aed'}}>
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Default export wraps content in Suspense (required for useSearchParams) ──
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{background:'#f5f3ff'}}>
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}