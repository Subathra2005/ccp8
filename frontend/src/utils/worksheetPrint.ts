import katex from 'katex';
import type { Worksheet } from '../types/evaluation';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function mathHtml(text:string):string {
  return text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).map(piece=>{
    if(piece.startsWith('$')&&piece.endsWith('$')) {
      const block=piece.startsWith('$$');const expression=piece.slice(block?2:1,block?-2:-1);
      return katex.renderToString(expression,{displayMode:block,throwOnError:false,trust:false,strict:'ignore',maxExpand:500});
    }
    return escape(piece).replace(/\n/g,'<br>');
  }).join('');
}
export function worksheetDocument(worksheet:Worksheet,teacher:boolean):string {
  const sources=[...new Map(worksheet.questions.filter(q=>q.source).map(q=>[q.source!.url,q.source!])).values()];
  return `<h1>${escape(worksheet.title)}${teacher?' — Teacher key':''}</h1>
    <p>${teacher?'Reviewed teaching copy':'Name: ____________________  Date: ____________'}</p>
    <p>15 questions · ${worksheet.questions.reduce((s,q)=>s+q.marks,0)} marks</p>
    ${teacher?'<p>Generated/adapted practice: verify alternative correct answers during marking.</p>':'<p>Answer all questions. Show working where appropriate.</p>'}
    ${worksheet.questions.map(q=>`<section class="question"><h2>${escape(q.id)}. ${escape(q.lesson)} — ${escape(q.subtopic)} (${q.marks} marks)</h2><div>${mathHtml(q.question)}</div>
      ${teacher?`<p><strong>Answer / expected points</strong></p><div>${mathHtml(q.answer)}</div><p><strong>Marking guidance</strong></p><div>${mathHtml(q.markingGuidance)}</div><p>${q.origin==='retrieved'?'Retrieved/adapted question':'AI-generated question'} · ${q.answerOrigin==='source'?'Source answer':'AI-generated answer'} · ${escape(q.difficulty)}${q.teacherEdited?" · Teacher edited":""}</p>`:'<div class="answer-space"></div>'}
      ${q.source?`<p class="source">Source: ${escape(q.source.title)} — ${escape(q.source.url)} · ${escape(q.source.license)}</p>`:''}</section>`).join('')}
    ${sources.length?'<footer><p>Retrieved/adapted material is attributed above and licensed CC BY-SA 4.0. Source links also provide access to contributor history.</p></footer>':''}`;
}
export async function printWorksheet(worksheet:Worksheet,teacher:boolean) {
  if(!worksheet.reviewed)throw new Error('Approve the worksheet before printing.');
  const iframe=document.createElement('iframe');
  iframe.title=teacher?'Teacher answer key PDF':'Student worksheet PDF';
  iframe.style.cssText='position:fixed;left:-10000px;top:0;width:900px;height:1000px;';
  document.body.appendChild(iframe);
  const doc=iframe.contentDocument!;
  const styles=Array.from(document.querySelectorAll('style,link[rel="stylesheet"]')).map(el=>el.outerHTML).join('');
  doc.open();doc.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${escape(worksheet.title)}${teacher?' — Teacher key':''}</title>${styles}<style>
    body{background:white!important;color:#111;margin:0;font:12pt system-ui,sans-serif;line-height:1.5;padding:1cm;}
    h1{font-size:20pt}h2{font-size:13pt}.question{break-inside:avoid;margin:1em 0 2em}.answer-space{height:5cm}.source{font-size:8pt;overflow-wrap:anywhere}footer{font-size:9pt}.katex-display{overflow:visible!important}
    @page{size:A4;margin:15mm}@media print{body{padding:0}.question{break-inside:avoid}}
    </style></head><body>${worksheetDocument(worksheet,teacher)}</body></html>`);doc.close();
  // Keep print markup separate: student documents never contain answer/marking fields.
  await new Promise<void>(resolve=>{if(doc.readyState==='complete')resolve();else iframe.onload=()=>resolve();});
  await doc.fonts.ready;
  iframe.contentWindow!.focus();iframe.contentWindow!.print();
  setTimeout(()=>iframe.remove(),60000);
}
