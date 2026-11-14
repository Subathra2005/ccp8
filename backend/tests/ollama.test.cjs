const {test}=require('node:test');
const assert=require('node:assert/strict');
const {askModel,ModelOutputTruncatedError}=require('../dist/services/ollamaService');
test('truncated text requests retry compactly once, retaining evidence and schema',async()=>{
 const original=global.fetch;const calls=[];
 global.fetch=async(_url,init)=>{const body=JSON.parse(init.body);calls.push(body);return new Response(JSON.stringify(calls.length===1?{done_reason:'length',message:{content:'{"broken"'}}:{done_reason:'stop',message:{content:'{"value":40}'}}));};
 try{
  const schema={type:'object'};const result=await askModel('Preserve these 40 marks',schema,[],{task:'Test rubric',maxTokens:1800});
  assert.deepEqual(result,{value:40});assert.equal(calls.length,2);assert.equal(calls[0].options.num_predict,1800);assert.deepEqual(calls[1].format,schema);assert.match(calls[1].messages[1].content,/40 marks/);assert.match(calls[1].messages[1].content,/previous response reached/);
 }finally{global.fetch=original;}
});
test('page truncation throws a typed error immediately so the caller can split the image',async()=>{
 const original=global.fetch;let count=0;
 global.fetch=async()=>{count++;return new Response(JSON.stringify({done_reason:'length',message:{content:'{"partial":true}'}}));};
 try{await assert.rejects(askModel('Read page',{},['image'],{task:'Key page 2',retryCompact:false,maxTokens:2200}),e=>e instanceof ModelOutputTruncatedError&&e.task==='Key page 2');assert.equal(count,1);}
 finally{global.fetch=original;}
});
test('repeated truncation is bounded and never accepted as valid JSON even if it parses',async()=>{
 const original=global.fetch;let count=0;
 global.fetch=async()=>{count++;return new Response(JSON.stringify({done_reason:'length',message:{content:'{"totalMarks":40}'}}));};
 try{await assert.rejects(askModel('Index',{},[],{task:'Indexing'}),ModelOutputTruncatedError);assert.equal(count,2);}
 finally{global.fetch=original;}
});
test('vision transcription uses unconstrained streamed text, then preserves its equations',async()=>{
 const {readImageText}=require('../dist/services/ollamaService');const original=global.fetch;let body;
 global.fetch=async(_url,init)=>{body=JSON.parse(init.body);return new Response(JSON.stringify({message:{content:'Q16(i): 6 < x ≤ 12, 1 mark\nDiagram: A intersects B.'},done:true,done_reason:'stop'})+'\n');};
 try{const text=await readImageText('Read page','png','Key page 3');assert.match(text,/6 < x ≤ 12/);assert.equal(body.format,undefined);assert.equal(body.stream,true);assert.equal(body.options.temperature,0.2);assert.equal(body.options.num_predict,1600);assert.deepEqual(body.messages[1].images,['png']);}
 finally{global.fetch=original;}
});
test('streaming repetition is cancelled early and never used as evidence',async()=>{
 const {readImageText}=require('../dist/services/ollamaService');const original=global.fetch;let cancelled=false;
 global.fetch=async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify({message:{content:('repeated incorrect transcription line\n').repeat(8)},done:false})+'\n'));},cancel(){cancelled=true;}}));
 try{await assert.rejects(readImageText('Read page','png','Loop test'),ModelOutputTruncatedError);assert.equal(cancelled,true);}
 finally{global.fetch=original;}
});
test('a disconnected text stream cannot silently return a partial transcription',async()=>{
 const {readImageText,hasRepetitiveTail}=require('../dist/services/ollamaService');const original=global.fetch;
 global.fetch=async()=>new Response(JSON.stringify({message:{content:'unfinished evidence'},done:false})+'\n');
 try{await assert.rejects(readImageText('Read page','png','Disconnect'),/before completion/);assert.equal(hasRepetitiveTail('x = 2\nx = 2\nFinal answer: x = 2'),false);}
 finally{global.fetch=original;}
});
