# Evaluation and development workflow

## Setup

Follow the root README. Node 22.12+, Poppler (`pdfinfo`, `pdftoppm`) and an active Ollama installation with qwen3-vl:2b-instruct are required. The default is deliberately a small vision model for the user's M1 7-core GPU / 8 GB shared memory; no live hardware performance benchmark is claimed. Start backend and frontend separately. No Google API key is needed. The old fixed text key and Google SDK are no longer used.

## Key to result

1. Upload one structured UTF-8 answerKey TXT (1 MiB maximum). Parse fields and records directly in textKeyService.ts, without Poppler or Ollama.
2. Group subpart records into their question number, preserving subpart criteria and known explicit split-ups. Reject incomplete/duplicate records and inconsistent totals.
3. Retain the key temporarily; return a queued draft with warnings and no image evidence. See text-key.md for format and flexible marking policy.
4. Show editable scheme and policy for teacher review.
5. Teacher checks key content, all maxima, criteria, references and internal choices, then approves. Backend validates positive finite marks, criterion sums, choice structure and paper sum, stores a deep copy and refuses changes to that scheme.
6. Upload 1–10 answerSheets with the session UUID. Queue the batch. Process files sequentially and maintain independent failures.
7. Transcribe each student page visually, including equations and diagram structure. Ignore prior teacher marks/ticks/annotations. Match by main question id; `20.A` and `20.B` alternatives can use source label `20`. Warn for unmatched labels.
8. For each question, assemble all matching page observations and revisit the first matching student page as an actual image alongside the TXT key. Ask for exact criterion awards/reasons and separate mathematical method, final-answer and diagram assessments. Accept correct alternative methods after checking their validity. Do not award method marks solely for a correct final answer.
9. Validate all criterion ids/finite bounded awards/explanations. Reject malformed question output into a provisional zero/review result; missing question evidence is also provisional and flagged. Diagram and continuation-page cases are flagged because only the first student page is visually revisited; other pages are separately transcribed evidence.
10. Recalculate all maxima and totals from approved rubric in backend code. Select best N choices (stable earlier-key tie break). Keep excluded alternatives visible. Return total/fixed maximum and detailed results.
11. Delete each student PDF after processing. Expire idle sessions/key directories and completed jobs after two hours; running work stays alive. Backend restart loses in-memory schemes/results. Abnormal termination can leave OS temp files.

## Scoring rules

`validateRubric` enforces uniqueness, finite positive maxima, valid key page numbers, criteria sums and paper sums. Choice groups are disjoint, with equal per-alternative maxima; choose must be less than group size. Only best-N policy is implemented and teacher-approved. Nested/overlapping/unequal-mark structures are rejected. Use complete independently scoreable equal-mark alternatives, not overlapping sets of subparts.

`gradeSheet` validates model awards against each approved criterion. The model never supplies total/maxima in its grading schema. `calculateFinalScore` also reconstructs criterion/question maxima from the rubric, bounds awards, rejects missing/duplicate results, derives status from awarded marks except unreadable/unanswered, and sums counted results. Four-decimal arithmetic rounding supports fractional split-ups; percentage uses two decimals. The fixed maximum remains rubric.totalMarks for every student, including incomplete answers.

Review is required for medium/low confidence, unreadable/failed/unmatched evidence, required/present diagrams, absent question wording and multi-page comparisons. Page warnings can flag the overall result even if individual confidence is high. The model's reasoning is still AI judgment: deterministic temperature/seed do not guarantee correct symbolic math, geometry, or repeat-identical marks. Never claim an actual symbolic proof checker or perfect OCR exists.

## Memory and context

All model work uses one sequential queue; pages are not loaded as one giant image array. Transcription uses one image; question grading uses at most two. Key index input has a 20,000-character limit; question extraction context 16,000; grading question/evidence budget 10,000. These are guards rather than exact tokenizer accounting. Ollama retains 8192 context tokens. Output budgets are 1600 for raw vision transcription, 2200 for student organisation/grading and 1800 for indexing/question extraction (default 2400). Raw vision uses temperature 0.2 with mild repetition penalty 1.05; structured calls retain temperature 0. Seed stays 42. Text requests have one compact retry; page requests instead trigger the bounded crop fallback. Errors include the task/page. Page/region/question progress and request duration/token logs make stalls diagnosable. Long exams may need splitting into sections. The app does not benchmark, download or start Ollama automatically.

## Debugging

| Symptom | Check |
|---|---|
| Missing Poppler | Install brew poppler; ensure backend PATH contains pdfinfo/pdftoppm |
| Text-only model fails images | Pull/configure qwen3-vl:2b-instruct; update Ollama |
| Browser blocked | VITE_API_BASE_URL, backend PORT and FRONTEND_ORIGIN |
| Wrong extracted total or key answer | Correct draft before approval; never fix via model rescaling |
| Choice totals mismatch | Use disjoint complete equal-mark alternatives and choose count |
| Unrelated or missing answers | Inspect page transcriptions, numeric labels and continuation evidence |
| Expired session/job | Upload key again; sessions/results are ephemeral |
| One failed sheet | Read that file's error; other results remain available |
| Question zero with review flag | Provisional failure/unreadability; inspect evidence, not automatic final zero |

## Validation evidence and boundaries

Backend `npm test` builds and runs deterministic scoring and HTTP integration tests with a controlled Ollama stub and real Poppler. Coverage includes fixed maxima, subpart sums, internal choices, invalid schemes/NaN, missing results, PDF contents, image transport, approval locking, invalid/oversized uploads and separate file failures. Optional TEST_SHEET_PDF runs a supplied student sample through real rendering but still uses mock grading. No personal PDF is committed. Twenty-one automated tests include plain-text image transport, absence of image JSON grammar, early stream cancellation on sustained repetition, rejection of disconnected streams, and preservation of mathematical transcription. Truncation regression tests verify the typed error, compact retry, bounded attempts and rejection of parseable-but-truncated output. SIMULATE_TRUNCATION=1 exercises recovery through real Poppler crops; with the sample PDFs this makes 15 page-reading image requests instead of 13.

Frontend `npm run build` and `npm run lint` validate types/build/rules. A browser smoke attempt in the development environment was blocked by Chromium process/socket restrictions, so no successful visual/browser run is claimed. Live Ollama handwriting/math quality and M1 memory/latency remain to be checked on the user's machine. Keep these limits explicit when reporting readiness.


Student mapping correction: image crop retries apply only to incomplete vision transcription. Completed text is mapped via `studentTextService.ts` (600 output tokens, no retry, bounded chunks). Invalid/truncated mappings retain complete unassigned text in result warnings for teacher review instead of aborting the sheet. This avoids regenerating all student work as JSON. Live model speed and mapping accuracy still need hardware testing.
