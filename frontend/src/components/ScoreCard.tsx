import type { FinalEvaluation } from "../types/evaluation";
export default function ScoreCard({ result }: { result: FinalEvaluation }) {
  return (
    <section className="card shadow-sm mb-4">
      <div className="card-body p-4">
        <h3 className="h4">
          Total: {result.totalMarks} / {result.maximumMarks}
        </h3>
        <p>{result.percentage}% · Maximum fixed by the approved answer key</p>
        <div
          className="progress"
          role="progressbar"
          aria-label="Total percentage"
          aria-valuenow={result.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-bar"
            style={{ width: `${result.percentage}%` }}
          />
        </div>
        {result.manualReviewRequired && (
          <div className="alert alert-warning mt-3">
            Provisional result — teacher review required. Unreadable or failed
            questions may currently have zero marks; check them before
            finalising.
          </div>
        )}
        {result.warnings.length > 0 && (
          <ul>
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
