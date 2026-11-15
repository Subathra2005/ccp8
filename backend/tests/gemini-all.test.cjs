const {test}=require('node:test');const assert=require('node:assert/strict');
const {runTrial,validateResult}=require('../scripts/gemini-all.cjs');
const {parseTextKey}=require('../dist/services/textKeyService');
const keyText='Exam\nTOTAL_MARKS: 4\n'+['1','2'].map(id=>`BEGIN_RECORD: Q${id}\nQUESTION_NUMBER: ${id}\nMARKS: 2\nQUESTION: Solve\nANSWER: Both roots\nEND_RECORD: Q${id}`).join('\n');
const {rubric}=parseTextKey(keyText);
const valid=()=>({questions:rubric.questions.map(q=>({question:q.id,status:'assessed',source_pages:[1],student_steps_latex:['x=1'],uncertain_symbols:[],method_assessment:'Valid',final_answer_assessment:'Correct',diagram_assessment:'Not applicable',brief_marking_reason:'Valid working',review_required:false,criteria:q.criteria.map(c=>({id:c.id,awarded_marks:c.maximumMarks,reason:'Correct'}))}))});
test('all-question trial transmits full PDF and key once; totals locked to key',async()=>{
 let calls=0;const report=await runTrial({pdf:Buffer.from('%PDF-'),keyText,apiKey:'secret',pages:5,fetchImpl:async(url,opts)=>{
 calls++;const b=JSON.parse(opts.body);assert.equal(b.input[0].data,Buffer.from('%PDF-').toString('base64'));assert.ok(b.input[1].text.includes('"id":"2"'));assert.equal(b.model,'gemini-4-hydrogen');assert.equal(b.store,false);
 return new Response(JSON.stringify({status:'completed',output_text:JSON.stringify({...valid(),total_marks:100})}));}});
 assert.equal(calls,1);assert.equal(report.result.total_marks,4);assert.equal(report.result.maximum_marks,4);
});
test('missing, unclear or review-needed work withholds total and marks',()=>{
 const data=valid();data.questions.pop();let r=validateResult(data,rubric,5);assert.equal(r.total_marks,null);assert.equal(r.questions[1].status,'not_evaluated');
 for(const mutate of [q=>q.uncertain_symbols.push('denominator'),q=>q.review_required=true,q=>q.source_pages=[]]) {
 const d=valid();mutate(d.questions[0]);r=validateResult(d,rubric,5);assert.equal(r.total_marks,null);assert.equal(r.questions[0].criteria[0].awarded_marks,null);
 }
});
test('rejects inflated marks, duplicate questions, missing split-ups and bad page references',()=>{
 for(const mutate of [d=>d.questions[0].criteria[0].awarded_marks=3,d=>d.questions.push(d.questions[0]),d=>d.questions[0].criteria=[],d=>d.questions[0].source_pages=[6]]) {
 const d=valid();mutate(d);assert.throws(()=>validateResult(d,rubric,5));
 }
});
test('confirmed unanswered work can score zero; internal choices count best N',()=>{
 const d=valid();d.questions[0].status='unanswered';d.questions[0].source_pages=[];d.questions[0].student_steps_latex=[];d.questions[0].criteria.forEach(c=>c.awarded_marks=0);
 assert.equal(validateResult(d,rubric,5).total_marks,2);
 const choice={...rubric,totalMarks:2,choiceGroups:[{id:'or',questionIds:['1','2'],choose:1}]};
 const r=validateResult(valid(),choice,5);assert.equal(r.total_marks,2);assert.equal(r.questions[0].counted,true);assert.equal(r.questions[1].counted,false);
});
test('incomplete response and quota failure never retry or expose API key',async()=>{
 for(const status of [200,429]) {let calls=0;await assert.rejects(runTrial({pdf:Buffer.from('%PDF-'),keyText,apiKey:'secret',pages:5,fetchImpl:async()=>{calls++;return new Response(JSON.stringify(status===200?{status:'incomplete',output_text:JSON.stringify(valid())}:{error:{message:'secret quota'}}),{status});}}),e=>!e.message.includes('secret'));assert.equal(calls,1);}
});
