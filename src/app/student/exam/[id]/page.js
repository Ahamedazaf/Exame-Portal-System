'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, Maximize, ChevronRight, CheckCircle, Lock } from 'lucide-react';

async function sf(url, opts = {}) {
  try { const r = await fetch(url, opts); const t = await r.text(); return t ? JSON.parse(t) : { success: false, error: 'Empty' }; }
  catch (e) { return { success: false, error: e.message }; }
}

export default function ExamPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase]           = useState('loading');
  const [exam, setExam]             = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [current, setCurrent]       = useState(0);
  const [selected, setSelected]     = useState(null);
  const [timeLeft, setTimeLeft]     = useState(0);
  const [timerExpired, setTimerExpired] = useState(false); // ← NEW: track if timer ended
  const [warning, setWarning]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');

  const timerRef   = useRef(null);
  const answersRef = useRef([]);

  // ── Load exam ─────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user || !id) return;
    const token = localStorage.getItem('exame_token');
    if (!token) { router.replace('/login'); return; }
    const headers = { Authorization: `Bearer ${token}` };

    async function load() {
      const [examRes, qRes, rRes] = await Promise.all([
        sf(`/api/exams/${id}`,       { headers }),
        sf(`/api/questions?examId=${id}`, { headers }),
        sf('/api/results',           { headers }),
      ]);
      if (!examRes.success) { setErrorMsg(examRes.error || 'Exam not found'); setPhase('error'); return; }
      const examData = examRes.data;
      if (examData.status !== 'published')                          { setErrorMsg('This exam is not available.'); setPhase('error'); return; }
      if (Number(examData.class_id) !== Number(user.classId))       { setErrorMsg('This exam is not assigned to your class.'); setPhase('error'); return; }
      if (rRes.success && rRes.data.some(r => Number(r.exam_id) === Number(id))) { setErrorMsg('You have already attempted this exam.'); setPhase('error'); return; }
      if (!qRes.success || !qRes.data?.length)                     { setErrorMsg('This exam has no questions yet.'); setPhase('error'); return; }

      setExam(examData);
      setQuestions(qRes.data);
      answersRef.current = new Array(qRes.data.length).fill(null);
      setPhase('instructions');
    }
    load();
  }, [user, authLoading, id, router]);

  // ── Tab switch anti-cheat ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam') return;
    const handle = () => {
      if (!document.hidden) return;
      setWarning(prev => {
        const next = (prev || 0) + 1;
        if (next >= 2) doSubmit(answersRef.current);
        return next;
      });
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [phase]);

  const startExam = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setPhase('exam');
    setTimeLeft(questions[0]?.timer || 30);
    setTimerExpired(false);
  };

  // ── Countdown timer ───────────────────────────────────────────
  // When timer hits 0 → mark expired → auto advance
  useEffect(() => {
    if (phase !== 'exam') return;
    clearInterval(timerRef.current);
    setTimerExpired(false); // reset for each question

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerExpired(true); // ← timer done, allow/auto-advance
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, phase]);

  // ── Auto-advance when timer expires ──────────────────────────
  useEffect(() => {
    if (!timerExpired || phase !== 'exam') return;
    // Small delay so user sees "Time's up!" feedback
    const t = setTimeout(() => moveNext(), 1200);
    return () => clearTimeout(t);
  }, [timerExpired]);

  const moveNext = useCallback(() => {
    clearInterval(timerRef.current);
    const updated = [...answersRef.current];
    updated[current] = selected;
    answersRef.current = updated;

    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      doSubmit(updated);
    } else {
      setCurrent(nextIdx);
      setSelected(null);
      setTimeLeft(questions[nextIdx]?.timer || 30);
      setTimerExpired(false);
    }
  }, [current, questions, selected]);

  // Manual next — only allowed when timer has expired
  const handleNext = () => {
    if (!timerExpired) return; // blocked until timer ends
    moveNext();
  };

  const doSubmit = async (finalAnswers) => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    document.exitFullscreen?.().catch(() => {});
    try {
      const token = localStorage.getItem('exame_token');
      await sf('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ examId: Number(id), answers: finalAnswers }),
      });
    } catch {}
    setPhase('done');
  };

  // ── Screens ───────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-slate-500 text-sm">Loading exam...</p></div>
    </div>
  );

  if (phase === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center animate-fade-in">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={28} className="text-red-500" /></div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Cannot Start Exam</h2>
        <p className="text-slate-500 text-sm mb-6">{errorMsg}</p>
        <button onClick={() => router.push('/student/dashboard')} className="btn-primary w-full py-3">← Back to Dashboard</button>
      </div>
    </div>
  );

  if (phase === 'instructions') return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg animate-fade-in overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center">
          <div className="text-4xl mb-2">📋</div>
          <h1 className="text-xl font-extrabold">{exam?.title}</h1>
          <p className="text-blue-200 text-sm mt-1">{exam?.instructions || 'Read each question carefully.'}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Questions',   value: questions.length },
              { label: 'Total Marks', value: questions.reduce((a,q) => a+q.marks, 0) },
              { label: 'Avg Time',    value: Math.round(questions.reduce((a,q) => a+q.timer, 0)/questions.length)+'s' },
            ].map(s => (
              <div key={s.label} className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-xl font-extrabold text-blue-700">{s.value}</div>
                <div className="text-xs text-blue-500">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Important rule about timer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
            <p className="text-xs font-bold text-amber-700 mb-1">⏱️ Timer Rule</p>
            <p className="text-xs text-amber-600">Each question has its own timer. The <strong>"Next" button is locked</strong> until the timer runs out. You can select your answer anytime — it will be submitted automatically when time ends.</p>
          </div>
          <div className="space-y-2 mb-6">
            {['One question shown at a time','Cannot go back to previous questions','Switching tabs may auto-submit exam','Exam runs in fullscreen mode'].map((r,i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>{r}
              </div>
            ))}
          </div>
          <button onClick={startExam} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Maximize size={16} /> Start Exam Now
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'done') return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center animate-fade-in">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Exam Submitted!</h1>
        <p className="text-slate-500 text-sm mb-2">{exam?.title}</p>
        <p className="text-slate-400 text-xs mb-8">Your answers have been saved. Check your dashboard for results.</p>
        <button onClick={() => router.push('/student/dashboard')} className="btn-primary w-full py-3">← Back to Dashboard</button>
      </div>
    </div>
  );

  // ── Exam UI ───────────────────────────────────────────────────
  const q             = questions[current];
  const totalTimer    = q?.timer || 30;
  const timerPct      = timeLeft / totalTimer;
  const circumference = 2 * Math.PI * 28;
  const dashOffset    = circumference * (1 - timerPct);
  const timerColor    = timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : '#60a5fa';
  const isLastQ       = current + 1 === questions.length;

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)' }}>

      {/* Tab switch warning */}
      {warning >= 1 && warning < 2 && (
        <div className="bg-orange-500 text-white text-xs font-bold text-center py-2 px-4 animate-fade-in">
          ⚠️ Tab switch detected! One more will AUTO-SUBMIT your exam.
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-blue-300 text-xs">Q {current+1} / {questions.length}</p>
          <p className="text-white text-sm font-bold truncate">{exam?.title}</p>
        </div>
        {/* Dot progress */}
        <div className="hidden md:flex gap-1.5 mr-4 flex-wrap max-w-xs">
          {questions.map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < current ? 'bg-emerald-400' : i === current ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
        {/* Timer circle */}
        <div className="relative shrink-0" style={{ width:64, height:64 }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="4"/>
            <circle cx="32" cy="32" r="28" fill="none" stroke={timerColor} strokeWidth="4"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dashoffset 1s linear, stroke 0.5s' }}/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ color: timerColor }} className="font-extrabold text-base leading-none">
              {timerExpired ? '✓' : timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl animate-fade-in">

          {/* Timer expired banner */}
          {timerExpired && (
            <div className="bg-emerald-500 text-white text-xs sm:text-sm font-bold text-center py-2 px-4 rounded-t-2xl sm:rounded-t-3xl animate-fade-in">
              ✅ Time's up! Moving to next question...
            </div>
          )}

          <div className="px-5 sm:px-7 pt-5 sm:pt-7 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{q?.marks} marks</span>
              <div className="flex items-center gap-2">
                {!timerExpired && (
                  <span className="text-xs text-slate-400 font-medium">{timeLeft}s remaining</span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${timerExpired ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {timerExpired ? '✅ Time done' : '⏱️ Timer running'}
                </span>
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed">{q?.text}</h2>
          </div>

          <div className="p-4 sm:p-6 space-y-2.5">
            {q?.options?.map((opt, i) => (
              <button key={i} onClick={() => setSelected(i)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 active:scale-[0.99]
                  ${selected === i ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'}`}>
                <span className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 transition-all ${selected === i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {selected === i && <CheckCircle size={15} className="text-blue-500 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-1 space-y-2">
            {/* Next button - locked until timer expires */}
            <button
              onClick={handleNext}
              disabled={!timerExpired || submitting}
              className={`w-full py-3.5 text-sm sm:text-base font-bold flex items-center justify-center gap-2 rounded-xl transition-all
                ${timerExpired
                  ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              {submitting
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : timerExpired
                ? isLastQ ? '✅ Submit Exam' : <>Next Question <ChevronRight size={16} /></>
                : <><Lock size={15} /> Waiting for timer...</>}
            </button>

            {/* Helper text */}
            {!timerExpired && (
              <p className="text-center text-xs text-slate-400">
                {selected !== null
                  ? `✅ Answer selected — waiting for timer (${timeLeft}s)`
                  : `⏱️ Select your answer · Timer will auto-advance (${timeLeft}s)`}
              </p>
            )}
            {timerExpired && selected === null && (
              <p className="text-center text-xs text-orange-500">⚠️ No answer selected — will be marked as skipped</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom progress */}
      <div className="h-1.5 bg-white/10 shrink-0">
        <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>
    </div>
  );
}
