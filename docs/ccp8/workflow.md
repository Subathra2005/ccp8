# Workflow and development

Source revision: `bd23fa0571397697274d10f2ee6b98ee5f71ad10`.

## Local setup

Use a modern Node runtime compatible with the locked Vite/tooling dependencies and native fetch in the backend. The repository declares no Node engines or runtime pin. Verify the lockfile engine requirements rather than inventing a project-mandated Node version.

Run commands separately in the indicated directories. Install from lockfiles with `npm ci` where package registry access is available.

| Working directory | Command | Purpose |
|---|---|---|
| backend | `npm ci` | Install backend locked dependencies |
| backend | `npm run dev` | ts-node-dev respawn with transpile-only |
| backend | `npm run build` | TypeScript compilation to dist |
| backend | `npm start` | Execute dist/server.js after build |
| frontend | `npm ci` | Install frontend locked dependencies |
| frontend | `npm run dev` | Vite development server |
| frontend | `npm run build` | tsc -b followed by Vite production build |
| frontend | `npm run lint` | ESLint |
| frontend | `npm run preview` | Preview built frontend; preview origin may differ from allowed CORS origin |

Create a local backend `.env` if overriding defaults:

```dotenv
PORT=5001
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
```

No API key is read by current source. Keep `.env` untracked. Have an Ollama server and selected model available separately (for a standard local installation, `ollama serve` and `ollama pull qwen2.5:3b` are typical preparation commands, not npm scripts). The checked-in source contains no Ollama installer or startup script. Ensure backend working directory contains readable `answer_key.txt` and can write temporary uploads. Do not run built server from the repository root without handling these relative paths. `dotenv.config()` precedes the route import in server.ts; verify actual environment loading if changing module/build semantics because service configuration is captured at module load.

No root package/workspace script, Dockerfile, deployment configuration, test script, or GitHub Actions workflow is checked in. Production hosting requires configuring API URL, CORS, model networking, and frontend serving; it is not implemented by this guide.

## End-to-end evaluation lifecycle

1. User selects a PDF in FileUpload; the browser checks its MIME type only.
2. App clears prior state, disables upload controls, and POSTs multipart `answerSheet`.
3. Express CORS/JSON middleware runs; `/api` mounts evaluationRoutes.
4. Multer accepts a single PDF by MIME, limits bytes to 20 MiB, and writes a temporary file under uploads/.
5. evaluateController rejects missing/non-PDF files, reads the fixed answer key, and rejects an empty key.
6. evaluateAnswerSheet checks file existence, constructs evaluation instructions plus key, and calls Ollama `/api/generate`. **No PDF contents are read or sent.**
7. The service extracts the response string, parses JSON, and checks only that questions is an array.
8. calculateFinalScore converts/clamps per-question marks, sums totals, computes percentage, and sets manual-review flag.
9. Controller returns a success envelope or an error envelope; finally attempts deletion of its recorded temporary file. A deletion failure is logged.
10. App renders ScoreCard and QuestionResult cards or an error alert, then stops loading. Evaluate Another resets client state; there is no saved evaluation to delete.

## Scoring details

For each question, convert obtainedMarks and maximumMarks with Number(). Convert NaN obtained marks to 0. Reject NaN or negative maximum marks. Clamp obtained marks to `[0, maxMarks]`. Flag manual review if status is exactly unreadable or confidence exactly low; medium alone does not flag. Sum clamped marks and converted maxima. Return percentage 0 for zero total maximum, otherwise round to two decimal places using toFixed(2) then Number().

Return each question using `{...question, obtainedMarks}`: the original maximumMarks field is retained, although the aggregate used its numeric conversion. Do not assume full normalization of model data. Infinity is not rejected with Number.isFinite; objects/fields/status/confidence are not comprehensively checked. Empty question arrays are accepted and produce zero totals with no review flag. The code does not enforce question coverage, uniqueness, expected question count, authoritative maximum marks, or consistency between status and marks.

## Answer key and model behavior

The fixed key is Food, Nutrition & Dietetics, Class XI, December 2021–2022. It covers 20 numbered questions in six sections: MCQ (1–5), blanks (6–10), short answers (11–15), BMI/SDGs (16–17), public-health nutrition/HDI (18–19), and anthropometric/dietary assessment (20, with subparts). It supplies answers but not explicit per-question marks. There is no parser that turns it into a validated rubric.

The prompt asks for fair semantic evaluation and all questions; it cannot replace missing student evidence or mark allocation. Gemini names (`geminiService`, `GeminiEvaluationResponse`, geminiResult, console logs) are historical naming in the code. The actual integration uses native fetch to Ollama, not the installed Google SDK.

## Debugging by symptom

| Symptom | Inspect first | Explanation |
|---|---|---|
| Browser cannot connect | App URL, backend PORT, CORS origin | Hardcoded frontend address and exact allowed origin must agree |
| Key missing/ENOENT | Backend process.cwd() | Key read is relative to working directory |
| Non-PDF or oversized upload yields 500 | Multer and server error handler | Middleware failures are not mapped to client status codes |
| File not found | Service fs.access and temporary-file path | Existence check precedes model request |
| Ollama request failure | Base URL, server, model, returned error text | No retries or timeout policy |
| Invalid JSON / invalid structure | Ollama response string and service checks | Format request is not comprehensive schema validation |
| Plausible scores unrelated to PDF | geminiService payload | Student PDF never reaches model |
| Wrong total or crash on malformed output | scoreCalculator and both types | Numeric checks are partial, types do not validate JSON |
| No result after refresh | App local state | No persistence exists |
| Old valid PDF submits after invalid selection | FileUpload.handleFileChange | Invalid branch does not clear stored file |

## Verification for future changes

For backend changes, run backend build; for UI changes, run frontend build and lint. There are no configured automated tests. For meaningful evaluation changes, verify health, missing upload, non-PDF upload, oversized upload, valid PDF flow, unavailable Ollama, malformed model JSON, scoring boundaries, low/unreadable review flag, and cleanup as relevant. Use controlled model responses for deterministic scoring checks; keep them distinct from live integration checks. To establish real grading, prove that student evidence reaches the model and compare against a known answer sheet and explicit rubric. Do not accept successful HTTP or plausible output alone as evidence.

This guide was created by static source inspection, not by running the app, installing its dependencies, or calling a live model. No runtime or build success is asserted for the inspected application.
