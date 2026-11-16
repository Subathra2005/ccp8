import {createHash} from 'node:crypto';
import {FinalEvaluation, LearningReport, LearningTopic, Rubric} from '../types/evaluation';
export function buildLearningReport(rubric: Rubric, result: FinalEvaluation): LearningReport {
  const topics=new Map<string,LearningTopic>();
  const warnings=new Set<string>();
  for(const q of result.questions) {
    if(q.counted!==true || q.manualReviewRequired || q.obtainedMarks===null || ['unanswered','unreadable','not_evaluated'].includes(q.status)) {
      warnings.add('Unanswered, unresolved and uncounted choice answers are excluded from weakness claims.');continue;
    }
    const reference=rubric.questions.find(r=>r.id===q.questionNumber);
    for(const c of q.criteria) {
      if(c.obtainedMarks===null) continue;
      const expected=reference?.criteria.find(x=>x.id===c.id);
      const lesson=expected?.lesson||reference?.lesson, subtopic=expected?.subtopic||reference?.subtopic;
      if(!lesson||!subtopic){warnings.add(`Q${q.questionNumber}: lesson/subtopic mapping missing; add it to the key for future reports.`);continue;}
      const id=createHash('sha256').update(JSON.stringify([lesson,subtopic])).digest('hex').slice(0,16);
      const topic=topics.get(id)||{id,lesson,subtopic,earned:0,available:0,questionCount:0,needsPractice:false,evidence:[]};
      topic.earned+=c.obtainedMarks;topic.available+=c.maximumMarks;
      topic.evidence.push({question:q.questionNumber,criterion:c.id,earned:c.obtainedMarks,available:c.maximumMarks,mistakeType:c.mistakeType||'unknown',reason:c.learningNote||c.reason});
      topics.set(id,topic);
    }
  }
  for(const t of topics.values()) {
    t.earned=Math.round(t.earned*10000)/10000;t.available=Math.round(t.available*10000)/10000;
    t.questionCount=new Set(t.evidence.map(e=>e.question)).size;t.needsPractice=t.earned<t.available;
  }
  if(result.warnings.some(w=>w.includes('Unmatched model question'))) warnings.add('Question mapping needs review; treat the topic report as provisional.');
  return {topics:[...topics.values()].sort((a,b)=>Number(b.needsPractice)-Number(a.needsPractice)||a.earned/a.available-b.earned/b.available),warnings:[...warnings]};
}
