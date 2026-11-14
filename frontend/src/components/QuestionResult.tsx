import type {
  QuestionEvaluation
} from "../types/evaluation";

interface QuestionResultProps {
  question: QuestionEvaluation;
}

function QuestionResult({
  question
}: QuestionResultProps) {

  const getStatusClass = () => {

    switch (question.status) {

      case "correct":
        return "success";

      case "partial":
        return "warning";

      case "incorrect":
        return "danger";

      case "unreadable":
        return "secondary";

      default:
        return "secondary";
    }
  };

  const getStatusIcon = () => {

    switch (question.status) {

      case "correct":
        return "✓";

      case "partial":
        return "◐";

      case "incorrect":
        return "✕";

      case "unreadable":
        return "?";

      default:
        return "";
    }
  };

  return (
    <div className="card shadow-sm mb-3">

      <div className="card-body p-4">

        <div className="d-flex justify-content-between align-items-start">

          <div>

            <h5 className="mb-1">
              Question {question.questionNumber}
            </h5>

            <span
              className={`badge text-bg-${getStatusClass()}`}
            >
              {getStatusIcon()}{" "}
              {question.status.toUpperCase()}
            </span>

          </div>

          <div className="text-end">

            <div className="fw-bold fs-5">
              {question.obtainedMarks}
              {" "}/{" "}
              {question.maximumMarks}
            </div>

            <small className="text-muted">
              Marks
            </small>

          </div>

        </div>

        <hr />

        <div className="mb-3">

          <h6>
            Student's Answer
          </h6>

          <div className="bg-light rounded p-3">

            {question.studentAnswer ? (
              question.studentAnswer
            ) : (
              <span className="text-muted">
                No readable answer detected.
              </span>
            )}

          </div>

        </div>

        <div className="mb-3">

          <h6>
            AI Evaluation
          </h6>

          <p className="mb-0">
            {question.reason}
          </p>

        </div>

        <div>

          <small className="text-muted">

            Confidence:{" "}

            <span className="fw-semibold">
              {question.confidence}
            </span>

          </small>

        </div>

      </div>

    </div>
  );
}

export default QuestionResult;