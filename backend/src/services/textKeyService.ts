import { Rubric, Criterion } from '../types/evaluation';
import { validateRubric } from '../utils/rubric';
export const MARKING_POLICY = `Follow the approved key's answers, assumptions, selected options and principal-argument convention. Explicit split-ups take priority. Accept valid alternative methods and equivalent forms within those requirements. Be lenient about presentation and minor notation. Worked questions need valid supporting work for full credit even with a correct final answer; MCQs and direct-answer questions do not need unnecessary working. A correctly labelled and filled Venn diagram counts as working without separate algebra. For a wrong final answer, identify where the first substantive error occurs. A small late error earns most marks with a proportionate deduction. Half the question maximum PLUS 0.5 for a correct relevant formula is only a guideline for substantial valid progress, never automatic. Early errors earn only demonstrated valid credit, not an automatic half or formula bonus. A relevant correct formula alone earns at most 0.5. Do not double-count formula credit already included in explicit criteria. Credit valid follow-through without repeatedly penalising one error. Stay within criterion and question maxima. Explain valid work, error location, formula credit and deductions; never guess unreadable work.`;
function fields(text: string): Record<string,string> {
 const result: Record<string,string> = {}; let key='';
 for(const line of text.split('\n')) { const m=/^([A-Z][A-Z_]*):\s*(.*)$/.exec(line);
 if(m){key=m[1]; if(Object.hasOwn(result,key)) throw new Error(`Duplicate field ${key}.`); result[key]=m[2];}
 else if(key && line.trim() && !/^-+$/.test(line)) result[key]+='\n'+line;
 } return result;
}
export function parseTextKey(input:string):{rubric:Rubric;warnings:string[]} {
 if(Buffer.byteLength(input)>1024*1024 || /\u0000|\uFFFD/.test(input)) throw new Error('Use valid UTF-8 TXT, at most 1 MiB.');
 const text=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 const blocks=[...text.matchAll(/^BEGIN_RECORD:\s*([^\n]+)\n([\s\S]*?)^END_RECORD:\s*([^\n]+)$/gm)];
 if(!blocks.length || blocks.length>200 || blocks.length!==(text.match(/^BEGIN_RECORD:/gm)||[]).length || blocks.length!==(text.match(/^END_RECORD:/gm)||[]).length) throw new Error('Use 1–200 complete BEGIN_RECORD / END_RECORD blocks.');
 const header=fields(text.slice(0,blocks[0].index)); const warnings:string[]=[];
 const rubric:Rubric={title:text.split('\n')[0].trim(),totalMarks:Number(header.TOTAL_MARKS),questions:[],choiceGroups:[],instructions:MARKING_POLICY+'\n'+(header.INSTRUCTIONS||'')};
 if(header.CHOICE_GROUPS){try{rubric.choiceGroups=JSON.parse(header.CHOICE_GROUPS);}catch{throw new Error('CHOICE_GROUPS must be a JSON array.');}}
 else if(header.INTERNAL_CHOICES?.trim().toLowerCase()!=='none') warnings.push('Confirm all questions are compulsory, or add choiceGroups before approval.');
 const seen=new Set<string>(); const partsSeen=new Set<string>();
 for(const b of blocks){const record=b[1].trim(); if(record!==b[3].trim() || seen.has(record)) throw new Error(`Duplicate or mismatched record ${record}.`);seen.add(record);
 const f=fields(b[2]); const id=f.QUESTION_NUMBER; const markMatch=/^(\d+(?:\.\d+)?)\s*(?:\([^\n]*\))?$/.exec(f.MARKS || ""); const marks=markMatch ? Number(markMatch[1]) : NaN;
 if(!/^\d+(?:\.[A-Z])?$/.test(id||'') || !f.QUESTION?.trim() || !f.ANSWER?.trim() || !Number.isFinite(marks) || marks<=0) throw new Error(`Provide valid QUESTION_NUMBER, QUESTION, ANSWER and MARKS in ${record}.`);
 const part=f.SUBPART||'none'; const partId=id+':'+part;
 if(partsSeen.has(partId) || (rubric.questions.some(q=>q.id===id) && (part==='none'||partsSeen.has(id+':none')))) throw new Error(`Duplicate question/subpart ${partId}.`); partsSeen.add(partId);
 let criteria:Criterion[];
 if(f.MARKING_CRITERIA){try{criteria=JSON.parse(f.MARKING_CRITERIA);}catch{throw new Error(`Invalid MARKING_CRITERIA in ${record}.`);} if(!Array.isArray(criteria))throw new Error(`Invalid criteria in ${record}.`);criteria=criteria.map(c=>({...c,id:record+'.'+c.id}));}
 else {const split=/(?:Marks breakdown[^:]*:\s*)([^.\n]+)/i.exec(f.SOURCE_NOTE||'');const parts=split?[...split[1].matchAll(/([a-z][a-z ]*?)\s+(\d+(?:\.\d+)?)\s+marks?/gi)]:[];
 criteria=parts.length?parts.map((p,i)=>({id:record+'.'+(i+1),description:p[1].trim(),maximumMarks:Number(p[2])})):[{id:record,description:`Part ${part}: ${f.ANSWER}. Apply flexible partial credit where working is required.`,maximumMarks:marks}];}
 if(Math.abs(criteria.reduce((s,c)=>s+c.maximumMarks,0)-marks)>0.00001)throw new Error(`Criteria in ${record} must sum to ${marks}.`);
 if(f.SOURCE_NOTE)warnings.push(record+': '+f.SOURCE_NOTE);
 if(f.TRANSCRIPTION_CONFIDENCE && f.TRANSCRIPTION_CONFIDENCE!=='high')warnings.push(record+': confirm uncertain transcription.');
 const qt=[f.CASE_STUDY_CONTEXT,`Part ${part}: ${f.QUESTION}`,f.OPTIONS&&'Options: '+f.OPTIONS].filter(Boolean).join('\n');
 const at=`${record}: ${f.ANSWER}\n${f.CORRECT_OPTION?'Required option: '+f.CORRECT_OPTION:''}\nReference steps: ${f.STEPS||'Not supplied.'}`;
 const q=rubric.questions.find(q=>q.id===id);
 if(q){q.maximumMarks+=marks;q.criteria.push(...criteria);q.question+='\n'+qt;q.expectedAnswer+='\n'+at;q.diagramRequired ||= f.DIAGRAM_REQUIRED==='true';}
 else rubric.questions.push({id,question:qt,expectedAnswer:at,maximumMarks:marks,criteria,keyPages:[],diagramRequired:f.DIAGRAM_REQUIRED==='true'});
 }
 if(header.RECORD_COUNT && Number(header.RECORD_COUNT)!==blocks.length)throw new Error('RECORD_COUNT mismatch.');
 validateRubric(rubric,0);warnings.unshift('Review the flexible marking policy. ANSWER and CORRECT_OPTION are authoritative; independent commentary does not override them.');return {rubric,warnings};
}
