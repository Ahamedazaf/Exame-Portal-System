'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePortal } from '@/context/PortalContext';
import { Lock, Mail, Eye, EyeOff, CheckCircle, AlertCircle, Shield, User, Palette, Upload, X } from 'lucide-react';

async function sf(url, opts = {}) {
  try { const r = await fetch(url, opts); const t = await r.text(); return t ? JSON.parse(t) : { success: false }; }
  catch (e) { return { success: false, error: e.message }; }
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { portalName: ctxName, portalLogoText: ctxLogo, portalTagline: ctxTag, portalLogoUrl: ctxLogoUrl, refresh: refreshPortal } = usePortal();

  const [profile,     setProfile]     = useState(null);
  const [activeTab,   setActiveTab]   = useState('name');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile,    setLogoFile]    = useState(null);

  const [nameForm,   setNameForm]   = useState({ newName: '' });
  const [pwForm,     setPwForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [emailForm,  setEmailForm]  = useState({ newEmail: '', currentPassword: '' });
  const [portalForm, setPortalForm] = useState({ portal_name: '', portal_logo_text: '', portal_tagline: '' });
  const [showPw,     setShowPw]     = useState({ current: false, new: false, confirm: false });
  const [showEPw,    setShowEPw]    = useState(false);

  const token = () => localStorage.getItem('exame_token');
  const hdr   = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  useEffect(() => {
    sf('/api/settings', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => {
        if (r.success) {
          setProfile(r.data);
          setNameForm({ newName: r.data.name || '' });
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user?.role === 'teacher') {
      setPortalForm({ portal_name: ctxName, portal_logo_text: ctxLogo, portal_tagline: ctxTag });
      setLogoPreview(ctxLogoUrl || null);
    }
  }, [ctxName, ctxLogo, ctxTag, ctxLogoUrl, user]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  // Save new token to localStorage after any account change
  const saveNewToken = (newToken) => {
    if (newToken) localStorage.setItem('exame_token', newToken);
  };

  const handleNameChange = async (e) => {
    e.preventDefault();
    if (!nameForm.newName.trim() || nameForm.newName.trim() === profile?.name) return;
    setSaving(true);
    const res = await sf('/api/settings', { method: 'PUT', headers: hdr(),
      body: JSON.stringify({ action: 'change_name', newName: nameForm.newName }) });
    setSaving(false);
    if (res.success) {
      saveNewToken(res.data.newToken);
      showToast('success', '✅ Name updated successfully!');
      setProfile(p => ({ ...p, name: res.data.name }));
      if (setUser) setUser(u => ({ ...u, name: res.data.name }));
    } else showToast('error', res.error || 'Failed to update name');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { showToast('error', '⚠️ Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { showToast('error', '⚠️ Min 6 characters'); return; }
    setSaving(true);
    const res = await sf('/api/settings', { method: 'PUT', headers: hdr(),
      body: JSON.stringify({ action: 'change_password', ...pwForm }) });
    setSaving(false);
    if (res.success) {
      saveNewToken(res.data.newToken); // ← Save new token so user stays logged in
      showToast('success', '✅ Password changed! You are still logged in.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      showToast('error', res.error || 'Failed to change password');
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await sf('/api/settings', { method: 'PUT', headers: hdr(),
      body: JSON.stringify({ action: 'change_email', ...emailForm }) });
    setSaving(false);
    if (res.success) {
      saveNewToken(res.data.newToken); // ← Save new token with new email
      showToast('success', '✅ Email updated successfully! You are still logged in.');
      setProfile(p => ({ ...p, email: emailForm.newEmail.trim().toLowerCase() }));
      setEmailForm({ newEmail: '', currentPassword: '' });
    } else {
      showToast('error', res.error || 'Failed to change email');
    }
  };

  // Logo file handler
  const handleLogoFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('error', 'Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('error', 'Image must be under 2MB'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePortalSettings = async (e) => {
    e.preventDefault();
    if (!portalForm.portal_name?.trim()) { showToast('error', 'Portal name cannot be empty'); return; }
    setSaving(true);

    let logoDataUrl = ctxLogoUrl || null;

    // Convert logo file to base64 if selected
    if (logoFile) {
      const reader = new FileReader();
      logoDataUrl = await new Promise(resolve => {
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(logoFile);
      });
    }

    const res = await sf('/api/portal', {
      method: 'PUT', headers: hdr(),
      body: JSON.stringify({ ...portalForm, portal_logo_url: logoDataUrl }),
    });
    setSaving(false);
    if (res.success) {
      showToast('success', '✅ Portal settings updated!');
      setLogoFile(null);
      refreshPortal();
    } else showToast('error', res.error || 'Failed');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const isGoogle  = profile?.auth_provider === 'google';
  const isTeacher = user?.role === 'teacher';
  const inp = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all";

  const TABS = [
    { id: 'name',     label: 'Change Name', icon: User    },
    ...(!isGoogle ? [{ id: 'password', label: 'Password', icon: Lock }] : []),
    ...(isTeacher && !isGoogle ? [{ id: 'email', label: 'Email', icon: Mail }] : []),
    ...(isTeacher ? [{ id: 'portal', label: 'Portal', icon: Palette }] : []),
  ];

  const pwStrength = (pw) => {
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Too short', color: 'bg-red-400', width: '25%' };
    if (pw.length < 9) return { label: 'Weak', color: 'bg-orange-400', width: '50%' };
    if (pw.length < 12) return { label: 'Medium', color: 'bg-yellow-400', width: '75%' };
    return { label: 'Strong 🛡️', color: 'bg-emerald-400', width: '100%' };
  };
  const strength = pwStrength(pwForm.newPassword);

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in pb-10">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold animate-fade-in ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 flex items-center gap-4">
        <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white font-extrabold text-2xl shrink-0">
          {profile?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold text-slate-800 truncate">{profile?.name}</h2>
          <div className="flex items-center gap-1.5 mt-0.5"><Mail size={12} className="text-slate-400 shrink-0" /><span className="text-sm text-slate-500 truncate">{profile?.email}</span></div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${isTeacher ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              {isTeacher ? '👨‍🏫 Teacher' : '🎓 Student'}
            </span>
            {isGoogle && <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">🔗 Google Account</span>}
          </div>
        </div>
      </div>

      {isGoogle && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700"><strong>Google Account</strong> — Password managed by Google. You can update your display name below.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-w-fit ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <tab.icon size={13} />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Change Name ── */}
      {activeTab === 'name' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
          <h3 className="text-base font-extrabold text-slate-800 mb-5 flex items-center gap-2"><User size={17} className="text-blue-500" /> Change Display Name</h3>
          <form onSubmit={handleNameChange} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Current Name</label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-200">{profile?.name}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">New Name</label>
              <input type="text" required minLength={2} value={nameForm.newName}
                onChange={e => setNameForm({ newName: e.target.value })}
                placeholder="Enter your new name" className={inp} />
            </div>
            <button type="submit" disabled={saving || !nameForm.newName.trim() || nameForm.newName.trim() === profile?.name}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><User size={15} /> Update Name</>}
            </button>
          </form>
        </div>
      )}

      {/* ── Change Password ── */}
      {activeTab === 'password' && !isGoogle && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
          <h3 className="text-base font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Lock size={17} className="text-blue-500" /> Change Password</h3>
          <p className="text-xs text-slate-400 mb-5">After changing, you will stay logged in automatically.</p>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Current Password</label>
              <div className="relative">
                <input type={showPw.current ? 'text' : 'password'} required value={pwForm.currentPassword}
                  onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Enter your current password" className={`${inp} pr-11`} />
                <button type="button" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                  {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {/* New password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">New Password</label>
              <div className="relative">
                <input type={showPw.new ? 'text' : 'password'} required value={pwForm.newPassword}
                  onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Enter new password (min 6 chars)" className={`${inp} pr-11`} />
                <button type="button" onClick={() => setShowPw(p => ({ ...p, new: !p.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                  {showPw.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{strength.label}</p>
                </div>
              )}
            </div>
            {/* Confirm password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
              <div className="relative">
                <input type={showPw.confirm ? 'text' : 'password'} required value={pwForm.confirmPassword}
                  onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  className={`${inp} pr-11 ${pwForm.confirmPassword ? (pwForm.newPassword === pwForm.confirmPassword ? 'border-emerald-300' : 'border-red-300') : ''}`} />
                <button type="button" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                  {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwForm.confirmPassword && (
                <p className={`text-xs mt-1 ${pwForm.newPassword === pwForm.confirmPassword ? 'text-emerald-500' : 'text-red-500'}`}>
                  {pwForm.newPassword === pwForm.confirmPassword ? '✅ Passwords match' : '⚠️ Passwords do not match'}
                </p>
              )}
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {saving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Lock size={15} /> Update Password</>}
            </button>
          </form>
        </div>
      )}

      {/* ── Change Email (Teacher) ── */}
      {activeTab === 'email' && isTeacher && !isGoogle && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
          <h3 className="text-base font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Mail size={17} className="text-blue-500" /> Change Email</h3>
          <p className="text-xs text-slate-400 mb-2">After changing email, you will stay logged in automatically.</p>
          <div className="mb-4 p-3 bg-slate-50 rounded-xl flex items-center gap-2">
            <Mail size={13} className="text-slate-400" />
            <span className="text-sm text-slate-600">Current: <strong>{profile?.email}</strong></span>
          </div>
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">New Email Address</label>
              <input type="email" required value={emailForm.newEmail}
                onChange={e => setEmailForm(p => ({ ...p, newEmail: e.target.value }))}
                placeholder="newemail@example.com" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Current Password (to confirm)</label>
              <div className="relative">
                <input type={showEPw ? 'text' : 'password'} required value={emailForm.currentPassword}
                  onChange={e => setEmailForm(p => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Enter your current password" className={`${inp} pr-11`} />
                <button type="button" onClick={() => setShowEPw(!showEPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                  {showEPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {saving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Mail size={15} /> Update Email</>}
            </button>
          </form>
        </div>
      )}

      {/* ── Portal Settings (Teacher) ── */}
      {activeTab === 'portal' && isTeacher && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
          <h3 className="text-base font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Palette size={17} className="text-blue-500" /> Portal Settings</h3>
          <p className="text-slate-500 text-sm mb-5">Customize the system name, logo, and branding.</p>
          <form onSubmit={handlePortalSettings} className="space-y-5">

            {/* Logo upload */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Portal Logo Image</label>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center overflow-hidden shrink-0 border-2 border-blue-200">
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                    : <span className="text-white font-extrabold text-lg">{portalForm.portal_logo_text || 'EP'}</span>}
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-sm text-slate-500 font-medium">
                    <Upload size={16} className="text-slate-400" />
                    {logoFile ? logoFile.name : 'Upload logo image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                  </label>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG — max 2MB. Square recommended.</p>
                  {logoPreview && logoPreview !== ctxLogoUrl && (
                    <button type="button" onClick={() => { setLogoPreview(ctxLogoUrl || null); setLogoFile(null); }}
                      className="text-xs text-red-500 hover:underline mt-1 flex items-center gap-1">
                      <X size={11} /> Remove new image
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Portal Name</label>
              <input type="text" required value={portalForm.portal_name}
                onChange={e => setPortalForm(p => ({ ...p, portal_name: e.target.value }))}
                placeholder="Exame Portal" className={inp} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Logo Text (fallback, 2-3 chars)</label>
              <input type="text" required maxLength={3} value={portalForm.portal_logo_text}
                onChange={e => setPortalForm(p => ({ ...p, portal_logo_text: e.target.value.toUpperCase() }))}
                placeholder="EP" className={`${inp} uppercase`} />
              <p className="text-xs text-slate-400 mt-1">Shown when no logo image is uploaded</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Tagline</label>
              <input type="text" value={portalForm.portal_tagline}
                onChange={e => setPortalForm(p => ({ ...p, portal_tagline: e.target.value }))}
                placeholder="Online Examination System" className={inp} />
            </div>

            {/* Live preview */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Live Preview</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                    : <span className="text-white font-extrabold text-sm">{portalForm.portal_logo_text || 'EP'}</span>}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-800">{portalForm.portal_name || 'Exame Portal'}</div>
                  <div className="text-xs text-slate-400">{portalForm.portal_tagline || 'Online Examination System'}</div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {saving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Palette size={15} /> Save Portal Settings</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
