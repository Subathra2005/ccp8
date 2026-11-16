import {useState} from 'react';
import {api,waitForJob} from '../api';
import type {FinalEvaluation,Rubric,Worksheet} from '../types/evaluation';
import {printWorksheet} from '../utils/worksheetPrint';
import 'katex/dist/katex.min.css';
export default function LearningWorksheet({result,sessionId,rubric}:{result:FinalEvaluation;sessionId:string;rubric:Rubric}) {
  const report=result.learningReport;
  const [selected,setSelected]=useState<string[]>(report?.topics.filter(t=>t.needsPractice).slice(0,15).map(t=>t.id)||[]);
  const [worksheet,setWorksheet]=useState<Worksheet|null>(null);
  const [editor,setEditor]=useState('');const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);const [progress,setProgress]=useState('');const [error,setError]=useState('');
  if(!report)return null;
  const contextReady=!!(rubric.subject&&rubric.classLevel&&rubric.board);
  async function generate() {
    setBusy(true);setError('');setProgress('Starting free retrieval…');
    try {
      const job=await api<{jobId:string}>(`/schemes/${sessionId}/worksheets`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({evaluationId:result.evaluationId,topicIds:selected})});
      const data=await waitForJob<{worksheet:Worksheet}>(job.jobId,setProgress);
      setWorksheet(data.worksheet);setEditor(JSON.stringify(data.worksheet.questions,null,2));setConfirmed(false);
    } catch(e){setError(e instanceof Error?e.message:'Worksheet failed.');}
    finally{setBusy(false);setProgress('');}
  }
  async function approve() {
    setBusy(true);setError('');
    try {
      const data=await api<{worksheet:Worksheet}>(`/schemes/${sessionId}/worksheets/${worksheet!.id}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questions:JSON.parse(editor),confirmed})});
      setWorksheet(data.worksheet);setEditor(JSON.stringify(data.worksheet.questions,null,2));
    }catch(e){setError(e instanceof Error?e.message:'Invalid worksheet.');}finally{setBusy(false);}
  }
  async function print(teacher:boolean){try{await printWorksheet(worksheet!,teacher);}catch(e){setError(e instanceof Error?e.message:'Could not open print view.');}}
  return <section className="card mb-4"><div className="card-body p-4">
    <h3 className="h4">Lessons and topics to practise</h3>
    <p>Based on assessed work, not a diagnosis of ability. A single question is limited evidence. Calculation slips are shown separately from conceptual gaps.</p>
    {report.warnings.length>0&&<ul>{report.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
    {!report.topics.length&&<p>Add LESSON and SUBTOPIC to your key records and evaluate again to enable topic reports.</p>}
    <div className="table-responsive"><table className="table"><thead><tr><th>Select</th><th>Lesson / subtopic</th><th>Evidence</th><th>Marks</th><th>Practice focus</th></tr></thead><tbody>
      {report.topics.map(t=><tr key={t.id}><td><input type="checkbox" aria-label={`Practise ${t.lesson}: ${t.subtopic}`} disabled={busy} checked={selected.includes(t.id)} onChange={e=>setSelected(e.target.checked?[...selected,t.id]:selected.filter(id=>id!==t.id))}/></td>
        <td><strong>{t.lesson}</strong><br/>{t.subtopic}<br/><small>{t.needsPractice?'Needs practice':'No deduction in assessed work'}</small></td>
        <td>{t.questionCount} question(s): {[...new Set(t.evidence.map(e=>e.question))].join(', ')}</td><td>{t.earned} / {t.available}</td>
        <td>{t.evidence.filter(e=>e.earned<e.available).map(e=><p key={e.criterion}><strong>{e.mistakeType}:</strong> {e.reason} (Q{e.question})</p>)}</td></tr>)}
    </tbody></table></div>
    <h4 className="h5">Personalised worksheet · 15 questions</h4>
    <p>Free Wikibooks retrieval first; Gemini fills missing questions or solutions using additional API quota. Sources may not match your syllabus exactly: review every item. No paid search service is used.</p>
    {!contextReady&&<p className="text-warning">Add SUBJECT, CLASS and BOARD to the key before approval to enable worksheets.</p>}
    <button className="btn btn-primary" disabled={busy||!contextReady||!selected.length||selected.length>15} onClick={generate}>Create 15-question worksheet</button>
    {selected.length>15&&<p>Select at most 15 topics.</p>}
    {busy&&<p role="status">{progress||'Saving review…'}</p>}
    {error&&<p role="alert" className="alert alert-danger mt-3">{error}</p>}
    {worksheet&&<div className="mt-4">
      <h4>{worksheet.title}</h4><p>{15-worksheet.generatedCount} retrieved questions · {worksheet.generatedCount} generated questions · {worksheet.generatedAnswerCount} generated answers</p>
      <ul>{worksheet.warnings.map(w=><li key={w}>{w}</li>)}</ul>
      <ol>{worksheet.questions.map(q=><li key={q.id} className="mb-3"><strong>{q.lesson} / {q.subtopic} · {q.marks} marks · {q.difficulty}</strong><p className="evidence">{q.question}</p><details><summary>Teacher answer and marking guidance</summary><p className="evidence">{q.answer}</p><p className="evidence">{q.markingGuidance}</p></details>{q.source&&<a href={q.source.url} target="_blank" rel="noreferrer">{q.source.title} · {q.source.license}</a>}<p className="small">{q.origin} question · {q.answerOrigin} answer{q.teacherEdited ? " · Teacher edited" : ""}</p></li>)}</ol>
      <details><summary>Edit questions, solutions and marks (JSON)</summary><textarea className="form-control font-monospace mt-2" aria-label="Worksheet questions JSON" rows={20} value={editor} disabled={busy} onChange={e=>{setEditor(e.target.value);setConfirmed(false);setWorksheet({...worksheet,reviewed:false});}}/></details>
      <label className="d-block my-3"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/> I checked the syllabus fit, all 15 questions, answers and marks.</label>
      <button className="btn btn-success me-2" disabled={busy||!confirmed} onClick={approve}>Approve worksheet</button>
      <button className="btn btn-outline-primary me-2" disabled={!worksheet.reviewed||busy} onClick={()=>print(false)}>Student PDF</button>
      <button className="btn btn-outline-primary" disabled={!worksheet.reviewed||busy} onClick={()=>print(true)}>Teacher answer key PDF</button>
      <p className="small mt-2">PDF buttons open your browser’s print dialog. Choose “Save as PDF”. The student version contains no answers.</p>
    </div>}
  </div></section>;
}
