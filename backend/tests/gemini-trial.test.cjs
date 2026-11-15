const {test}=require('node:test');const assert=require('node:assert/strict');
const {runTrial,validateResult}=require('../scripts/gemini-q19.cjs');
const keyText='Exam\nTOTAL_MARKS: 2\nBEGIN_RECORD: Q19\nQUESTION_NUMBER: 19\nMARKS: 2\nQUESTION: Solve quadratic\nANSWER: Both roots\nEND_RECORD: Q19';
const result={question:'19',source_page:3,student_steps_latex:['x=1'],uncertain_symbols:[],method_assessment:'Checked',final_answer_assessment:'Checked',maximum_marks:2,awarded_marks:2,brief_marking_reason:'Valid working',review_required:false};
test('Gemini trial sends PDF and actual key once, and validates response',async()=>{
 let calls=0;const r=await runTrial({pdf:Buffer.from('%PDF-'),keyText,apiKey:'test-secret',pages:5,fetchImpl:async(url,options)=>{
 calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/interactions');const b=JSON.parse(options.body);assert.equal(b.model,'gemini-4-hydrogen');assert.equal(b.store,false);assert.equal(b.input[0].mime_type,'application/pdf');assert.ok(b.input[1].text.includes('Both roots'));assert.ok(b.input[1].text.includes('redundant rewrite'));return new Response(JSON.stringify({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(result)}]}],usage:{total_tokens:100}}));}});
 assert.equal(calls,1);assert.equal(r.result.awarded_marks,2);
});
test('trial rejects invalid scores and makes uncertainty unscored',()=>{
 assert.throws(()=>validateResult({...result,awarded_marks:3},2,5));assert.throws(()=>validateResult({...result,source_page:6},2,5));assert.equal(validateResult({...result,uncertain_symbols:['denominator']},2,5).awarded_marks,null);
});
test('trial reports billing failure without retries or leaking API key',async()=>{
 let calls=0;await assert.rejects(runTrial({pdf:Buffer.from('%PDF-'),keyText,apiKey:'test-secret',pages:5,fetchImpl:async()=>{calls++;return new Response(JSON.stringify({error:{message:'test-secret depleted'}}),{status:402});}}),e=>e.message.includes('402')&&!e.message.includes('test-secret'));assert.equal(calls,1);
});
test('trial rejects incomplete responses',async()=>{
 await assert.rejects(runTrial({pdf:Buffer.from('%PDF-'),keyText,apiKey:'test-secret',pages:5,fetchImpl:async()=>new Response(JSON.stringify({status:'incomplete',output_text:JSON.stringify(result)}))}),/No partial/);
});
