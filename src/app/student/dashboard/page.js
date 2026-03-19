'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FileText, CheckCircle, Clock, Award, BookOpen, ChevronRight, RefreshCw, Zap } from 'lucide-react';

async function sf(url, opts={}) {
  try { const r=await fetch(url,opts); const t=await r.text(); return t?JSON.parse(t):{success:false}; }
  catch(e){return{success:false};}
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [exams,     setExams]     = useState([]);
  const [results,   setResults]   = useState([]);
  const [className, setClassName] = useState('');
  const [loading,   setLoading]   = useState(true);

  const load = () => {
    if (!user) return;
    const token = localStorage.getItem('exame_token');
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      sf('/api/exams',   { headers: h }),
      sf('/api/results', { headers: h }),
      sf('/api/classes', { headers: h }),
    ]).then(([eR, rR, cR]) => {
      if (eR.success) setExams(eR.data);
      if (rR.success) setResults(rR.data);
      if (cR.success) {
        const cls = cR.data.find(c => Number(c.id) === Number(user.classId));
        setClassName(cls?.name || '');
      }
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, [user]);

  const hasAttempted = (examId) => results.some(r => Number(r.exam_id) === Number(examId));
  const getResult    = (examId) => results.find(r => Number(r.exam_id) === Number(examId));
  const pct = (r) => r && r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0;

  const pending   = exams.filter(e => !hasAttempted(e.id));
  const completed = exams.filter(e => hasAttempted(e.id));

  const gradeInfo = (p) => {
    if (p >= 80) return { label:'A', color:'text-emerald-600', bg:'bg-emerald-50 border-emerald-200' };
    if (p >= 60) return { label:'B', color:'text-blue-600',    bg:'bg-blue-50 border-blue-200' };
    if (p >= 40) return { label:'C', color:'text-orange-600',  bg:'bg-orange-50 border-orange-200' };
    return         { label:'F', color:'text-red-600',    bg:'bg-red-50 border-red-200' };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">

      {/* Hero card */}
      <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden"
        style={{background:'linear-gradient(135deg,#4c1d95 0%,#6d28d9 50%,#7c3aed 100%)'}}>
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{background:'white'}} />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10" style={{background:'white'}} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={14} className="text-purple-200" />
            <span className="text-purple-200 text-xs font-medium truncate">{className || 'Student'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold mb-1">Hi, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-purple-200 text-sm">Ready to ace your exams today?</p>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5">
            {[
              { label:'Assigned',  value: exams.length,     icon:'📚' },
              { label:'Completed', value: completed.length, icon:'✅' },
              { label:'Pending',   value: pending.length,   icon:'⏳' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-2.5 sm:p-3 text-center backdrop-blur-sm"
                style={{background:'rgba(255,255,255,0.12)'}}>
                <div className="text-lg sm:text-2xl mb-0.5">{s.icon}</div>
                <div className="text-lg sm:text-2xl font-extrabold">{s.value}</div>
                <div className="text-xs text-purple-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending exams */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Zap size={16} className="text-orange-500" /> Pending Exams
          </h2>
          <button onClick={load} className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 font-medium">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {pending.length === 0
          ? <div className="bg-white rounded-2xl border border-purple-100 text-center py-10">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-slate-500 text-sm font-medium">All exams completed! Great job!</p>
            </div>
          : <div className="space-y-3">
              {pending.map(exam => (
                <div key={exam.id} className="bg-white rounded-2xl border border-purple-100 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 card-hover">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{background:'linear-gradient(135deg,#ede9fe,#ddd6fe)'}}>
                    <FileText size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{exam.title}</h3>
                    {exam.instructions && <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">{exam.instructions}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium border border-purple-200">
                        {exam.question_count || '?'} questions
                      </span>
                    </div>
                  </div>
                  <Link href={`/student/exam/${exam.id}`}
                    className="btn-primary flex items-center gap-1 shrink-0 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5">
                    Start <ChevronRight size={14} />
                  </Link>
                </div>
              ))}
            </div>}
      </div>

      {/* Completed exams */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-slate-800 mb-3 flex items-center gap-2">
            <Award size={16} className="text-purple-500" /> Completed Exams
          </h2>
          <div className="space-y-3">
            {completed.map(exam => {
              const r = getResult(exam.id);
              const p = pct(r);
              const g = gradeInfo(p);
              return (
                <div key={exam.id} className="bg-white rounded-2xl border border-purple-100 p-4 sm:p-5">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{background:'linear-gradient(135deg,#d1fae5,#a7f3d0)'}}>
                      <CheckCircle size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{exam.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-2 rounded-full overflow-hidden max-w-28 sm:max-w-40" style={{background:'#ede9fe'}}>
                          <div className="h-full rounded-full transition-all" style={{width:`${p}%`, background:'linear-gradient(90deg,#7c3aed,#a855f7)'}} />
                        </div>
                        <span className="text-xs text-slate-500">{r?.score}/{r?.total_marks} pts</span>
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold px-2.5 py-1 rounded-xl border shrink-0 ${g.color} ${g.bg}`}>
                      {g.label} · {p}%
                    </span>
                  </div>

                  {r && (
                    <div className="mt-3 pt-3 border-t border-purple-50 grid grid-cols-3 gap-2 text-center">
                      {[
                        { label:'Score',   val:`${r.score}/${r.total_marks}`, color:'text-purple-600' },
                        { label:'Correct', val:r.correct, color:'text-emerald-600' },
                        { label:'Wrong',   val:r.wrong,   color:'text-red-500' },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl py-1.5" style={{background:'#faf5ff'}}>
                          <div className={`text-sm font-bold ${s.color}`}>{s.val}</div>
                          <div className="text-xs text-slate-400">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
