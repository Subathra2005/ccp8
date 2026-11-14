const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateRubric}=require('../dist/utils/rubric');
const {calculateFinalScore}=require('../dist/utils/scoreCalculator');
const {inspectPdf}=require('../dist/services/pdfService');
const {writeFile,mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os');
const q=(id,marks)=>({id,question:'Test',expectedAnswer:'Valid answer',maximumMarks:marks,criteria:[{id:'method',description:'Valid method',maximumMarks:marks/2},{id:'final',description:'Correct final answer',maximumMarks:marks/2}],keyPages:[1],diagramRequired:false});
const rubric={title:'Exam',totalMarks:6,instructions:'Answer Q1 and either Q2 or Q3.',questions:[q('1',2),q('2',4),q('3',4)],choiceGroups:[{id:'or',questionIds:['2','3'],choose:1}]};
const result=(q,n)=>({questionNumber:q.id,maximumMarks:999,obtainedMarks:999,status:'partial',confidence:'high',studentAnswer:'x',reason:'test',criteria:q.criteria.map(c=>({...c,obtainedMarks:n,reason:'test'})),sourcePages:[1],counted:true,manualReviewRequired:false});
test('fixed denominator and per-criterion sums ignore model question maxima and totals',()=>{
 const r=calculateFinalScore(rubric,rubric.questions.map((q,i)=>result(q,i===0?1:2)));
 assert.equal(r.maximumMarks,6);assert.equal(r.totalMarks,6);assert.deepEqual(r.questions.map(q=>q.maximumMarks),[2,4,4]);assert.equal(r.questions.filter(q=>q.counted).length,2);
});
test('best N internal choices count once with stable key-order tie breaking',()=>{
 const r=calculateFinalScore(rubric,[result(rubric.questions[0],0),result(rubric.questions[1],1),result(rubric.questions[2],2)]);
 assert.equal(r.totalMarks,4);assert.equal(r.questions[1].counted,false);assert.equal(r.questions[2].counted,true);
 const tie=calculateFinalScore(rubric,rubric.questions.map(q=>result(q,1)));assert.equal(tie.questions[1].counted,true);assert.equal(tie.questions[2].counted,false);
});
test('invalid total, split-ups, non-finite maxima and overlapping choices are rejected',()=>{
 assert.throws(()=>validateRubric({...rubric,totalMarks:40}),/add up/);
 const bad=structuredClone(rubric);bad.questions[0].criteria[0].maximumMarks=5;assert.throws(()=>validateRubric(bad),/Split-ups/);
 const infinite=structuredClone(rubric);infinite.questions[0].maximumMarks=Infinity;assert.throws(()=>validateRubric(infinite));
 assert.throws(()=>validateRubric({...rubric,choiceGroups:[...rubric.choiceGroups,{id:'duplicate',questionIds:['1','2'],choose:1}]}),/non-overlapping/);
});
test('missing/duplicate questions and NaN awards cannot produce a final score',()=>{
 const rr=rubric.questions.map(q=>result(q,1));assert.throws(()=>calculateFinalScore(rubric,rr.slice(1)),/Incomplete/);
 rr[0].criteria[0].obtainedMarks=NaN;assert.throws(()=>calculateFinalScore(rubric,rr),/Invalid score/);
});
test('marks are bounded and low confidence on even an excluded choice flags review',()=>{
 const rr=rubric.questions.map(q=>result(q,999));rr[2].confidence='low';
 const r=calculateFinalScore(rubric,rr);assert.equal(r.totalMarks,6);assert.equal(r.manualReviewRequired,true);
});
test('PDF bytes are checked independently of MIME type',async()=>{
 const dir=await mkdtemp(os.tmpdir()+'/ccp8-test-');try{await writeFile(dir+'/fake.pdf','not a PDF');await assert.rejects(inspectPdf(dir+'/fake.pdf'),/Invalid PDF/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('fractional subpart marks and answer-any-two groups retain the fixed maximum',()=>{
 const fraction={title:'Fractional',totalMarks:9,instructions:'Answer any two.',questions:['20.A','20.B','20.C'].map(id=>q(id,4.5)),choiceGroups:[{id:'any2',questionIds:['20.A','20.B','20.C'],choose:2}]};
 const r=calculateFinalScore(fraction,fraction.questions.map((q,i)=>result(q,i===2?0:2.25)));
 assert.equal(r.totalMarks,9);assert.equal(r.maximumMarks,9);assert.equal(r.questions[2].counted,false);
});
