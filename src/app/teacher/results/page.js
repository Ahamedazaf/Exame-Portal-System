'use client';
import { useState, useEffect, useRef } from 'react';
import { BarChart3, Download, ChevronDown, CheckCircle, XCircle, FileText, FileSpreadsheet, X } from 'lucide-react';

async function safeFetch(url, opts = {}) {
  try {
    const res  = await fetch(url, opts);
    const text = await res.text();
    return text ? JSON.parse(text) : { success: false, error: 'Empty response' };
  } catch (e) { return { success: false, error: e.message }; }
}

export default function ResultsPage() {
  const [results, setResults]   = useState([]);
  const [exams, setExams]       = useState([]);
  const [classes, setClasses]   = useState([]);
  const [filterExam, setFilterExam]   = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exportMenu, setExportMenu] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('exame_token');
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      safeFetch('/api/results',  { headers: h }),
      safeFetch('/api/exams',    { headers: h }),
      safeFetch('/api/classes',  { headers: h }),
    ]).then(([r, e, c]) => {
      if (r.success) setResults(r.data);
      if (e.success) setExams(e.data);
      if (c.success) setClasses(c.data);
      setLoading(false);
    });
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    const h = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = results.filter(r => {
    const exam = exams.find(e => e.id === r.exam_id);
    if (filterExam  && String(r.exam_id)    !== filterExam)  return false;
    if (filterClass && String(exam?.class_id) !== filterClass) return false;
    return true;
  });

  const pct   = (r) => r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0;
  const grade = (p) => p >= 80 ? { label:'A', color:'text-emerald-600 bg-emerald-50' }
    : p >= 60 ? { label:'B', color:'text-blue-600 bg-blue-50' }
    : p >= 40 ? { label:'C', color:'text-orange-600 bg-orange-50' }
    : { label:'F', color:'text-red-600 bg-red-50' };

  // ── CSV Export ────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['Student','Email','Exam','Class','Score','Total Marks','Correct','Wrong','Percentage','Date']];
    filtered.forEach(r => {
      rows.push([r.student_name, r.student_email, r.exam_title, r.class_name,
        r.score, r.total_marks, r.correct, r.wrong, pct(r)+'%',
        new Date(r.completed_at).toLocaleDateString()]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(URL.createObjectURL(blob), 'exame_results.csv');
    setExportMenu(false);
  };

  // ── Excel Export (styled with ExcelJS) ───────────────────────
  const exportExcel = async () => {
    setExportMenu(false);
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Exame Portal';
    wb.created = new Date();

    const ws = wb.addWorksheet('Results', { pageSetup: { fitToPage: true } });

    // Column widths
    ws.columns = [
      { header:'',  key:'no',      width:6  },
      { header:'',  key:'student', width:22 },
      { header:'',  key:'email',   width:28 },
      { header:'',  key:'exam',    width:28 },
      { header:'',  key:'class',   width:26 },
      { header:'',  key:'score',   width:12 },
      { header:'',  key:'total',   width:14 },
      { header:'',  key:'correct', width:12 },
      { header:'',  key:'wrong',   width:10 },
      { header:'',  key:'pct',     width:12 },
      { header:'',  key:'grade',   width:10 },
      { header:'',  key:'date',    width:14 },
    ];

    // ── Title row ──────────────────────────────────────────────
    ws.mergeCells('A1:L1');
    const titleCell = ws.getCell('A1');
    titleCell.value = '📊  EXAME PORTAL — RESULTS REPORT';
    titleCell.font  = { name:'Calibri', size:16, bold:true, color:{ argb:'FFFFFFFF' } };
    titleCell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1D4ED8' } };
    titleCell.alignment = { horizontal:'center', vertical:'middle' };
    ws.getRow(1).height = 38;

    // ── Sub-title row ──────────────────────────────────────────
    ws.mergeCells('A2:L2');
    const subCell = ws.getCell('A2');
    subCell.value = `Generated: ${new Date().toLocaleString()}   |   Total Records: ${filtered.length}`;
    subCell.font  = { name:'Calibri', size:10, italic:true, color:{ argb:'FF64748B' } };
    subCell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF0F9FF' } };
    subCell.alignment = { horizontal:'center', vertical:'middle' };
    ws.getRow(2).height = 22;

    // ── Header row ─────────────────────────────────────────────
    const headers = ['#','Student Name','Email','Exam','Class','Score','Total','Correct','Wrong','Percentage','Grade','Date'];
    const headerRow = ws.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font      = { name:'Calibri', size:10, bold:true, color:{ argb:'FFFFFFFF' } };
      cell.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1E40AF' } };
      cell.alignment = { horizontal:'center', vertical:'middle', wrapText:false };
      cell.border    = { bottom:{ style:'medium', color:{ argb:'FF3B82F6' } } };
    });

    // ── Data rows ──────────────────────────────────────────────
    filtered.forEach((r, i) => {
      const p   = pct(r);
      const g   = grade(p);
      const row = ws.addRow([
        i + 1,
        r.student_name,
        r.student_email,
        r.exam_title,
        r.class_name,
        r.score,
        r.total_marks,
        r.correct,
        r.wrong,
        p + '%',
        g.label,
        new Date(r.completed_at).toLocaleDateString(),
      ]);
      row.height = 22;

      // Alternate row background
      const rowBg = i % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
      row.eachCell((cell, colNum) => {
        cell.font      = { name:'Calibri', size:10 };
        cell.alignment = { vertical:'middle', horizontal: colNum === 2 || colNum === 3 || colNum === 4 || colNum === 5 ? 'left' : 'center' };
        cell.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:rowBg } };
        cell.border    = {
          bottom:{ style:'hair', color:{ argb:'FFE2E8F0' } },
          left:  { style:'hair', color:{ argb:'FFE2E8F0' } },
          right: { style:'hair', color:{ argb:'FFE2E8F0' } },
        };
      });

      // Grade cell color
      const gradeCell = row.getCell(11);
      const gradeColors = { A:'FF059669', B:'FF2563EB', C:'FFD97706', F:'FFDC2626' };
      gradeCell.font = { name:'Calibri', size:10, bold:true, color:{ argb:gradeColors[g.label] || 'FF000000' } };

      // Percentage color
      const pctCell = row.getCell(10);
      pctCell.font = {
        name:'Calibri', size:10, bold:true,
        color:{ argb: p >= 60 ? 'FF059669' : p >= 40 ? 'FFD97706' : 'FFDC2626' }
      };
    });

    // ── Summary section ────────────────────────────────────────
    ws.addRow([]);
    const avgRow = ws.addRow(['','Summary','','','',
      `Avg: ${filtered.length ? Math.round(filtered.reduce((a,r)=>a+pct(r),0)/filtered.length) : 0}%`,
      `High: ${filtered.length ? Math.max(...filtered.map(r=>pct(r))) : 0}%`,
      `Low: ${filtered.length ? Math.min(...filtered.map(r=>pct(r))) : 0}%`,
    ]);
    avgRow.eachCell((cell, col) => {
      if (col >= 2 && col <= 8) {
        cell.font = { name:'Calibri', size:10, bold:true, color:{ argb:'FF1D4ED8' } };
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFEFF6FF' } };
      }
    });

    // ── Freeze top rows ────────────────────────────────────────
    ws.views = [{ state:'frozen', ySplit:3 }];

    // Generate & download
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerDownload(URL.createObjectURL(blob), 'exame_results.xlsx');
  };

  // ── PDF Export ────────────────────────────────────────────────
  const exportPDF = async () => {
    setExportMenu(false);
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Title
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('EXAME PORTAL — RESULTS REPORT', pageW / 2, 14, { align: 'center' });

    // Subtitle
    doc.setFillColor(240, 249, 255);
    doc.rect(0, 22, pageW, 9, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Records: ${filtered.length}`, pageW / 2, 28, { align:'center' });

    // Table
    autoTable(doc, {
      startY: 34,
      head: [['#','Student','Email','Exam','Class','Score','%','Grade','Date']],
      body: filtered.map((r, i) => {
        const p = pct(r);
        return [i+1, r.student_name, r.student_email, r.exam_title, r.class_name,
          `${r.score}/${r.total_marks}`, p+'%', grade(p).label,
          new Date(r.completed_at).toLocaleDateString()];
      }),
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign:'center', cellWidth:10 },
        5: { halign:'center' },
        6: { halign:'center', fontStyle:'bold' },
        7: { halign:'center', fontStyle:'bold' },
        8: { halign:'center' },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 6) {
          const v = parseInt(data.cell.raw);
          data.cell.styles.textColor = v >= 60 ? [5,150,105] : v >= 40 ? [217,119,6] : [220,38,38];
        }
        if (data.section === 'body' && data.column.index === 7) {
          const g = data.cell.raw;
          data.cell.styles.textColor = g==='A'?[5,150,105]:g==='B'?[37,99,235]:g==='C'?[217,119,6]:[220,38,38];
        }
      },
      margin: { left:10, right:10 },
      theme: 'striped',
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Exame Portal  ·  Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 5, { align:'center' });
    }

    doc.save('exame_results.pdf');
  };

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">Results</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} result records</p>
        </div>

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button onClick={() => setExportMenu(!exportMenu)}
            className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Export
            <ChevronDown size={13} className={`transition-transform ${exportMenu ? 'rotate-180' : ''}`} />
          </button>
          {exportMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Export As</p>
              </div>
              <button onClick={exportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 transition-colors text-left">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <FileText size={15} className="text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold">CSV File</div>
                  <div className="text-xs text-slate-400">Plain data, any app</div>
                </div>
              </button>
              <button onClick={exportExcel}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 transition-colors text-left border-t border-slate-50">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet size={15} className="text-green-600" />
                </div>
                <div>
                  <div className="font-semibold">Excel (.xlsx)</div>
                  <div className="text-xs text-slate-400">Styled with colors</div>
                </div>
              </button>
              <button onClick={exportPDF}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 transition-colors text-left border-t border-slate-50">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText size={15} className="text-red-600" />
                </div>
                <div>
                  <div className="font-semibold">PDF Report</div>
                  <div className="text-xs text-slate-400">Print-ready, landscape</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={filterExam} onChange={e => setFilterExam(e.target.value)} className="input-field">
          <option value="">All Exams</option>
          {exams.map(e => <option key={e.id} value={String(e.id)}>{e.title}</option>)}
        </select>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="input-field">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
      </div>

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Avg Score', value: Math.round(filtered.reduce((a,r)=>a+pct(r),0)/filtered.length)+'%', color:'text-blue-600' },
            { label:'Highest',   value: Math.max(...filtered.map(r=>pct(r)))+'%', color:'text-emerald-600' },
            { label:'Lowest',    value: Math.min(...filtered.map(r=>pct(r)))+'%', color:'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-5 text-center">
              <div className={`text-2xl sm:text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results table / cards */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {filtered.length === 0
          ? <div className="text-center py-16 text-slate-400">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No results found.</p>
            </div>
          : <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-4">Student</th>
                      <th className="text-left px-5 py-4">Exam</th>
                      <th className="text-left px-5 py-4">Score</th>
                      <th className="text-left px-5 py-4">Grade</th>
                      <th className="text-left px-5 py-4">Date</th>
                      <th className="text-right px-5 py-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(r => {
                      const p = pct(r); const g = grade(p); const isExp = expanded === r.id;
                      return (
                        <>
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                                  {r.student_name?.[0]}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">{r.student_name}</div>
                                  <div className="text-xs text-slate-400">{r.class_name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">{r.exam_title}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">{r.score}/{r.total_marks}</span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{width:`${p}%`}} />
                                </div>
                                <span className="text-xs text-slate-500">{p}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${g.color}`}>{g.label}</span>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-500">{new Date(r.completed_at).toLocaleDateString()}</td>
                            <td className="px-5 py-4 text-right">
                              <button onClick={() => setExpanded(isExp ? null : r.id)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                                <ChevronDown size={16} className={`transition-transform ${isExp?'rotate-180':''}`} />
                              </button>
                            </td>
                          </tr>
                          {isExp && (
                            <tr key={r.id+'_d'}>
                              <td colSpan={6} className="px-5 pb-4">
                                <div className="bg-slate-50 rounded-xl p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Answer Summary</p>
                                    <div className="flex gap-4 text-xs">
                                      <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle size={12}/> {r.correct} correct</span>
                                      <span className="text-red-500 font-semibold flex items-center gap-1"><XCircle size={12}/> {r.wrong} wrong</span>
                                    </div>
                                  </div>
                                  {Array.isArray(r.answers) && (
                                    <div className="grid sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                                      {r.answers.map((ans, i) => (
                                        <div key={i} className={`text-xs p-2.5 rounded-lg flex items-start gap-2 ${ans.isCorrect?'bg-emerald-50':'bg-red-50'}`}>
                                          <span className={`font-bold shrink-0 mt-0.5 ${ans.isCorrect?'text-emerald-600':'text-red-500'}`}>Q{i+1}</span>
                                          <div>
                                            <div className="font-medium text-slate-700 mb-0.5">{ans.questionText}</div>
                                            <div className="text-slate-500">
                                              <span className={ans.isCorrect?'text-emerald-600 font-medium':'text-red-500 font-medium'}>{ans.selected}</span>
                                              {!ans.isCorrect && <span className="text-emerald-600 ml-2">✓ {ans.correctAnswer}</span>}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-50">
                {filtered.map(r => {
                  const p = pct(r); const g = grade(p); const isExp = expanded === r.id;
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {r.student_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">{r.student_name}</div>
                            <div className="text-xs text-slate-500 truncate">{r.exam_title}</div>
                            <div className="text-xs text-slate-400">{new Date(r.completed_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className={`text-sm font-extrabold px-2 py-0.5 rounded-lg ${g.color}`}>{p}%</span>
                            <div className="text-xs text-slate-400 mt-0.5">{r.score}/{r.total_marks}</div>
                          </div>
                          <button onClick={() => setExpanded(isExp ? null : r.id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                            <ChevronDown size={15} className={`transition-transform ${isExp?'rotate-180':''}`} />
                          </button>
                        </div>
                      </div>

                      {isExp && (
                        <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-2">
                          <div className="flex gap-3 text-xs mb-2">
                            <span className="text-emerald-600 font-semibold">✓ {r.correct} correct</span>
                            <span className="text-red-500 font-semibold">✗ {r.wrong} wrong</span>
                          </div>
                          {Array.isArray(r.answers) && r.answers.map((ans, i) => (
                            <div key={i} className={`text-xs p-2 rounded-lg ${ans.isCorrect?'bg-emerald-50':'bg-red-50'}`}>
                              <span className={`font-bold mr-1 ${ans.isCorrect?'text-emerald-600':'text-red-500'}`}>Q{i+1}</span>
                              <span className="text-slate-600">{ans.questionText}</span>
                              <div className="mt-1">
                                <span className={ans.isCorrect?'text-emerald-600 font-medium':'text-red-500 font-medium'}>{ans.selected}</span>
                                {!ans.isCorrect && <span className="text-emerald-600 ml-2">✓ {ans.correctAnswer}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>}
      </div>
    </div>
  );
}
