'use client';
import { useState, useEffect } from 'react';
import { Search, Users, ToggleLeft, ToggleRight, CheckCircle, XCircle, Clock, GraduationCap, RefreshCw } from 'lucide-react';

async function safeFetch(url, opts = {}) {
  try { const r = await fetch(url, opts); const t = await r.text(); return t ? JSON.parse(t) : { success: false }; }
  catch (e) { return { success: false, error: e.message }; }
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [search,   setSearch]   = useState('');
  const [filterClass,    setFilterClass]    = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [loading, setLoading] = useState(true);

  const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('exame_token')}`, 'Content-Type': 'application/json' });

  const refresh = async () => {
    setLoading(true);
    const [sRes, cRes] = await Promise.all([
      safeFetch('/api/students', { headers: hdr() }),
      safeFetch('/api/classes',  { headers: hdr() }),
    ]);
    if (sRes.success) setStudents(sRes.data);
    if (cRes.success) setClasses(cRes.data);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const updateStudent = async (id, data) => {
    await safeFetch(`/api/students/${id}`, { method: 'PUT', headers: hdr(), body: JSON.stringify(data) });
    refresh();
  };

  const approve = (s, classId) => updateStudent(s.id, { status: s.status, classId: Number(classId), approvalStatus: 'approved' });
  const reject  = (s) => updateStudent(s.id, { status: s.status, classId: s.class_id, approvalStatus: 'rejected' });
  const toggleStatus = (s) => updateStudent(s.id, { status: s.status === 'active' ? 'blocked' : 'active', classId: s.class_id, approvalStatus: s.approval_status });
  const changeClass  = (s, classId) => updateStudent(s.id, { status: s.status, classId: Number(classId), approvalStatus: s.approval_status });

  const filtered = students.filter(s => {
    const ms = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const mc = !filterClass    || String(s.class_id) === filterClass;
    const ma = !filterApproval || s.approval_status === filterApproval;
    return ms && mc && ma;
  });

  const pending   = students.filter(s => s.approval_status === 'pending').length;
  const approved  = students.filter(s => s.approval_status === 'approved').length;
  const rejected  = students.filter(s => s.approval_status === 'rejected').length;

  const approvalBadge = (status) => {
    if (status === 'pending')  return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock size={11}/>Pending</span>;
    if (status === 'approved') return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle size={11}/>Approved</span>;
    if (status === 'rejected') return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-red-50 text-red-600 border border-red-200"><XCircle size={11}/>Rejected</span>;
    return null;
  };

  // Per-student pending approve modal state
  const [approveModal, setApproveModal] = useState(null); // {student}
  const [selectedClass, setSelectedClass] = useState('');

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">Students</h1>
          <p className="text-slate-500 text-sm mt-0.5">{students.length} registered students</p>
        </div>
        <button onClick={refresh} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Approval', value: pending,  color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock },
          { label: 'Approved',         value: approved, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
          { label: 'Rejected',         value: rejected, color: 'bg-red-50 text-red-600 border-red-200',         icon: XCircle },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl border p-3 sm:p-4 flex items-center gap-3 ${s.color.split(' ')[2] ? 'border-' + s.color.split(' ')[2] : 'border-slate-100'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color.split(' ').slice(0,2).join(' ')}`}>
              <s.icon size={16} />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending approval alert */}
      {pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">{pending} student{pending > 1 ? 's' : ''} waiting for approval</p>
            <p className="text-xs text-amber-600 mt-0.5">Assign a class and approve them to give access to the portal.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name or email..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
        <select value={filterApproval} onChange={e => setFilterApproval(e.target.value)} className="input-field sm:w-44">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="input-field sm:w-56">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading
          ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          : filtered.length === 0
          ? <div className="text-center py-14 text-slate-400"><Users size={36} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No students found.</p></div>
          : <>
              {/* ── Desktop Table ── */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-4">Student</th>
                      <th className="text-left px-5 py-4">Class Assignment</th>
                      <th className="text-left px-5 py-4">Approval</th>
                      <th className="text-left px-5 py-4">Account</th>
                      <th className="text-right px-5 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(s => (
                      <tr key={s.id} className={`transition-colors ${s.approval_status === 'pending' ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {s.name?.[0]}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{s.name}</div>
                              <div className="text-xs text-slate-400">{s.email}</div>
                              {s.auth_provider === 'google' && (
                                <span className="text-xs text-blue-500 font-medium">Google Account</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={String(s.class_id || '')}
                            onChange={e => changeClass(s, e.target.value)}
                            className="text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 w-full transition-all">
                            <option value="">-- Select Class --</option>
                            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-4">{approvalBadge(s.approval_status)}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold badge-${s.status}`}>{s.status}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {s.approval_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    if (!s.class_id) { setApproveModal(s); setSelectedClass(''); }
                                    else approve(s, s.class_id);
                                  }}
                                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors">
                                  <CheckCircle size={13} /> Approve
                                </button>
                                <button onClick={() => reject(s)}
                                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors">
                                  <XCircle size={13} /> Reject
                                </button>
                              </>
                            )}
                            {s.approval_status === 'rejected' && (
                              <button onClick={() => {
                                if (!s.class_id) { setApproveModal(s); setSelectedClass(''); }
                                else approve(s, s.class_id);
                              }}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">
                                <CheckCircle size={13} /> Re-approve
                              </button>
                            )}
                            {s.approval_status === 'approved' && (
                              <button onClick={() => toggleStatus(s)}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors
                                  ${s.status === 'active' ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}>
                                {s.status === 'active'
                                  ? <><ToggleRight size={15} className="text-emerald-500" /> Active</>
                                  : <><ToggleLeft size={15} /> Blocked</>}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile Cards ── */}
              <div className="lg:hidden divide-y divide-slate-50">
                {filtered.map(s => (
                  <div key={s.id} className={`p-4 ${s.approval_status === 'pending' ? 'bg-amber-50/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                        {s.name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                            <p className="text-xs text-slate-400 truncate">{s.email}</p>
                            {s.auth_provider === 'google' && <p className="text-xs text-blue-500 font-medium mt-0.5">Google Account</p>}
                          </div>
                          {approvalBadge(s.approval_status)}
                        </div>

                        {/* Class select */}
                        <div className="mt-2.5">
                          <select value={String(s.class_id || '')} onChange={e => changeClass(s, e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white focus:outline-none focus:border-blue-400">
                            <option value="">-- Select Class --</option>
                            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-2.5">
                          {s.approval_status === 'pending' && (
                            <>
                              <button onClick={() => {
                                if (!s.class_id) { setApproveModal(s); setSelectedClass(''); }
                                else approve(s, s.class_id);
                              }} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                                <CheckCircle size={13} /> Approve
                              </button>
                              <button onClick={() => reject(s)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl">
                                <XCircle size={13} /> Reject
                              </button>
                            </>
                          )}
                          {s.approval_status === 'rejected' && (
                            <button onClick={() => {
                              if (!s.class_id) { setApproveModal(s); setSelectedClass(''); }
                              else approve(s, s.class_id);
                            }} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl">
                              <CheckCircle size={13} /> Re-approve
                            </button>
                          )}
                          {s.approval_status === 'approved' && (
                            <button onClick={() => toggleStatus(s)}
                              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl
                                ${s.status === 'active' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                              {s.status === 'active'
                                ? <><ToggleRight size={14} className="text-emerald-500" /> Active</>
                                : <><ToggleLeft size={14} /> Blocked</>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>}
      </div>

      {/* Approve modal — when no class assigned */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in">
            <h2 className="text-lg font-extrabold text-slate-800 mb-1">Approve Student</h2>
            <p className="text-sm text-slate-500 mb-5">
              Assign a class to <strong>{approveModal.name}</strong> before approving.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                Select Class
              </label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="input-field text-base">
                <option value="">-- Choose a class --</option>
                {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                disabled={!selectedClass}
                onClick={() => {
                  approve(approveModal, selectedClass);
                  setApproveModal(null);
                  setSelectedClass('');
                }}
                className="btn-primary flex-1 py-3 disabled:opacity-50">
                ✅ Approve & Assign
              </button>
              <button onClick={() => { setApproveModal(null); setSelectedClass(''); }}
                className="btn-secondary flex-1 py-3">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
