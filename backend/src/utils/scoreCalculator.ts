import {
  Rubric,
  QuestionEvaluation,
  FinalEvaluation,
} from "../types/evaluation";
import { validateRubric } from "./rubric";
const round = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;
export function calculateFinalScore(
  rubric: Rubric,
  questions: QuestionEvaluation[],
  warnings: string[] = [],
): FinalEvaluation {
  validateRubric(rubric);
  if (
    questions.length !== rubric.questions.length ||
    new Set(questions.map((q) => q.questionNumber)).size !== questions.length
  )
    throw new Error("Incomplete or duplicate question results.");
  const normalized = rubric.questions.map((q) => {
    const result = questions.find((x) => x.questionNumber === q.id);
    if (!result || result.criteria.length !== q.criteria.length)
      throw new Error(`Missing result for ${q.id}.`);
    const criteria = q.criteria.map((c) => {
      const matches = result.criteria.filter((x) => x.id === c.id);
      if (matches.length !== 1 || (typeof matches[0].obtainedMarks !== "number" || !Number.isFinite(matches[0].obtainedMarks)))
        throw new Error(`Invalid score for ${q.id}/${c.id}.`);
      return {
        ...matches[0],
        description: c.description,
        maximumMarks: c.maximumMarks,
        obtainedMarks: round(
          Math.min(c.maximumMarks, Math.max(0, matches[0].obtainedMarks as number)),
        ),
      };
    });
    const obtainedMarks = round(
      criteria.reduce((s, c) => s + c.obtainedMarks, 0),
    );
    const status: QuestionEvaluation["status"] =
      result.status === "unreadable" || result.status === "unanswered"
        ? result.status
        : obtainedMarks === q.maximumMarks
          ? "correct"
          : obtainedMarks === 0
            ? "incorrect"
            : "partial";
    return {
      ...result,
      criteria,
      maximumMarks: q.maximumMarks,
      obtainedMarks,
      status,
      counted: true,
    };
  });
  for (const g of rubric.choiceGroups) {
    // Teacher approval explicitly accepts best-N, including internal OR alternatives.
    const ranked = normalized
      .filter((q) => g.questionIds.includes(q.questionNumber))
      .sort(
        (a, b) =>
          b.obtainedMarks - a.obtainedMarks ||
          rubric.questions.findIndex((q) => q.id === a.questionNumber) -
            rubric.questions.findIndex((q) => q.id === b.questionNumber),
      );
    ranked.forEach((q, i) => {
      q.counted = i < g.choose;
    });
  }
  const totalMarks = round(
    normalized
      .filter((q) => q.counted)
      .reduce((s, q) => s + q.obtainedMarks, 0),
  );
  return {
    totalMarks,
    maximumMarks: rubric.totalMarks,
    percentage: Number(((totalMarks / rubric.totalMarks) * 100).toFixed(2)),
    questions: normalized,
    warnings,
    manualReviewRequired:
      warnings.length > 0 ||
      normalized.some(
        (q) =>
          q.manualReviewRequired ||
          q.confidence === "low" ||
          q.status === "unreadable",
      ),
  };
}
