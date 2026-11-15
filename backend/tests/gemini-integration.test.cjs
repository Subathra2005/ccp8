const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {readFile}=require('node:fs/promises');
function pdf(){
 const stream='BT /F1 12 Tf 30 150 Td (Total marks 40. Q1: example answer.) Tj ET';
 const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let content='%PDF-1.4\n';const offsets=[0];objs.forEach((o,i)=>{offsets.push(Buffer.byteLength(content));content+=`${i+1} 0 obj\n${o}\nendobj\n`;});
 const xref=Buffer.byteLength(content);content+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(content);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('Gemini web flow uses locked edits, direct PDFs, null scores and stops on quota', {timeout:30000}, async()=>{
 const fs=require('node:fs/promises'); const os=require('node:os'); const path=require('node:path');
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'ccp8-test-'));
 let calls=0;let mode='valid';
 const mock=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  const data=JSON.parse(body);calls++;
  assert.equal(req.url,'/interactions');assert.equal(data.model,'gemini-4-hydrogen');
  assert.equal(data.store,false);assert.equal(req.headers['x-goog-api-key'],'test-secret');
  assert.equal(data.input[0].data,pdf().toString('base64'));
  assert.ok(data.input[1].text.includes('Teacher corrected answer'));
  assert.ok(data.input[1].text.includes('"maximumMarks":4'));
  if(mode==='quota'){res.writeHead(429,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'test-secret quota exhausted'}}));return;}
  const question={question:'1',status:'assessed',source_pages:[1],student_steps_latex:['x=1'],uncertain_symbols:[],method_assessment:'Valid alternate method',final_answer_assessment:'Correct',diagram_assessment:'Not applicable',brief_marking_reason:'Valid working',review_required:mode==='uncertain',criteria:[{id:'Q1',awarded_marks:4,reason:'Correct'}]};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'completed',output_text:JSON.stringify({questions:mode==='missing'?[]:[question]}),usage:{total_tokens:100}}));
 });
 await new Promise(r=>mock.listen(0,'127.0.0.1',r));const port=await freePort();
 // Only the test child redirects the hard-coded Google endpoint to a local stub.
 const preload=path.join(temporary,'mock.cjs');
 await fs.writeFile(preload,`const original=global.fetch;global.fetch=(url,opts)=>original(url==='https://generativelanguage.googleapis.com/v1beta/interactions'?'http://127.0.0.1:${mock.address().port}/interactions':url,opts);`);
 const child=spawn(process.execPath,['--require',preload,'dist/server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),EVALUATION_PROVIDER:'gemini',GEMINI_API_KEY:'test-secret'},stdio:'pipe'});
 let logs='';child.stderr.on('data',c=>logs+=c);const base=`http://127.0.0.1:${port}/api`;
 async function post(p,body){const r=await fetch(base+p,{method:'POST',body});assert.equal(r.status,202);return r.json();}
 async function poll(id){for(let i=0;i<200;i++){const j=await (await fetch(base+'/jobs/'+id)).json();if(j.status==='completed')return j.data;if(j.status==='failed')throw new Error(j.message);await sleep(25);}throw new Error('Timed out');}
 try {
  for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await sleep(30);}
  const health=await (await fetch(base+'/health')).json();assert.equal(health.provider,'gemini');assert.equal(health.model,'gemini-4-hydrogen');assert.ok(!JSON.stringify(health).includes('test-secret'),logs);
  const form=new FormData();form.append('answerKey',new Blob(['Exam\nTOTAL_MARKS: 2\nINTERNAL_CHOICES: none\nBEGIN_RECORD: Q1\nQUESTION_NUMBER: 1\nMARKS: 2\nQUESTION: Solve\nANSWER: Original\nEND_RECORD: Q1']),'key.txt');
  const draft=await poll((await post('/schemes/extract',form)).jobId);assert.equal(calls,0);
  draft.rubric.totalMarks=4;draft.rubric.questions[0].maximumMarks=4;draft.rubric.questions[0].criteria[0].maximumMarks=4;draft.rubric.questions[0].expectedAnswer='Teacher corrected answer';
  assert.equal((await fetch(base+`/schemes/${draft.sessionId}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rubric:draft.rubric,confirmed:true})})).status,200);
  async function batch(count=1,bad=false){const f=new FormData();f.append('sessionId',draft.sessionId);for(let i=0;i<count;i++)f.append('answerSheets',new Blob([bad&&i===1?'not pdf':pdf()],{type:'application/pdf'}),`student${i}.pdf`);return poll((await post('/evaluate',f)).jobId);}
  let r=await batch(2,true);assert.equal(calls,1);assert.equal(r.results[0].data.totalMarks,4);assert.equal(r.results[0].data.provider,'gemini');assert.equal(r.results[0].data.usage.total_tokens,100);assert.equal(r.results[1].success,false);
  mode='uncertain';r=await batch();assert.equal(r.results[0].data.totalMarks,null);assert.equal(r.results[0].data.questions[0].criteria[0].obtainedMarks,null);
  mode='missing';r=await batch();assert.equal(r.results[0].data.totalMarks,null);assert.equal(r.results[0].data.questions[0].status,'not_evaluated');
  mode='quota';const before=calls;r=await batch(3);assert.equal(calls,before+1);assert.ok(r.results.every(x=>!x.success));assert.match(r.results[1].message,/batch stopped/);assert.ok(!JSON.stringify(r).includes('test-secret'));
 } finally {child.kill();await new Promise(r=>child.once('exit',r));await new Promise(r=>mock.close(r));await fs.rm(temporary,{recursive:true,force:true});}
});
