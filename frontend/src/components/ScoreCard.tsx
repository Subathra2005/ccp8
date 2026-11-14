import type { FinalEvaluation } from "../types/evaluation";

interface ScoreCardProps {
  result: FinalEvaluation;
}

function ScoreCard({
  result
}: ScoreCardProps) {

  return (
    <div className="card shadow-sm mb-4">

      <div className="card-body p-4">

        <div className="d-flex justify-content-between align-items-center">

          <div>
            <h3 className="mb-1">
              Evaluation Result
            </h3>

            <p className="text-muted mb-0">
              AI-assisted handwritten answer evaluation
            </p>
          </div>

          <div className="text-end">

            <div className="display-5 fw-bold">
              {result.totalMarks}
              <span className="fs-4 text-muted">
                {" "}/ {result.maximumMarks}
              </span>
            </div>

            <div className="text-muted">
              {result.percentage}%
            </div>

          </div>

        </div>

        <hr />

        <div className="progress" style={{ height: "10px" }}>

          <div
            className="progress-bar"
            role="progressbar"
            style={{
              width: `${result.percentage}%`
            }}
          />

        </div>

        {result.manualReviewRequired && (
          <div className="alert alert-warning mt-4 mb-0">

            <strong>
              ⚠ Manual Review Recommended
            </strong>

            <br />

            One or more answers have low
            confidence or unreadable handwriting.

          </div>
        )}

      </div>

    </div>
  );
}

export default ScoreCard;