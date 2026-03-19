'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { GraduationCap, Users, FileText, BarChart3, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

async function sf(url,opts={}){try{const r=await fetch(url,opts);const t=await r.text();return t?JSON.parse(t):{success:false};}catch{return{success:false};}}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('exame_token');
    sf('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.success) setData(r.data); setLoading(false); });
  }, []);

  const statusBadge = (s) => {
    const m = { draft:'badge-draft', published:'badge-published', closed:'badge-closed' };
    return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m[s]||''}`}>{s}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/></div>;

  const stats       = data?.stats || {};
  const recentExams = data?.recentExams || [];
  const chartData   = (data?.chartData||[]).map(d=>({name:d.title.length>14?d.title.slice(0,14)+'…':d.title, attempts:Number(d.attempts)}));

  const statCards = [
    { label:'Total Classes',    value:stats.total_classes,   icon:GraduationCap, gradient:'from-violet-500 to-purple-600',  bg:'bg-violet-50 text-violet-600' },
    { label:'Total Students',   value:stats.total_students,  icon:Users,         gradient:'from-blue-500 to-cyan-500',       bg:'bg-blue-50 text-blue-600'    },
    { label:'Total Exams',      value:stats.total_exams,     icon:FileText,      gradient:'from-orange-400 to-pink-500',     bg:'bg-orange-50 text-orange-600'},
    { label:'Results Collected',value:stats.total_results,   icon:BarChart3,     gradient:'from-emerald-400 to-teal-500',    bg:'bg-emerald-50 text-emerald-600'},
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 mt-1 text-sm">Here's your portal overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 card-hover overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 bg-gradient-to-br ${s.gradient}`} style={{transform:'translate(30%,-30%)'}} />
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${s.bg} flex items-center justify-center mb-3 sm:mb-4`}>
              <s.icon size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">{s.value ?? 0}</div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent exams + Chart */}
      <div className="grid lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-purple-100 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-800">Recent Exams</h2>
            <Link href="/teacher/exams" className="text-xs font-semibold hover:underline" style={{color:'#7c3aed'}}>View all</Link>
          </div>
          {recentExams.length === 0
            ? <div className="text-center py-10 text-slate-400 text-sm">No exams yet.</div>
            : <div className="space-y-2.5">
                {recentExams.map(exam => (
                  <div key={exam.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background:'#ede9fe'}}>
                      <FileText size={15} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{exam.title}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {new Date(exam.created_at).toLocaleDateString()} · {exam.class_name}
                      </div>
                    </div>
                    {statusBadge(exam.status)}
                  </div>
                ))}
              </div>}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-purple-100 p-5 sm:p-6">
          <h2 className="text-base font-bold text-slate-800 mb-5">Exam Attempts</h2>
          {chartData.length > 0
            ? <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:'#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius:12, border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="attempts" radius={[6,6,0,0]}
                    fill="url(#purpleGrad)" />
                  <defs>
                    <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            : <div className="text-center py-10 text-slate-400 text-sm">No data yet.</div>}
        </div>
      </div>
    </div>
  );
}
