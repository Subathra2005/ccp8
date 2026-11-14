import { useState } from "react";

import FileUpload
  from "./components/FileUpload";

import ScoreCard
  from "./components/ScoreCard";

import QuestionResult
  from "./components/QuestionResult";

import type {
  FinalEvaluation
} from "./types/evaluation";

function App() {

  const [result, setResult] =
    useState<FinalEvaluation | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const evaluateAnswerSheet = async (
    file: File
  ) => {

    setLoading(true);
    setResult(null);
    setError(null);

    try {

      const formData =
        new FormData();

      formData.append(
        "answerSheet",
        file
      );

      const response =
        await fetch(
          "http://localhost:5001/api/evaluate",
          {
            method: "POST",
            body: formData
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Evaluation failed."
        );
      }

      setResult(data.data);

    } catch (error) {

      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );

    } finally {

      setLoading(false);
    }
  };

  const resetEvaluation = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-vh-100 bg-light">

      {/* Header */}

      <nav className="navbar navbar-dark bg-primary">

        <div className="container">

          <span className="navbar-brand mb-0 h1">
            AI Answer Evaluator
          </span>

        </div>

      </nav>

      {/* Main */}

      <main className="container py-5">

        <div className="row justify-content-center">

          <div className="col-lg-9">

            {/* Title */}

            <div className="text-center mb-5">

              <h1 className="fw-bold">
                Automated Answer Evaluation
              </h1>

              <p className="text-muted">
                Upload a handwritten answer sheet
                and let AI evaluate it against
                the provided answer key.
              </p>

            </div>

            {/* Upload */}

            {!result && (
              <FileUpload
                onEvaluate={
                  evaluateAnswerSheet
                }
                loading={loading}
              />
            )}

            {/* Error */}

            {error && (
              <div className="alert alert-danger mt-4">

                <strong>
                  Evaluation Failed
                </strong>

                <br />

                {error}

              </div>
            )}

            {/* Loading */}

            {loading && (
              <div className="text-center mt-5">

                <div
                  className="spinner-border text-primary"
                  style={{
                    width: "3rem",
                    height: "3rem"
                  }}
                />

                <h5 className="mt-3">
                  AI is evaluating the answer sheet...
                </h5>

                <p className="text-muted">
                  This may take a little while
                  because the PDF contains handwritten
                  answers.
                </p>

              </div>
            )}

            {/* Result */}

            {result && (
              <div className="mt-4">

                <ScoreCard
                  result={result}
                />

                <div className="d-flex justify-content-between align-items-center mb-3">

                  <h3 className="mb-0">
                    Question-wise Evaluation
                  </h3>

                  <button
                    className="btn btn-outline-primary"
                    onClick={
                      resetEvaluation
                    }
                  >
                    Evaluate Another
                  </button>

                </div>

                {result.questions.map(
                  (question) => (
                    <QuestionResult
                      key={
                        question.questionNumber
                      }
                      question={question}
                    />
                  )
                )}

              </div>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}

export default App;