import type { QuestionEvaluation } from "../types/evaluation";
export default function QuestionResult({
  question: q,
}: {
  question: QuestionEvaluation;
}) {
  return (
    <section className="card mb-3 shadow-sm">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between gap-3">
          <h3 className="h5">Question {q.questionNumber}</h3>
          <strong>
            {q.obtainedMarks === null ? "Not scored" : q.obtainedMarks} / {q.maximumMarks}
          </strong>
        </div>
        <p>
          <span
            className={`badge text-bg-${q.status === "correct" ? "success" : q.status === "incorrect" ? "danger" : "secondary"}`}
          >
            {q.status.replaceAll("_", " ")}
          </span>{" "}
          {q.counted === false && (
            <span className="badge text-bg-light ms-2">
              Not counted: internal choice
            </span>
          )}{" "}
          {q.counted === null && <span className="badge text-bg-light ms-2">Choice pending review</span>}
          {q.manualReviewRequired && (
            <span className="badge text-bg-warning ms-2">Teacher review</span>
          )}
        </p>
        <p>{q.reason}</p>
        <div className="table-responsive">
          <table className="table">
            <caption>Marking split-up for question {q.questionNumber}</caption>
            <thead>
              <tr>
                <th>Criterion / subpart</th>
                <th>Marks</th>
                <th>Why awarded or deducted</th>
              </tr>
            </thead>
            <tbody>
              {q.criteria.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.id}: {c.description}
                  </td>
                  <td className="text-nowrap">
                    {c.obtainedMarks === null ? "Not scored" : c.obtainedMarks} / {c.maximumMarks}
                  </td>
                  <td>{c.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <strong>Method:</strong> {q.methodAssessment}
        </p>
        <p>
          <strong>Final answer:</strong> {q.finalAnswerAssessment}
        </p>
        <p>
          <strong>Diagram:</strong> {q.diagramAssessment}
        </p>
        <details>
          <summary>
            Read student evidence · pages{" "}
            {q.sourcePages.join(", ") || "unmatched"} · {q.confidence}{" "}
            confidence
          </summary>
          <pre className="evidence mt-3">
            {q.studentAnswer || "No matched transcription."}
          </pre>
        </details>
      </div>
    </section>
  );
}
