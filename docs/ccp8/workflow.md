# Evaluation and development workflow

## Setup and active flow

Follow README: Node 22.12+, Poppler for PDF validation, and backend-only GEMINI_API_KEY. Gemini is the default; set EVALUATION_PROVIDER=ollama explicitly to use the older local pipeline. No Google SDK dependency is needed.

1. Parse the structured TXT locally and return the draft with warnings.
2. Teacher edits and approves answers, marks, split-ups and best-N choice policy. Validate and lock a deep copy.
3. Upload 1–10 handwritten PDFs. Queue the batch and process sequentially.
4. Gemini receives each original PDF and the locked rubric in one request through geminiService.ts → lib/gemini.cjs. Do not reparse the original key here: teacher edits must be retained.
5. Validate completed output, question IDs, criterion IDs, bounds and source pages. Preserve student steps, alternative-method assessment, final-answer/diagram assessment and per-criterion reasons.
6. Code calculates question marks, best-N choices with stable key-order ties, and the fixed-total result. Missing, ambiguous, unreadable or review-required questions have null marks; any unresolved assessment withholds the total. Confirmed absent work can receive zero. Fractional marks, including quarter marks, remain supported.
7. Return model, duration and usage with each successful sheet. Invalid sheets fail independently. Auth/billing/access/quota failures and timeouts stop remaining requests without retries or fallback; completed results remain available.
8. Delete student uploads, expire idle key sessions/jobs after two hours. No durable history, teacher score-editing endpoint or resume after browser refresh. Abnormal termination can leave OS temporary files.

The prompt preserves the approved flexible policy: valid alternative methods, credit according to error location, no duplicated formula credit, valid Venn diagrams accepted, and full credit for an established correct uncrossed-out solution despite a later redundant copying slip. Model judgment still needs human verification.

## Optional local provider

Only EVALUATION_PROVIDER=ollama calls evaluationService.ts: rendered-image transcription, bounded crop recovery, studentTextService boundary mapping, then per-question visual grading and scoreCalculator totals. This legacy path retains provisional zero/review flags and can be slow on an 8 GB M1. Its detailed transport remains in api.md. Completed OCR is never re-read merely because boundary mapping fails.

## Scoring invariants

validateRubric enforces unique IDs, finite positive maxima, criterion sums and paper sums. Choice groups must be disjoint, equal-mark complete alternatives; nested, overlapping and unequal choices are rejected. Gemini's shared runtime validator leaves duplicate questions unscored and reports unknown labels, preserving other assessments but withholding the total. It constrains output IDs to the rubric and normalizes only unambiguous numeric-label formatting. Invalid/out-of-bounds criteria are still rejected rather than clamped. Maxima and totals come only from the locked scheme. No rounding to a half-mark grid is imposed; arithmetic sums round to four decimals and percentages to two.

Gemini review flags withhold scores. Do not equate an unflagged response with proven mathematical correctness. Teachers still compare results to original handwriting. Required diagrams and multi-page work are visible to Gemini in the complete PDF, unlike the older first-page-only comparison.

## Debugging

| Symptom | Check |
|---|---|
| Missing key | Set GEMINI_API_KEY in backend/.env and restart; never put it in frontend code |
| HTTP 429 | Project quota; batch stops without retry |
| HTTP 401/402/403/404 | Key, billing, access or model availability; remaining batch stops |
| Timeout | Request may have consumed quota; inspect usage before manually rerunning |
| pdfinfo missing | Install Poppler and ensure backend inherits PATH |
| Browser blocked | VITE_API_BASE_URL, backend PORT and FRONTEND_ORIGIN |
| Wrong key answer/marks | Correct draft before approval; start a new session to revise a locked key |
| Pending total | Review null-mark questions; the app has no manual score-edit/save workflow yet |
| Expired session/job | Upload key again; session/results are ephemeral |

## Validation evidence and boundaries

Backend npm test builds and runs scoring, parser, transport and HTTP integration checks using local Gemini/Ollama stubs and real Poppler. Gemini tests cover uploaded PDF bytes, teacher edits retained after approval, fixed maxima, null/missing assessments and quota batch stop without key exposure. Tests do not call cloud models or establish handwriting accuracy.

Frontend npm run build and npm run lint validate types/build/rules. The user's full-sheet CLI sample completed in 76.5 seconds with 24 assessments; this is one observed run, not a guaranteed speed/accuracy result. The web adapter reuses that engine, but its cloud behavior must still be checked using the user's private key on their Mac.
