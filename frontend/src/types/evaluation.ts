export interface Criterion {
  lesson?: string;
  subtopic?: string;
  id: string;
  description: string;
  maximumMarks: number;
}
export interface RubricQuestion {
  lesson?: string;
  subtopic?: string;
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
  subject?: string;
  classLevel?: string;
  board?: string;
  syllabus?: string;
  language?: string;
  lessons?: string[];
  title: string;
  totalMarks: number;
  questions: RubricQuestion[];
  choiceGroups: ChoiceGroup[];
  instructions: string;
}
export interface CriterionAward {
  mistakeType?: MistakeType;
  learningNote?: string;
  id: string;
  obtainedMarks: number | null;
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
  criteria: (CriterionAward & { description: string; maximumMarks: number })[];
  sourcePages: number[];
  counted: boolean | null;
  manualReviewRequired: boolean;
}
export interface FinalEvaluation {
  evaluationId?: string;
  learningReport?: LearningReport;
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

export type MistakeType = 'none' | 'concept' | 'method' | 'formula' | 'calculation' | 'knowledge' | 'expression' | 'incomplete' | 'unknown';
export interface TopicEvidence {
  question: string; criterion: string; earned: number; available: number;
  mistakeType: MistakeType; reason: string;
}
export interface LearningTopic {
  id: string; lesson: string; subtopic: string; earned: number; available: number;
  questionCount: number; needsPractice: boolean; evidence: TopicEvidence[];
}
export interface LearningReport { topics: LearningTopic[]; warnings: string[]; }
export interface WorksheetQuestion {
  teacherEdited?: boolean;
  id: string; topicId: string; lesson: string; subtopic: string;
  question: string; answer: string; markingGuidance: string;
  marks: number; difficulty: 'foundation' | 'practice' | 'challenge';
  origin: 'retrieved' | 'generated'; answerOrigin: 'source' | 'generated';
  source?: {title: string; url: string; license: string};
}
export interface Worksheet {
  id: string; title: string; questions: WorksheetQuestion[];
  warnings: string[]; generatedCount: number; generatedAnswerCount: number;
  usage: Record<string, unknown> | null; reviewed: boolean;
}
