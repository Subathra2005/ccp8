import {
  GeminiEvaluationResponse,
  FinalEvaluation
} from "../types/evaluation";

export function calculateFinalScore(
  evaluation: GeminiEvaluationResponse
): FinalEvaluation {

  let totalMarks = 0;
  let maximumMarks = 0;

  let manualReviewRequired = false;

  const questions = evaluation.questions.map((question) => {

    let obtainedMarks = Number(question.obtainedMarks);
    const maxMarks = Number(question.maximumMarks);

    // Protect against invalid AI output
    if (isNaN(obtainedMarks)) {
      obtainedMarks = 0;
    }

    if (isNaN(maxMarks) || maxMarks < 0) {
      throw new Error(
        `Invalid maximum marks for question ${question.questionNumber}`
      );
    }

    // Never allow marks above maximum
    obtainedMarks = Math.min(
      Math.max(obtainedMarks, 0),
      maxMarks
    );

    // Check whether human review is required
    if (
      question.status === "unreadable" ||
      question.confidence === "low"
    ) {
      manualReviewRequired = true;
    }

    totalMarks += obtainedMarks;
    maximumMarks += maxMarks;

    return {
      ...question,
      obtainedMarks
    };
  });

  const percentage =
    maximumMarks === 0
      ? 0
      : Number(
          ((totalMarks / maximumMarks) * 100).toFixed(2)
        );

  return {
    totalMarks,
    maximumMarks,
    percentage,
    questions,
    manualReviewRequired
  };
}