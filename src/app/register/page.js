'use client';
import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, Info, Clock, CheckCircle } from 'lucide-react';
import { usePortal } from '@/context/PortalContext';

async function sf(url, opts = {}) {
  try { const r = await fetch(url, opts); const t = await r.text(); return t ? JSON.parse(t) : { success: false, error: 'Empty' }; }
  catch (e) { return { success: false, error: e.message }; }
}

// Inner component that uses useSearchParams
function RegisterContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { portalName, portalLogoText, portalLogoUrl } = usePortal();

  const googleEmail = searchParams.get('googleEmail') || '';
  const googleName  = searchParams.get('googleName')  || '';
  const isGoogleReg = Boolean(googleEmail);

  const [classes,  setClasses]  = useState([]);
  const [form, setForm]         = useState({ firstName: '', lastName: '', email: googleEmail, password: '', classId: '' });
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  useEffect(() => {
    if (googleName) {
      const p = googleName.split(' ');
      setForm(f => ({ ...f, firstName: p[0] || '', lastName: p.slice(1).join(' ') || '' }));
    }
    sf('/api/classes').then(r => { if (r.success) setClasses(r.data.filter(c => c.status === 'active')); });
  }, [googleName]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.classId) { setError('Please select your class.'); return; }
    setLoading(true);
    const res = await sf('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:     `${form.firstName.trim()} ${form.lastName.trim()}`,
        email:    form.email.trim().toLowerCase(),
        password: isGoogleReg ? `google_${Date.now()}` : form.password,
        classId:  Number(form.classId),
      }),
    });
    setLoading(false);
    if (res.success) setSuccess(true);
    else setError(res.error || 'Registration failed.');
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{background:'linear-gradient(135deg,#2e1065 0%,#4c1d95 50%,#7c3aed 100%)'}}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center animate-fade-in">
        <div className="text-6xl mb-4">⏳</div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Registration Submitted!</h2>
        <p className="text-slate-500 text-sm mb-6">
          Your account is <strong className="text-purple-600">pending teacher approval</strong>.
        </p>
        <div className="bg-purple-50 rounded-2xl p-4 mb-6 text-left space-y-2.5">
          <div className="flex items-center gap-2 text-sm"><CheckCircle size={15} className="text-emerald-500"/><span>Account created</span></div>
          <div className="flex items-center gap-2 text-sm"><Clock size={15} className="text-amber-500"/><span>Waiting for teacher approval</span></div>
        </div>
        <Link href="/login" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          Back to Login
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{background:'linear-gradient(135deg,#2e1065 0%,#4c1d95 50%,#7c3aed 100%)'}}>
      <div className="w-full max-w-sm sm:max-w-md">

        <div className="flex items-center justify-center gap-2.5 mb-6">
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
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Create Account 🎓</h2>
            <p className="text-slate-500 text-sm mb-1">Register as a student</p>

            {isGoogleReg && (
              <div className="flex items-start gap-2 px-3 py-3 rounded-xl mb-4 mt-3"
                style={{background:'#f5f3ff',border:'1px solid #ddd6fe'}}>
                <Info size={14} className="text-purple-500 shrink-0 mt-0.5"/>
                <div className="text-xs text-purple-700">
                  <p><strong>Google:</strong> {googleEmail}</p>
                  <p className="mt-0.5">Fill details & select class. Login with Google after approval.</p>
                </div>
              </div>
            )}
            {!isGoogleReg && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-4 mt-3"
                style={{background:'#f5f3ff',border:'1px solid #ddd6fe'}}>
                <Info size={14} className="text-purple-500 shrink-0 mt-0.5"/>
                <p className="text-xs text-purple-700">Requires <strong>teacher approval</strong> before login.</p>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <Info size={14} className="shrink-0 mt-0.5"/><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">First Name</label>
                  <input type="text" required value={form.firstName}
                    onChange={e=>setForm({...form,firstName:e.target.value})}
                    placeholder="Arun" className="input-field text-base"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Last Name</label>
                  <input type="text" required value={form.lastName}
                    onChange={e=>setForm({...form,lastName:e.target.value})}
                    placeholder="Kumar" className="input-field text-base"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email Address</label>
                <input type="email" required value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})}
                  readOnly={isGoogleReg} placeholder="yourname@gmail.com"
                  className={`input-field text-base ${isGoogleReg ? 'bg-slate-50 cursor-not-allowed' : ''}`}/>
              </div>

              {!isGoogleReg && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input type={showPw?'text':'password'} required minLength={6}
                      value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                      placeholder="Min. 6 characters" className="input-field pr-11 text-base"/>
                    <button type="button" onClick={()=>setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                      {showPw?<EyeOff size={17}/>:<Eye size={17}/>}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Select Class</label>
                <select required value={form.classId}
                  onChange={e=>setForm({...form,classId:e.target.value})}
                  className="input-field text-base">
                  <option value="">-- Choose your class --</option>
                  {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <button type="submit" disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base mt-2">
                {loading
                  ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  : <><UserPlus size={17}/>{isGoogleReg ? 'Complete Registration' : 'Submit Registration'}</>}
              </button>
            </form>
          </div>

          <div className="border-t border-purple-100 px-6 sm:px-8 py-4 text-center"
            style={{background:'#faf5ff'}}>
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-bold hover:underline" style={{color:'#7c3aed'}}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Default export wraps content in Suspense (required for useSearchParams) ──
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{background:'linear-gradient(135deg,#2e1065 0%,#4c1d95 50%,#7c3aed 100%)'}}>
        <div className="w-10 h-10 border-4 border-purple-300 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}