export interface Criterion {
  id: string;
  description: string;
  maximumMarks: number;
}
export interface RubricQuestion {
  id: string;
  question: string;
  expectedAnswer: string;
  maximumMarks: number;
  criteria: Criterion[];
  keyPages: number[];
  diagramRequired: boolean;
}
export interface ChoiceGroup {
  id: string;
  questionIds: string[];
  choose: number;
}
export interface Rubric {
  title: string;
  totalMarks: number;
  questions: RubricQuestion[];
  choiceGroups: ChoiceGroup[];
  instructions: string;
}
export interface PageQuestion {
  questionId: string;
  text: string;
  diagramDescription: string;
  uncertain: boolean;
}
export interface PageEvidence {
  page: number;
  text: string;
  questions: PageQuestion[];
  warnings: string[];
}
export interface CriterionAward {
  id: string;
  obtainedMarks: number;
  reason: string;
}
export interface QuestionEvaluation {
  questionNumber: string;
  maximumMarks: number;
  obtainedMarks: number | null;
  status: "correct" | "partial" | "incorrect" | "unreadable" | "unanswered" | "not_evaluated";
  confidence: "high" | "medium" | "low";
  studentAnswer: string;
  reason: string;
  methodAssessment: string;
  finalAnswerAssessment: string;
  diagramAssessment: string;
  criteria: (Omit<CriterionAward, "obtainedMarks"> & { obtainedMarks: number | null; description: string; maximumMarks: number })[];
  sourcePages: number[];
  counted: boolean | null;
  manualReviewRequired: boolean;
}
export interface FinalEvaluation {
  totalMarks: number | null;
  maximumMarks: number;
  percentage: number | null;
  provider?: string;
  model?: string;
  elapsedSeconds?: number;
  usage?: Record<string, unknown> | null;
  questions: QuestionEvaluation[];
  manualReviewRequired: boolean;
  warnings: string[];
}
export interface SheetResult {
  filename: string;
  success: boolean;
  data?: FinalEvaluation;
  message?: string;
}
