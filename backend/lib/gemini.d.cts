import type { Rubric } from '../src/types/evaluation';
export interface GeminiQuestion {
  question: string;
  status: 'assessed' | 'unanswered' | 'unreadable' | 'not_evaluated';
  source_pages?: number[];
  student_steps_latex?: string[];
  uncertain_symbols?: string[];
  method_assessment?: string;
  final_answer_assessment?: string;
  diagram_assessment?: string;
  brief_marking_reason: string;
  review_required: boolean;
  criteria: {id:string; awarded_marks:number|null; reason:string; description:string; maximum_marks:number}[];
  maximum_marks:number;
  awarded_marks:number|null;
  counted:boolean|null;
}
export interface GeminiReport {
  model:string;
  elapsed_seconds:number;
  usage:Record<string,unknown>|null;
  result:{maximum_marks:number; total_marks:number|null; review_required:boolean; warnings:string[]; questions:GeminiQuestion[]};
}
export function evaluatePdf(options:{pdf:Buffer; rubric:Rubric; apiKey:string; pages:number; fetchImpl?:typeof fetch}):Promise<GeminiReport>;
export function validateResult(data:unknown,rubric:Rubric,pages:number):GeminiReport['result'];
