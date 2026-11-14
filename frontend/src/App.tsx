import { useState } from "react";
import FileUpload from "./components/FileUpload";
import ScoreCard from "./components/ScoreCard";
import QuestionResult from "./components/QuestionResult";
import { api, waitForJob } from "./api";
import type { Rubric, PageEvidence, SheetResult } from "./types/evaluation";
interface Draft {
  sessionId: string;
  rubric: Rubric;
  warnings: string[];
  evidence: PageEvidence[];
}
export default function App() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editor, setEditor] = useState("");
  const [locked, setLocked] = useState<Rubric | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [results, setResults] = useState<SheetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    setError("");
    setLoading(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }
  async function readKey(files: File[]) {
    await run(async () => {
      const form = new FormData();
      form.append("answerKey", files[0]);
      const job = await api<{ jobId: string }>("/schemes/extract", {
        method: "POST",
        body: form,
      });
      const data = await waitForJob<Draft>(job.jobId, setProgress);
      setDraft(data);
      setEditor(JSON.stringify(data.rubric, null, 2));
      setConfirmed(false);
    });
  }
  async function approve() {
    await run(async () => {
      const rubric = JSON.parse(editor) as Rubric;
      const data = await api<{ rubric: Rubric }>(
        `/schemes/${draft!.sessionId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rubric, confirmed }),
        },
      );
      setLocked(data.rubric);
    });
  }
  async function evaluate(files: File[]) {
    await run(async () => {
      setResults([]);
      const form = new FormData();
      form.append("sessionId", draft!.sessionId);
      files.forEach((file) => form.append("answerSheets", file));
      const job = await api<{ jobId: string }>("/evaluate", {
        method: "POST",
        body: form,
      });
      const data = await waitForJob<{ results: SheetResult[] }>(
        job.jobId,
        setProgress,
      );
      setResults(data.results);
    });
  }
  let preview: Rubric | null = null;
  try {
    preview = JSON.parse(editor) as Rubric;
  } catch {
    /* Keep editable invalid JSON visible. */
  }
  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand">AI Answer Evaluator</span>
        </div>
      </nav>
      <main className="container py-4" style={{ maxWidth: 1100 }}>
        <h1>One answer key. Multiple answer sheets.</h1>
        <p className="text-muted">
          Read handwritten PDFs, check the marking scheme, then evaluate each
          student with reasons for every mark.
        </p>
        <div className="alert alert-info">
          Local vision processing can take several minutes per page on an 8 GB
          Mac. Keep this tab open. Results assist a teacher; handwriting,
          alternative mathematics and diagrams can require review.
        </div>
        {!draft && (
          <FileUpload
            label="1. Upload answer key"
            loading={loading}
            onSubmit={readKey}
          />
        )}
        {draft && !locked && (
          <section className="card mb-4">
            <div className="card-body p-4">
              <h2 className="h4">2. Review and lock the marking scheme</h2>
              <p>
                Compare this draft with your PDF. Correct misread answers, page
                numbers, question marks and subpart/step split-ups. Question ids
                must match the student labels (for example 20). Criteria
                describe the subparts. Nothing is graded until you approve.
              </p>
              {draft.warnings.length > 0 && (
                <div className="alert alert-warning">
                  <strong>Resolve extraction warnings before approval</strong>
                  <ul>
                    {draft.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {preview && Array.isArray(preview.questions) && (
                <>
                  <h3 className="h5">
                    {typeof preview.title === "string"
                      ? preview.title
                      : "Untitled scheme"}{" "}
                    · Paper total:{" "}
                    {typeof preview.totalMarks === "number"
                      ? preview.totalMarks
                      : "Invalid total"}
                  </h3>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Maximum</th>
                          <th>Split-up</th>
                          <th>Key pages</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.questions
                          .filter((q) => q && typeof q.id === "string")
                          .map((q, i) => (
                            <tr key={i}>
                              <td>{q.id}</td>
                              <td>{q.maximumMarks}</td>
                              <td>
                                {Array.isArray(q.criteria)
                                  ? q.criteria
                                      .filter(
                                        (c) => c && typeof c.id === "string",
                                      )
                                      .map(
                                        (c) =>
                                          `${c.id}: ${c.maximumMarks} (${c.description})`,
                                      )
                                      .join("; ")
                                  : "Invalid criteria"}
                              </td>
                              <td>
                                {Array.isArray(q.keyPages)
                                  ? q.keyPages.join(", ")
                                  : "Invalid pages"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <label className="form-label" htmlFor="scheme">
                Editable marking scheme (JSON)
              </label>
              <textarea
                id="scheme"
                className="form-control font-monospace"
                rows={20}
                value={editor}
                disabled={loading}
                spellCheck={false}
                onChange={(e) => {
                  setEditor(e.target.value);
                  setConfirmed(false);
                }}
              />
              <p className="small mt-2">
                Each question's criteria must add up to its maximum. Required
                questions plus the allowed choices must add up to totalMarks.
                Internal choices use questionIds and choose; the best N scores
                count, with earlier key order breaking ties. Unequal-mark or
                nested alternatives must be resolved into complete, equal-mark
                alternatives before approval.
              </p>
              <details className="my-3">
                <summary>Page-by-page transcription for checking</summary>
                {draft.evidence.map((e) => (
                  <div key={e.page}>
                    <h3 className="h6 mt-3">Key page {e.page}</h3>
                    <pre className="evidence">{e.text}</pre>
                  </div>
                ))}
              </details>
              <div className="form-check my-3">
                <input
                  id="confirm"
                  className="form-check-input"
                  type="checkbox"
                  checked={confirmed}
                  disabled={loading}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <label htmlFor="confirm" className="form-check-label">
                  I checked all expected answers, the paper total, split-ups,
                  diagram requirements and internal choices; I accept best-N
                  scoring for the listed choices and resolved the warnings.
                </label>
              </div>
              <button
                className="btn btn-primary"
                disabled={!confirmed || loading}
                onClick={approve}
              >
                Approve and lock scheme
              </button>
            </div>
          </section>
        )}
        {locked && (
          <>
            <div className="alert alert-success">
              Scheme locked:{" "}
              <strong>
                {locked.title} · {locked.totalMarks} marks
              </strong>
              . All student sheets use this same maximum and split-up.
            </div>
            <FileUpload
              label="3. Upload student answer sheets"
              multiple
              loading={loading}
              onSubmit={evaluate}
            />
          </>
        )}
        {loading && (
          <div role="status" aria-live="polite" className="alert alert-primary">
            <span className="spinner-border spinner-border-sm me-2" />
            {progress || "Starting…"}
          </div>
        )}
        {error && (
          <div role="alert" className="alert alert-danger">
            {error}
          </div>
        )}
        {results.map((r, i) => (
          <article key={i} className="mt-5">
            <h2>{r.filename}</h2>
            {r.success && r.data ? (
              <>
                <ScoreCard result={r.data} />
                {r.data.questions.map((q) => (
                  <QuestionResult key={q.questionNumber} question={q} />
                ))}
              </>
            ) : (
              <div className="alert alert-danger">{r.message}</div>
            )}
          </article>
        ))}
        {draft && (
          <button
            className="btn btn-outline-secondary mt-3"
            disabled={loading}
            onClick={() => {
              setDraft(null);
              setLocked(null);
              setResults([]);
              setError("");
              setEditor("");
            }}
          >
            Start with a different answer key
          </button>
        )}
      </main>
    </div>
  );
}
