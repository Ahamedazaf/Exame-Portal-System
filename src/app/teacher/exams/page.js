'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, FileText, ChevronDown, ChevronUp, Eye, EyeOff, Lock } from 'lucide-react';

async function safeFetch(url,opts={}) {
  try{const r=await fetch(url,opts);const t=await r.text();return t?JSON.parse(t):{success:false,error:'Empty'};}
  catch(e){return{success:false,error:e.message};}
}

export default function ExamsPage() {
  const [exams,setExams]         = useState([]);
  const [classes,setClasses]     = useState([]);
  const [questions,setQuestions] = useState({});
  const [expanded,setExpanded]   = useState(null);
  const [modal,setModal]         = useState(null);
  const [qModal,setQModal]       = useState(null);
  const [deleteTarget,setDelete] = useState(null);
  const [saving,setSaving]       = useState(false);
  const [form,setForm]           = useState({title:'',classId:'',instructions:'',status:'draft'});
  const [qForm,setQForm]         = useState({text:'',options:['','','',''],correct:0,marks:10,timer:30});

  const hdr = () => ({Authorization:`Bearer ${localStorage.getItem('exame_token')}`,'Content-Type':'application/json'});
  const refresh = () => {
    safeFetch('/api/exams',{headers:hdr()}).then(r=>r.success&&setExams(r.data));
    safeFetch('/api/classes',{headers:hdr()}).then(r=>r.success&&setClasses(r.data));
  };
  useEffect(()=>{refresh();},[]);

  const loadQ = async(examId) => {
    const r = await safeFetch(`/api/questions?examId=${examId}`,{headers:hdr()});
    if(r.success) setQuestions(p=>({...p,[examId]:r.data}));
  };
  const toggleExpand = async(id) => {
    if(expanded===id){setExpanded(null);return;}
    setExpanded(id);
    if(!questions[id]) await loadQ(id);
  };
  const refreshQ = async(id) => { const r=await safeFetch(`/api/questions?examId=${id}`,{headers:hdr()}); if(r.success) setQuestions(p=>({...p,[id]:r.data})); };

  const handleSave = async() => {
    if(!form.title.trim()||!form.classId) return;
    setSaving(true);
    const body = JSON.stringify({...form,classId:Number(form.classId)});
    if(modal==='create') await safeFetch('/api/exams',{method:'POST',headers:hdr(),body});
    else await safeFetch(`/api/exams/${modal.id}`,{method:'PUT',headers:hdr(),body});
    setModal(null); setSaving(false); refresh();
  };

  const cycleStatus = async(exam) => {
    const next={draft:'published',published:'closed',closed:'draft'};
    await safeFetch(`/api/exams/${exam.id}`,{method:'PUT',headers:hdr(),
      body:JSON.stringify({title:exam.title,classId:exam.class_id,instructions:exam.instructions,status:next[exam.status]})});
    refresh();
  };

  const handleSaveQ = async() => {
    if(!qForm.text.trim()) return;
    setSaving(true);
    const body=JSON.stringify({...qForm,examId:qModal.examId});
    if(qModal.question) await safeFetch(`/api/questions/${qModal.question.id}`,{method:'PUT',headers:hdr(),body});
    else await safeFetch('/api/questions',{method:'POST',headers:hdr(),body});
    setQModal(null); setSaving(false); await refreshQ(qModal.examId);
  };

  const statusColors = {draft:'bg-gray-100 text-gray-600',published:'bg-emerald-50 text-emerald-700',closed:'bg-red-50 text-red-600'};
  const updateOpt = (i,v)=>{const o=[...qForm.options];o[i]=v;setQForm({...qForm,options:o});};

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">Exams</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create and manage all your exams</p>
        </div>
        <button onClick={()=>{setForm({title:'',classId:'',instructions:'',status:'draft'});setModal('create');}}
          className="btn-primary flex items-center gap-2 shrink-0"><Plus size={15}/> New Exam</button>
      </div>

      {exams.length===0
        ?<div className="bg-white rounded-2xl border border-slate-100 text-center py-14 text-slate-400"><FileText size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">No exams yet.</p></div>
        :<div className="space-y-3">
          {exams.map(exam=>{
            const qs=questions[exam.id]||[];
            const isExp=expanded===exam.id;
            return (
              <div key={exam.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-4 sm:p-5 flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <FileText size={17} className="text-blue-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{exam.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[exam.status]}`}>{exam.status}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{exam.class_name} · {exam.question_count||0} questions</div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={()=>cycleStatus(exam)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                      {exam.status==='published'?<EyeOff size={15}/>:exam.status==='closed'?<Lock size={15}/>:<Eye size={15}/>}
                    </button>
                    <button onClick={()=>{setForm({title:exam.title,classId:String(exam.class_id),instructions:exam.instructions||'',status:exam.status});setModal(exam);}}
                      className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"><Pencil size={14}/></button>
                    <button onClick={()=>setDelete({type:'exam',id:exam.id})} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                    <button onClick={()=>toggleExpand(exam.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                      {isExp?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
                    </button>
                  </div>
                </div>

                {isExp&&(
                  <div className="border-t border-slate-100 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-700">Questions ({qs.length})</h3>
                      <button onClick={()=>{setQForm({text:'',options:['','','',''],correct:0,marks:10,timer:30});setQModal({examId:exam.id});}}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"><Plus size={13}/> Add</button>
                    </div>
                    {qs.length===0
                      ?<p className="text-sm text-slate-400 text-center py-4">No questions yet.</p>
                      :<div className="space-y-2">
                        {qs.map((q,i)=>(
                          <div key={q.id} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 line-clamp-2">{q.text}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
                                <span>{q.marks} marks</span><span>{q.timer}s</span>
                                <span className="text-emerald-600 font-medium">✓ {q.options?.[q.correct]}</span>
                              </div>
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                              <button onClick={()=>{setQForm({text:q.text,options:[...q.options],correct:q.correct,marks:q.marks,timer:q.timer});setQModal({examId:exam.id,question:q});}}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-500 transition-colors"><Pencil size={13}/></button>
                              <button onClick={()=>setDelete({type:'question',id:q.id,examId:exam.id})}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                            </div>
                          </div>
                        ))}
                      </div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>}

      {/* Exam modal */}
      {modal!==null&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-extrabold text-slate-800 mb-5">{modal==='create'?'Create New Exam':'Edit Exam'}</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Exam Title</label>
                <input type="text" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. JavaScript Basics Test" className="input-field text-base"/></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Assign to Class</label>
                <select value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})} className="input-field text-base">
                  <option value="">-- Select Class --</option>
                  {classes.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Instructions</label>
                <textarea value={form.instructions} rows={3} onChange={e=>setForm({...form,instructions:e.target.value})} placeholder="Exam instructions..." className="input-field resize-none text-base"/></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="input-field text-base">
                  <option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option>
                </select></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3">{saving?'Saving...':'Save Exam'}</button>
              <button onClick={()=>setModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Question modal */}
      {qModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-extrabold text-slate-800 mb-5">{qModal.question?'Edit Question':'Add Question'}</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Question Text</label>
                <textarea value={qForm.text} rows={2} onChange={e=>setQForm({...qForm,text:e.target.value})} placeholder="Enter your question..." className="input-field resize-none text-base"/></div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Answer Options</label>
                <div className="space-y-2">
                  {qForm.options.map((opt,i)=>(
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={qForm.correct===i} onChange={()=>setQForm({...qForm,correct:i})} className="w-4 h-4 accent-blue-600 shrink-0"/>
                      <input type="text" value={opt} onChange={e=>updateOpt(i,e.target.value)} placeholder={`Option ${i+1}`} className="input-field flex-1 text-base"/>
                      {qForm.correct===i&&<span className="text-xs text-emerald-600 font-bold whitespace-nowrap">✓</span>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Select radio = correct answer</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Marks</label>
                  <input type="number" min={1} value={qForm.marks} onChange={e=>setQForm({...qForm,marks:Number(e.target.value)})} className="input-field text-base"/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Timer (sec)</label>
                  <input type="number" min={10} max={300} value={qForm.timer} onChange={e=>setQForm({...qForm,timer:Number(e.target.value)})} className="input-field text-base"/></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveQ} disabled={saving} className="btn-primary flex-1 py-3">{saving?'Saving...':'Save Question'}</button>
              <button onClick={()=>setQModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-fade-in">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-500"/></div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Delete {deleteTarget.type==='exam'?'Exam':'Question'}?</h2>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button className="btn-danger flex-1 py-3" onClick={async()=>{
                if(deleteTarget.type==='exam'){await safeFetch(`/api/exams/${deleteTarget.id}`,{method:'DELETE',headers:hdr()});refresh();}
                else{await safeFetch(`/api/questions/${deleteTarget.id}`,{method:'DELETE',headers:hdr()});await refreshQ(deleteTarget.examId);}
                setDelete(null);
              }}>Delete</button>
              <button className="btn-secondary flex-1 py-3" onClick={()=>setDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
