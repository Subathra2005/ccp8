import fs from 'node:fs/promises';
import { evaluatePdf } from '../../lib/gemini.cjs';
import { FinalEvaluation, Rubric, MistakeType } from '../types/evaluation';
import { validateRubric } from '../utils/rubric';

export function checkGeminiConfiguration() {
  if (!process.env.GEMINI_API_KEY?.trim())
    throw new Error('Add GEMINI_API_KEY to backend/.env and restart the backend.');
}
export function shouldStopBatch(error: unknown): boolean {
  return error instanceof Error && ('stopBatch' in error && error.stopBatch === true || error.name === 'TimeoutError');
}
export async function gradeGeminiSheet(
  rubric: Rubric, file: string, pages: number,
  update: (message: string) => void = () => {},
  fetchImpl: typeof fetch = fetch,
): Promise<FinalEvaluation> {
  validateRubric(rubric, 0);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('Add GEMINI_API_KEY to backend/.env and restart the backend.');
  if ((await fs.stat(file)).size > 10 * 1024 * 1024) throw new Error('Gemini PDF limit: 10 MiB per sheet.');
  update(`Gemini is checking all ${rubric.questions.length} questions against the approved key. One request; no automatic retries.`);
  let report;
  try {
    report = await evaluatePdf({pdf:await fs.readFile(file), rubric, apiKey, pages, fetchImpl});
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      const timeout = new Error('Gemini timed out after 10 minutes. No retry made; check usage before rerunning.');
      timeout.name = 'TimeoutError';
      throw timeout;
    }
    if (error instanceof TypeError) throw new Error('Could not reach Gemini. No automatic retry made; check your connection and usage before rerunning.');
    throw error;
  }
  const result = report.result;
  return {
    provider:'gemini', model:report.model, elapsedSeconds:report.elapsed_seconds, usage:report.usage,
    maximumMarks:rubric.totalMarks, totalMarks:result.total_marks,
    percentage:result.total_marks === null ? null : Math.round(result.total_marks/rubric.totalMarks*10000)/100,
    manualReviewRequired:result.review_required,
    warnings:[...result.warnings, ...(result.review_required ? ['Total withheld until unclear or incomplete question assessments have been reviewed.'] : [])],
    questions:result.questions.map(q=>({
      questionNumber:q.question, maximumMarks:q.maximum_marks, obtainedMarks:q.awarded_marks,
      status:q.status === 'assessed' ? q.awarded_marks === null ? 'unreadable' : q.awarded_marks === q.maximum_marks ? 'correct' : q.awarded_marks === 0 ? 'incorrect' : 'partial' : q.status,
      confidence:q.review_required ? 'low' : 'high', studentAnswer:(q.student_steps_latex || []).join('\n'),
      reason:q.brief_marking_reason + (q.uncertain_symbols?.length ? ` Unclear: ${q.uncertain_symbols.join('; ')}` : ''),
      methodAssessment:q.method_assessment || 'Not evaluated.', finalAnswerAssessment:q.final_answer_assessment || 'Not evaluated.',
      diagramAssessment:q.diagram_assessment || 'Not evaluated.', sourcePages:q.source_pages || [],
      criteria:q.criteria.map(c=>({id:c.id,description:c.description,maximumMarks:c.maximum_marks,obtainedMarks:c.awarded_marks,reason:c.reason,mistakeType:c.mistake_type as MistakeType,learningNote:c.learning_note})),
      counted:q.counted, manualReviewRequired:q.review_required,
    })),
  };
}
