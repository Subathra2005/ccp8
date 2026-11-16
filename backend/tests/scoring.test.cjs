const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateRubric}=require('../dist/utils/rubric');
const {validateResult}=require('../lib/gemini.cjs');
const {inspectPdf}=require('../dist/services/pdfService');
const {writeFile,mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os');
const q=(id,marks)=>({id,question:'Test',expectedAnswer:'Valid answer',maximumMarks:marks,criteria:[{id:'method',description:'Valid method',maximumMarks:marks/2},{id:'final',description:'Correct final answer',maximumMarks:marks/2}],keyPages:[1],diagramRequired:false});
const rubric={title:'Exam',totalMarks:6,instructions:'Answer Q1 and either Q2 or Q3.',questions:[q('1',2),q('2',4),q('3',4)],choiceGroups:[{id:'or',questionIds:['2','3'],choose:1}]};
const result=(q,n)=>({question:q.id,maximum_marks:999,status:'assessed',source_pages:[1],student_steps_latex:['x'],uncertain_symbols:[],method_assessment:'Valid',final_answer_assessment:'Checked',diagram_assessment:'Not applicable',brief_marking_reason:'Checked',review_required:false,criteria:q.criteria.map(c=>({id:c.id,awarded_marks:n,reason:'Checked'}))});
const calculate=(r,answers)=>validateResult({questions:answers,total_marks:999},r,1);
test('fixed denominator and criterion sums ignore model maxima and totals',()=>{
 const r=calculate(rubric,rubric.questions.map((q,i)=>result(q,i===0?1:2)));
 assert.equal(r.maximum_marks,6);assert.equal(r.total_marks,6);assert.deepEqual(r.questions.map(q=>q.maximum_marks),[2,4,4]);assert.equal(r.questions.filter(q=>q.counted).length,2);
});
test('best N choices count once with stable key-order ties',()=>{
 const r=calculate(rubric,[result(rubric.questions[0],0),result(rubric.questions[1],1),result(rubric.questions[2],2)]);
 assert.equal(r.total_marks,4);assert.equal(r.questions[1].counted,false);assert.equal(r.questions[2].counted,true);
 const tie=calculate(rubric,rubric.questions.map(q=>result(q,1)));assert.equal(tie.questions[1].counted,true);assert.equal(tie.questions[2].counted,false);
});
test('invalid total, split-ups, non-finite maxima and overlapping choices are rejected',()=>{
 assert.throws(()=>validateRubric({...rubric,totalMarks:40}),/add up/);
 const bad=structuredClone(rubric);bad.questions[0].criteria[0].maximumMarks=5;assert.throws(()=>validateRubric(bad),/Split-ups/);
 const infinite=structuredClone(rubric);infinite.questions[0].maximumMarks=Infinity;assert.throws(()=>validateRubric(infinite));
 assert.throws(()=>validateRubric({...rubric,choiceGroups:[...rubric.choiceGroups,{id:'duplicate',questionIds:['1','2'],choose:1}]}),/non-overlapping/);
});
test('non-finite and excessive awards are rejected; unresolved choice withholds total',()=>{
 for(const n of [NaN,Infinity,999])assert.throws(()=>calculate(rubric,rubric.questions.map(q=>result(q,n))));
 const answers=rubric.questions.map(q=>result(q,1));answers[2].review_required=true;
 const r=calculate(rubric,answers);assert.equal(r.total_marks,null);assert.equal(r.questions[1].counted,null);
});
test('PDF bytes are checked independently of MIME type',async()=>{
 const dir=await mkdtemp(os.tmpdir()+'/ccp8-test-');try{await writeFile(dir+'/fake.pdf','not a PDF');await assert.rejects(inspectPdf(dir+'/fake.pdf'),/Invalid PDF/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('fractional subpart marks and answer-any-two groups retain the fixed maximum',()=>{
 const fraction={title:'Fractional',totalMarks:9,instructions:'Answer any two.',questions:['20.A','20.B','20.C'].map(id=>q(id,4.5)),choiceGroups:[{id:'any2',questionIds:['20.A','20.B','20.C'],choose:2}]};
 const r=calculate(fraction,fraction.questions.map((q,i)=>result(q,i===2?0:2.25)));
 assert.equal(r.total_marks,9);assert.equal(r.maximum_marks,9);assert.equal(r.questions[2].counted,false);
});
