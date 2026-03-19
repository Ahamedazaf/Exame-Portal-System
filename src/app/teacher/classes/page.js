'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GraduationCap, ToggleLeft, ToggleRight } from 'lucide-react';

async function safeFetch(url, opts={}) {
  try { const r=await fetch(url,opts); const t=await r.text(); return t?JSON.parse(t):{success:false,error:'Empty'}; }
  catch(e){return{success:false,error:e.message};}
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({ name:'', status:'active' });
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving]   = useState(false);

  const headers = () => ({ Authorization:`Bearer ${localStorage.getItem('exame_token')}`, 'Content-Type':'application/json' });
  const refresh = () => safeFetch('/api/classes',{headers:headers()}).then(r=>r.success&&setClasses(r.data));
  useEffect(()=>{refresh();},[]);

  const openCreate = () => { setForm({name:'',status:'active'}); setModal('create'); };
  const openEdit   = (c) => { setForm({name:c.name,status:c.status}); setModal(c); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (modal==='create') await safeFetch('/api/classes',{method:'POST',headers:headers(),body:JSON.stringify(form)});
    else await safeFetch(`/api/classes/${modal.id}`,{method:'PUT',headers:headers(),body:JSON.stringify(form)});
    setModal(null); setSaving(false); refresh();
  };

  const handleDelete = async () => {
    await safeFetch(`/api/classes/${deleteId}`,{method:'DELETE',headers:headers()});
    setDeleteId(null); refresh();
  };

  const toggleStatus = async (c) => {
    await safeFetch(`/api/classes/${c.id}`,{method:'PUT',headers:headers(),
      body:JSON.stringify({name:c.name,status:c.status==='active'?'inactive':'active'})});
    refresh();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">Classes / Batches</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your class groups and batches</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus size={15}/> New Class
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {classes.length===0
          ? <div className="text-center py-14 text-slate-400"><GraduationCap size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">No classes yet.</p></div>
          : <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-4">Class Name</th>
                      <th className="text-left px-5 py-4">Status</th>
                      <th className="text-left px-5 py-4">Created</th>
                      <th className="text-right px-5 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {classes.map(c=>(
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                              <GraduationCap size={15} className="text-blue-500"/>
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4"><span className={`text-xs px-2.5 py-1 rounded-full font-semibold badge-${c.status}`}>{c.status}</span></td>
                        <td className="px-5 py-4 text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={()=>toggleStatus(c)} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">
                              {c.status==='active'?<ToggleRight size={18} className="text-emerald-500"/>:<ToggleLeft size={18}/>}
                            </button>
                            <button onClick={()=>openEdit(c)} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"><Pencil size={14}/></button>
                            <button onClick={()=>setDeleteId(c.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-50">
                {classes.map(c=>(
                  <div key={c.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <GraduationCap size={18} className="text-blue-500"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{c.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold badge-${c.status}`}>{c.status}</span>
                        <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={()=>toggleStatus(c)} className="p-2 text-slate-400 rounded-lg">
                        {c.status==='active'?<ToggleRight size={18} className="text-emerald-500"/>:<ToggleLeft size={18}/>}
                      </button>
                      <button onClick={()=>openEdit(c)} className="p-2 text-slate-400 rounded-lg"><Pencil size={14}/></button>
                      <button onClick={()=>setDeleteId(c.id)} className="p-2 text-slate-400 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </>}
      </div>

      {/* Modal */}
      {modal!==null&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in">
            <h2 className="text-lg font-extrabold text-slate-800 mb-5">{modal==='create'?'Create New Class':'Edit Class'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Class Name</label>
                <input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                  placeholder="e.g. Computer Science Batch 01" className="input-field text-base"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="input-field text-base">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3">{saving?'Saving...':'Save'}</button>
              <button onClick={()=>setModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-fade-in">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-500"/></div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Class?</h2>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger flex-1 py-3">Delete</button>
              <button onClick={()=>setDeleteId(null)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
