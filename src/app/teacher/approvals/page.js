'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, GraduationCap, RefreshCw, Users } from 'lucide-react';

async function sf(url, opts = {}) {
  try { const r = await fetch(url, opts); const t = await r.text(); return t ? JSON.parse(t) : { success: false }; }
  catch (e) { return { success: false }; }
}

export default function ApprovalsPage() {
  const [students, setStudents] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [approveModal, setApproveModal] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');

  const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('exame_token')}`, 'Content-Type': 'application/json' });

  const refresh = async () => {
    setLoading(true);
    const [sRes, cRes] = await Promise.all([
      sf('/api/students', { headers: hdr() }),
      sf('/api/classes',  { headers: hdr() }),
    ]);
    if (sRes.success) setStudents(sRes.data.filter(s => s.approval_status === 'pending'));
    if (cRes.success) setClasses(cRes.data);
    setLoading(false);
    // Mark notifications as read
    sf('/api/notifications', { method: 'PUT', headers: hdr() });
  };
  useEffect(() => { refresh(); }, []);

  const approve = async (s, classId) => {
    await sf(`/api/students/${s.id}`, { method: 'PUT', headers: hdr(),
      body: JSON.stringify({ status: 'active', classId: Number(classId), approvalStatus: 'approved' }) });
    refresh();
  };
  const reject = async (s) => {
    await sf(`/api/students/${s.id}`, { method: 'PUT', headers: hdr(),
      body: JSON.stringify({ status: s.status, classId: s.class_id, approvalStatus: 'rejected' }) });
    refresh();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">Student Approvals</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {students.length} student{students.length !== 1 ? 's' : ''} waiting for approval
          </p>
        </div>
        <button onClick={refresh} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading
        ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        : students.length === 0
        ? <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-300" />
            <h2 className="text-lg font-bold text-slate-700 mb-1">All caught up!</h2>
            <p className="text-slate-400 text-sm">No students are pending approval.</p>
          </div>
        : <div className="space-y-3">
            {students.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-amber-200 bg-amber-50/30 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {s.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">{s.name}</h3>
                        <p className="text-sm text-slate-500">{s.email}</p>
                        {s.auth_provider === 'google' && (
                          <span className="text-xs text-blue-500 font-medium">Google Account</span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        <Clock size={11} /> Pending
                      </span>
                    </div>

                    {/* Class assignment */}
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                        Assign Class
                      </label>
                      <select
                        value={String(s.class_id || '')}
                        onChange={async e => {
                          const classId = e.target.value;
                          if (classId) {
                            await sf(`/api/students/${s.id}`, { method: 'PUT', headers: hdr(),
                              body: JSON.stringify({ status: s.status, classId: Number(classId), approvalStatus: 'pending' }) });
                            refresh();
                          }
                        }}
                        className="input-field text-sm max-w-xs">
                        <option value="">-- Select class --</option>
                        {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          if (s.class_id) approve(s, s.class_id);
                          else { setApproveModal(s); setSelectedClass(''); }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors">
                        <CheckCircle size={15} /> Approve
                      </button>
                      <button onClick={() => reject(s)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors">
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>}

      {/* Modal for approve without class */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in">
            <h2 className="text-lg font-extrabold text-slate-800 mb-1">Select Class</h2>
            <p className="text-sm text-slate-500 mb-5">Assign a class to <strong>{approveModal.name}</strong></p>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="input-field text-base mb-5">
              <option value="">-- Choose a class --</option>
              {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
            <div className="flex gap-3">
              <button disabled={!selectedClass}
                onClick={() => { approve(approveModal, selectedClass); setApproveModal(null); }}
                className="btn-primary flex-1 py-3 disabled:opacity-50">✅ Approve & Assign</button>
              <button onClick={() => setApproveModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
