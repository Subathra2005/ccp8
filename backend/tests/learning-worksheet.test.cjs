const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseTextKey}=require('../dist/services/textKeyService');
const {validateRubric}=require('../dist/utils/rubric');
const {buildLearningReport}=require('../dist/services/learningService');
const {extractQuestions,retrieveQuestions}=require('../dist/services/questionRetrievalService');
const {createWorksheet,reviewWorksheet}=require('../dist/services/worksheetService');
const key=`Exam
SUBJECT: Science
CLASS: 8
BOARD: CBSE
LESSONS: ["Nutrition"]
TOTAL_MARKS: 2
INTERNAL_CHOICES: none
BEGIN_RECORD: Q1
QUESTION_NUMBER: 1
LESSON: Nutrition
SUBTOPIC: Vitamins
MARKS: 2
QUESTION: Explain vitamins
ANSWER: Expected points
END_RECORD: Q1`;
const {rubric}=parseTextKey(key);
const result=()=>({questions:[{questionNumber:'1',status:'partial',counted:true,manualReviewRequired:false,obtainedMarks:1,criteria:[{id:'Q1',maximumMarks:2,obtainedMarks:1,reason:'Missing points',mistakeType:'knowledge',learningNote:'Revise vitamin functions'}]}],warnings:[]});
const topic=buildLearningReport(rubric,result()).topics[0];
const candidate=(i,answer='Source answer')=>({candidateId:`s${i}`,topicId:topic.id,lesson:topic.lesson,subtopic:topic.subtopic,question:`Explain vitamin function number ${i}?`,answer,markingGuidance:answer?'Expected points':'',marks:1,difficulty:'practice',origin:'retrieved',answerOrigin:answer?'source':'generated',source:{title:'Nutrition exercise',url:'https://en.wikibooks.org/wiki/Nutrition',license:'CC BY-SA 4.0'}});
test('key metadata preserves criterion mappings and rejects undeclared lessons',()=>{
 assert.equal(rubric.classLevel,'8');assert.equal(rubric.questions[0].criteria[0].subtopic,'Vitamins');
 const invalid=structuredClone(rubric);invalid.questions[0].criteria[0].lesson='Other';assert.throws(()=>validateRubric(invalid,0),/not in/);
 const old=parseTextKey(key.replace(/^(SUBJECT|CLASS|BOARD|LESSONS|LESSON|SUBTOPIC):.*\n/gm,''));assert.equal(old.rubric.totalMarks,2);
});
test('topic report uses locked metadata and valid counted evidence only',()=>{
 let r=buildLearningReport(rubric,result());assert.equal(r.topics[0].earned,1);assert.equal(r.topics[0].available,2);assert.equal(r.topics[0].needsPractice,true);
 for(const patch of [{counted:false},{counted:null},{obtainedMarks:null},{manualReviewRequired:true},{status:'unanswered'},{status:'unreadable'}]){const d=result();Object.assign(d.questions[0],patch);assert.equal(buildLearningReport(rubric,d).topics.length,0);}
 const d=result();d.questions[0].criteria[0].obtainedMarks=2;assert.equal(buildLearningReport(rubric,d).topics[0].needsPractice,false);
});
test('retrieval extracts self-contained questions and source answers; rejects missing figures and HTML',()=>{
 const html='<script>secret()</script><p>When vitamins are consumed, the following description is expressed as</p><ol><li>Explain the role of vitamins in a healthy diet? Answer: Vitamins support normal body functions.</li><li>Calculate vitamins from the figure below?</li><li><img src="x">Explain vitamin structure?</li></ol><dl><dt>Why are vitamins needed for good health?</dt><dd>They support growth and metabolism.</dd></dl>';
 const qs=extractQuestions(html,'Nutrition Vitamins','https://en.wikibooks.org/wiki/Nutrition',topic);assert.equal(qs.length,2);assert.ok(qs.every(q=>q.answer&&!q.question.includes('<')));assert.ok(qs.every(q=>q.source.license.includes('CC BY-SA')));
});
test('free retrieval uses only fixed wiki API and curriculum terms, not student evidence',async()=>{
 const urls=[];const retrieval=await retrieveQuestions({...rubric,subject:'Unique test'},[{...topic,evidence:[{reason:'PRIVATE_STUDENT_TEXT'}]}],async url=>{urls.push(String(url));const u=new URL(url);assert.equal(u.hostname,'en.wikibooks.org');assert.ok(!String(url).includes('PRIVATE_STUDENT_TEXT'));return new Response(JSON.stringify(u.searchParams.get('action')==='query'?{query:{search:[{pageid:12,title:'Vitamins'}]}}:{parse:{revid:123,text:'<p>Explain how vitamins help the body? Answer: They support normal functions.</p>'}}));});
 assert.equal(urls.length,2);assert.equal(retrieval.questions.length,1);assert.ok(retrieval.questions[0].source.url.includes('oldid=123'));
});
test('15 complete retrieved items require no Gemini call',async()=>{
 let calls=0;const w=await createWorksheet(rubric,[topic],()=>{},{retrieve:async()=>({questions:Array.from({length:15},(_,i)=>candidate(i)),warnings:[]}),generate:async()=>{calls++;throw new Error('Must not call');}});
 assert.equal(calls,0);assert.equal(w.questions.length,15);assert.equal(w.generatedCount,0);assert.equal(w.reviewed,false);
});
test('fallback fills only missing questions/answers in one call; provenance stays server-owned',async()=>{
 let calls=0;const w=await createWorksheet(rubric,[topic],()=>{},{retrieve:async()=>({questions:[candidate(1),candidate(2,'')],warnings:['Limited coverage']}),generate:async({input,responseSchema})=>{
 calls++;assert.equal(input.length,1);const ids=responseSchema.properties.questions.items.properties.id.enum;assert.equal(ids.length,14);
 return {usage:{total_tokens:20},result:{questions:ids.map(id=>({id,question:id==='2'?candidate(2).question:`Describe a new vitamin example ${id}?`,answer:'Generated answer',markingGuidance:'One mark for correct explanation.',marks:1,difficulty:'practice'}))}};
 }});
 assert.equal(calls,1);assert.equal(w.generatedCount,13);assert.equal(w.generatedAnswerCount,14);assert.equal(w.questions[1].origin,'retrieved');assert.equal(w.questions[1].answerOrigin,'generated');assert.equal(w.questions[0].answerOrigin,'source');
 const edits=structuredClone(w.questions);edits[0].question='Teacher revised question?';edits[0].source={url:'https://evil.test'};
 const reviewed=reviewWorksheet(w,edits,true);assert.equal(reviewed.reviewed,true);assert.equal(reviewed.questions[0].source.url,w.questions[0].source.url);assert.throws(()=>reviewWorksheet(w,edits,false));
});
test('fallback failure never returns partial worksheet; invalid IDs and changed source questions rejected',async()=>{
 for(const mode of ['missing','duplicate','changed'])await assert.rejects(createWorksheet(rubric,[topic],()=>{},{retrieve:async()=>({questions:[candidate(1,'')],warnings:[]}),generate:async()=>({usage:null,result:{questions:mode==='missing'?[]:Array.from({length:15},(_,i)=>({id:mode==='duplicate'?'1':String(i+1),question:`Changed question ${i}`,answer:'Answer',markingGuidance:'One mark',marks:1,difficulty:'practice'}))}})}));
});
