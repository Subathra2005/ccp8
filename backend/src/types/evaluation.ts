export type EvaluationStatus =
  | "correct"
  | "partial"
  | "incorrect"
  | "unreadable";

export type Confidence =
  | "high"
  | "medium"
  | "low";

export interface QuestionEvaluation {
  questionNumber: number;
  maximumMarks: number;
  obtainedMarks: number;
  status: EvaluationStatus;
  confidence: Confidence;
  studentAnswer: string;
  reason: string;
}

export interface GeminiEvaluationResponse {
  questions: QuestionEvaluation[];
}

export interface FinalEvaluation {
  totalMarks: number;
  maximumMarks: number;
  percentage: number;
  questions: QuestionEvaluation[];
  manualReviewRequired: boolean;
}