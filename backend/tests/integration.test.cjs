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
test('PDF image transport, fixed scheme approval and independent batch failures',{timeout:90000},async()=>{
 const calls=[];let studentRead=false;let injectedTruncation=false;let fullPageHeight=0;let cropCount=0;
 const question={id:'1',question:'Example',expectedAnswer:'Example answer',maximumMarks:40,criteria:[{id:'method',description:'Method',maximumMarks:20},{id:'final',description:'Final',maximumMarks:20}],keyPages:[1],diagramRequired:true};
 const mock=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  const data=JSON.parse(body);calls.push(data);const message=data.messages.at(-1),prompt=message.content;
  assert.equal(req.url,'/api/chat');assert.equal(data.options.temperature,data.format===undefined?0.2:0);assert.equal(data.options.seed,42);
  let output;
  if(prompt.startsWith('Read page')){
   if(process.env.SIMULATE_TRUNCATION==='1'&&!injectedTruncation){injectedTruncation=true;fullPageHeight=Buffer.from(message.images[0],'base64').readUInt32BE(20);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({done:true,done_reason:'length',message:{content:'{unfinished'}}));return;}
   if(prompt.includes('cropped region')){cropCount++;assert.ok(Buffer.from(message.images[0],'base64').readUInt32BE(20)<fullPageHeight);}
   assert.equal(message.images.length,1);assert.equal(Buffer.from(message.images[0],'base64').subarray(1,4).toString(),'PNG');
   studentRead=prompt.includes('student answer sheet')||studentRead;
   output='Total marks 40. Question 1: Example answer. Diagram: Example diagram.';
  }else if(prompt.startsWith('Organise this')){
   assert.equal(message.images,undefined);
   output={headerText:'Total marks 40.',questions:[{questionId:'1',text:'Example answer',diagramDescription:'Example diagram',uncertain:false}],warnings:[]};
  }else if(prompt.startsWith('Index this'))output={title:'Test',totalMarks:40,instructions:'No choices',questions:[{id:'1',keyPages:[1]}],choiceGroups:[],warnings:[]};
  else if(prompt.startsWith('Extract ONLY'))output=question;
  else if(prompt.startsWith('Grade ONLY')){
   assert.equal(message.images.length,1);assert.ok(prompt.includes('Half the question maximum PLUS 0.5'));assert.ok(prompt.includes('Early errors'));assert.ok(studentRead);
   output={criteria:[{id:'Q1.method',obtainedMarks:10,reason:'Half the method is justified; remaining step missing.'},{id:'Q1.final',obtainedMarks:10,reason:'Partly correct final answer.'}],confidence:'high',methodAssessment:'Alternative method checked.',finalAnswerAssessment:'Partly correct.',diagramAssessment:'Diagram checked.',reason:'Partial credit.',unreadable:false};
  }else throw new Error('Unexpected model prompt');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({done:true,message:{content:typeof output==='string'?output:JSON.stringify(output)}}));
 });
 await new Promise(r=>mock.listen(0,'127.0.0.1',r));const port=await freePort();
 const child=spawn(process.execPath,['dist/server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(port),OLLAMA_BASE_URL:`http://127.0.0.1:${mock.address().port}`},stdio:'pipe'});
 let logs='';child.stderr.on('data',c=>logs+=c);const base=`http://127.0.0.1:${port}/api`;
 async function request(p,body,method='POST'){const response=await fetch(base+p,{method,body});return {status:response.status,data:await response.json()};}
 async function poll(id){for(let i=0;i<800;i++){const {data}=await request('/jobs/'+id,undefined,'GET');if(data.status==='completed')return data.data;if(data.status==='failed')throw new Error(data.message);await sleep(50);}throw new Error('Job timed out');}
 try{
  for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await sleep(50);}
  assert.equal((await fetch(base+'/health')).status,200,logs);
  assert.equal((await request('/schemes/extract',new FormData())).status,400);
  const wrong=new FormData();wrong.append('answerKey',new Blob(['bad'],{type:'text/plain'}),'bad.txt');assert.equal((await request('/schemes/extract',wrong)).status,400);
  const key=`Example key
TOTAL_MARKS: 40
INTERNAL_CHOICES: none
BEGIN_RECORD: Q1
QUESTION_NUMBER: 1
MARKS: 40
QUESTION: Example
ANSWER: Example answer
DIAGRAM_REQUIRED: true
MARKING_CRITERIA: [{"id":"method","description":"Method","maximumMarks":20},{"id":"final","description":"Final","maximumMarks":20}]
END_RECORD: Q1`;
  const sheet=process.env.TEST_SHEET_PDF?await readFile(process.env.TEST_SHEET_PDF):pdf();
  const form=new FormData();form.append('answerKey',new Blob([key],{type:'text/plain'}),'key.txt');
  const started=await request('/schemes/extract',form);assert.equal(started.status,202);
  const draft=await poll(started.data.jobId);assert.equal(draft.rubric.totalMarks,40);assert.equal(calls.length,0,'TXT key must not call Ollama');
  const approve=async r=>fetch(base+`/schemes/${draft.sessionId}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rubric:r,confirmed:true})});
  assert.equal((await approve({...draft.rubric,totalMarks:50})).status,400);
  assert.equal((await approve(draft.rubric)).status,200);assert.equal((await approve(draft.rubric)).status,400);
  const batch=new FormData();batch.append('sessionId',draft.sessionId);batch.append('answerSheets',new Blob([sheet],{type:'application/pdf'}),'student.pdf');batch.append('answerSheets',new Blob(['not pdf'],{type:'application/pdf'}),'bad.pdf');
  const batchStart=await request('/evaluate',batch);assert.equal(batchStart.status,202);const result=await poll(batchStart.data.jobId);
  assert.equal(result.results.length,2);assert.equal(result.results[0].success,true);assert.equal(result.results[1].success,false);
  const score=result.results[0].data;assert.equal(score.maximumMarks,40);assert.equal(score.totalMarks,20);assert.equal(score.questions[0].criteria[0].reason,'Half the method is justified; remaining step missing.');assert.equal(score.manualReviewRequired,true);
  const imageCalls=calls.filter(c=>c.messages.at(-1).content.startsWith('Read page'));
  assert.ok(imageCalls.length>=1);

  const huge=new FormData();huge.append('answerKey',new Blob([Buffer.alloc(2*1024*1024)],{type:'text/plain'}),'huge.txt');assert.equal((await request('/schemes/extract',huge)).status,413);
  assert.equal((await request('/jobs/missing',undefined,'GET')).status,404);
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));await new Promise(resolve=>mock.close(resolve));}
});
