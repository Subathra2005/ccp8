import type { FinalEvaluation } from "../types/evaluation";
export default function ScoreCard({ result }: { result: FinalEvaluation }) {
  return (
    <section className="card shadow-sm mb-4">
      <div className="card-body p-4">
        <h3 className="h4">
          Total: {result.totalMarks === null ? "Pending review" : result.totalMarks} / {result.maximumMarks}
        </h3>
        <p>{result.percentage === null ? "No final percentage yet" : `${result.percentage}%`} · Maximum fixed by the approved answer key</p>
        {result.model && <p className="text-muted">{result.model} · {result.elapsedSeconds} seconds</p>}
        {result.percentage !== null && <div
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
        </div>}
        {result.manualReviewRequired && (
          <div className="alert alert-warning mt-3">
            Teacher review required. Check flagged answers against the original PDF before finalising.
            {result.totalMarks === null && " Unresolved answers are unscored; the total is withheld."}
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
