const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../dist/services/ollamaService');
const pdf=require('../dist/services/pdfService');
const {organiseStudentText}=require('../dist/services/studentTextService');
const {readDocument}=require('../dist/services/evaluationService');
test('question mapping copies all source text exactly without regenerated evidence',async t=>{
 const original=model.askModel;t.after(()=>model.askModel=original);
 model.askModel=async(prompt,format,images,options)=>{assert.equal(images.length,0);assert.equal(options.maxTokens,600);assert.equal(options.retryCompact,false);return {labels:[{line:1,questionId:'1'},{line:3,questionId:'2'}]};};
 const source='Q1\nx = ½ + √3\nQ2\nVenn diagram: A only = 11';
 const result=await organiseStudentText(source,1,['1','2']);
 assert.equal(result.questions.map(q=>q.text).join('\n'),source);
 assert.deepEqual(result.questions.map(q=>q.questionId),['1','2']);
 assert.ok(result.questions[1].diagramDescription);
});
test('mapping truncation retains complete OCR and never triggers another image read',async t=>{
 const originals=[model.askModel,model.readImageText,pdf.renderPage];t.after(()=>{[model.askModel,model.readImageText,pdf.renderPage]=originals;});
 let renders=0,reads=0,maps=0;const png=Buffer.alloc(24);png.writeUInt32BE(900,16);png.writeUInt32BE(1800,20);
 pdf.renderPage=async()=>{renders++;return png.toString('base64');};
 model.readImageText=async()=>{reads++;return 'Q2\nx = 7\nvalid completed evidence';};
 model.askModel=async()=>{maps++;throw new model.ModelOutputTruncatedError('Mapping student page 2');};
 const result=await readDocument('student.pdf',1,'unused','student',()=>{},['2']);
 assert.equal(renders,1);assert.equal(reads,1);assert.equal(maps,1);
 assert.equal(result[0].questions[0].text,'Q2\nx = 7\nvalid completed evidence');
 assert.equal(result[0].questions[0].questionId,'unknown');assert.equal(result[0].questions[0].uncertain,true);
 assert.ok(result[0].warnings.some(w=>w.includes('no image was re-read')));
});
test('invalid boundaries and hallucinated ids preserve text for review',async t=>{
 const original=model.askModel;t.after(()=>model.askModel=original);
 for(const labels of [[{line:2,questionId:'1'}],[{line:1,questionId:'999'}],[{line:1,questionId:'1'},{line:1,questionId:'2'}]]){
 model.askModel=async()=>({labels});const r=await organiseStudentText('Q1\nanswer',1,['1','2']);assert.equal(r.questions[0].text,'Q1\nanswer');assert.equal(r.questions[0].questionId,'unknown');
 }
});
test('long transcripts use bounded text chunks and retain every line',async t=>{
 const original=model.askModel;t.after(()=>model.askModel=original);let calls=0;
 model.askModel=async()=>{calls++;return {labels:[{line:1,questionId:'unknown'}]};};
 const source=Array.from({length:75},(_,i)=>'line '+i).join('\n');const r=await organiseStudentText(source,1);
 assert.equal(calls,3);assert.equal(r.questions.map(q=>q.text).join('\n'),source);
});
