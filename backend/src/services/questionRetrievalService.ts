import {load} from 'cheerio';
import {LearningTopic, Rubric, WorksheetQuestion} from '../types/evaluation';
export type Candidate = Omit<WorksheetQuestion,'id'> & {candidateId:string};
const API='https://en.wikibooks.org/w/api.php';
const LICENSE='CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/';
const cache=new Map<string,{expires:number;questions:Candidate[]}>();
const words=(s:string):string[]=>Array.from(s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
export function extractQuestions(html:string,title:string,url:string,topic:LearningTopic):Candidate[] {
  const $=load(html);
  $('script,style,nav,footer,.mw-editsection,.navbox,.metadata,.references').remove();
  // Preserve complete formula source instead of flattening MathML layout.
  $('.mwe-math-element').each((_,el)=>{
    const latex=$(el).find('annotation[encoding="application/x-tex"]').text() || $(el).find('img').attr('alt');
    if(latex) $(el).replaceWith($('<span>').text(` $${latex}$ `));
  });
  const found:Candidate[]=[];const seen=new Set<string>();
  const focus=words(topic.subtopic).filter(x=>!['the','and','with','from','for'].includes(x));
  $('li, p, dt').each((_,el)=>{
    if(found.length>=15 || $(el).parents('li,dt').length || $(el).find('img,svg,table,li,p,details').length) return;
    let value=$(el).text().replace(/\s+/g,' ').trim();
    if(value.length<25||value.length>1800 || /(?:figure|diagram|table)\s+(?:below|above|shown|\d)|see\s+(?:above|below)/i.test(value)) return;
    if(!/^(?:(?:question|exercise|problem)\s*\d*\s*[:.)-]?\s*|\d+[.)]\s*)?(?:what|why|how|which|when|where|who|find|calculate|solve|simplify|evaluate|prove|show|explain|describe|define|compare|discuss|write|state|list|identify|name|give|draw|determine)\b/i.test(value)) return;
    // Conservative topic match; broad/ambiguous matches go to generation instead.
    if(focus.length && !focus.some(w=>words(title+' '+value).includes(w))) return;
    if(/^(?:(?:question|exercise|problem)\s*\d*\s*[:.)-]?\s*|\d+[.)]\s*)?(?:what|why|how|which|when|where|who)\b/i.test(value) && !value.includes('?')) return;
    const parts=value.split(/\b(?:Answer|Solution)\s*:\s*/i);value=parts[0].trim();
    if(/(?:\b(?:as|following|below|above)|:)\s*$/i.test(value)) return;
    let answer=parts.length===2?parts[1].trim():'';
    if(!answer && el.tagName==='dt') {const dd=$(el).next('dd');if(!dd.find('img,svg,table').length) answer=dd.text().replace(/^(Answer|Solution)\s*:\s*/i,'').trim();}
    if(answer.length>4000) answer='';
    const signature=value.toLowerCase();if(seen.has(signature))return;seen.add(signature);
    found.push({candidateId:'',topicId:topic.id,lesson:topic.lesson,subtopic:topic.subtopic,question:value,answer,markingGuidance:answer?'Use the source answer; teacher to confirm acceptable equivalents and mark allocation.':'',marks:1,difficulty:'practice',origin:'retrieved',answerOrigin:answer?'source':'generated',source:{title,url,license:LICENSE}});
  });
  return found;
}
async function api(params:Record<string,string>,fetchImpl:typeof fetch,signal:AbortSignal):Promise<any> {
  const url=new URL(API);for(const [k,v] of Object.entries({...params,format:'json',formatversion:'2'}))url.searchParams.set(k,v);
  const response=await fetchImpl(url,{redirect:'error',signal,headers:{'User-Agent':'CCP8-EducationalWorksheet/1.0 (https://github.com/Subathra2005/ccp8)'}});
  if(!response.ok)throw new Error('Free source unavailable.');
  if(!response.body)throw new Error('Empty source response.');
  const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw new Error('Source response too large.');}chunks.push(value);}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(data.error)throw new Error('Source query failed.');return data;
}
export async function retrieveQuestions(rubric:Rubric,topics:LearningTopic[],fetchImpl:typeof fetch=fetch):Promise<{questions:Candidate[];warnings:string[]}> {
  const questions:Candidate[]=[];const warnings:string[]=[];const signal=AbortSignal.timeout(45000);
  // Only curriculum labels leave the app. No names, filenames or student answers.
  for(const topic of topics) {
    const cacheKey=JSON.stringify([rubric.subject,rubric.classLevel,rubric.board,rubric.syllabus,topic.lesson,topic.subtopic]);
    const cached=cache.get(cacheKey);
    if(cached&&cached.expires>Date.now()){questions.push(...cached.questions.map(q=>({...q,topicId:topic.id})));continue;}
    if(signal.aborted){warnings.push('Free retrieval time limit reached; remaining gaps need generation.');break;}
    const found:Candidate[]=[];
    try {
      const query=[rubric.subject,topic.lesson,topic.subtopic,'exercises'].filter(Boolean).join(' ').slice(0,400);
      const search=await api({action:'query',list:'search',srsearch:query,srlimit:'2',srnamespace:'0'},fetchImpl,signal);
      for(const hit of search.query?.search||[]) {
        if(!Number.isSafeInteger(hit.pageid)||typeof hit.title!=='string')continue;
        const parsed=await api({action:'parse',pageid:String(hit.pageid),prop:'text|revid'},fetchImpl,signal);
        if(typeof parsed.parse?.text!=='string')continue;
        const url=`https://en.wikibooks.org/w/index.php?title=${encodeURIComponent(hit.title)}${Number.isSafeInteger(parsed.parse.revid)?`&oldid=${parsed.parse.revid}`:''}`;
        found.push(...extractQuestions(parsed.parse.text,hit.title,url,topic));
      }
      if(cache.size>=100)cache.delete(cache.keys().next().value!);
      cache.set(cacheKey,{expires:Date.now()+3600000,questions:found});questions.push(...found);
    } catch {warnings.push(`Free retrieval unavailable for ${topic.lesson} / ${topic.subtopic}; use generated practice for gaps.`);}
  }
  const unique=new Map<string,Candidate>();
  for(const q of questions)if(!unique.has(q.question.toLowerCase()))unique.set(q.question.toLowerCase(),q);
  return {questions:[...unique.values()].map((q,i)=>({...q,candidateId:`source-${i+1}`})),warnings:[...new Set(warnings), 'Free retrieval uses Wikibooks, not a complete exam-question index. Source questions are topic candidates; confirm class, board, syllabus and difficulty before approval. No claim of exam importance or frequency is made.']};
}
