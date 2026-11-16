# Complete repository map

Current Gemini-only source inventory (16 November 2026). Generated dependencies/build outputs, private credentials and uploaded student data are excluded.

| Path | Purpose |
|---|---|
| `.gitignore` | Exclude macOS metadata. |
| `AGENTS.md` | Agent entry point and guide maintenance rules. |
| `README.md` | Mac setup, teacher workflow, limits and checks. |
| `SKILL.md` | Current agent workflow, invariants and reference navigation. |
| `backend/.env.example` | Public configuration template; never contains a real API key. |
| `backend/.gitignore` | Exclude generated output, dependencies and private local files. |
| `backend/lib/gemini.cjs` | Original-PDF Gemini transport, response schema, ID recovery, strict awards and fixed scoring/choices. |
| `backend/lib/gemini.d.cts` | Typed contract for the shared CommonJS grading engine. |
| `backend/package-lock.json` | Pinned dependency graph. |
| `backend/package.json` | Package dependencies and run/build/test scripts. |
| `backend/scripts/gemini-all.cjs` | Optional full-sheet CLI using the same shared grading engine. |
| `backend/scripts/gemini-q19.cjs` | Optional isolated Q19 diagnostic with its own smaller response schema. |
| `backend/src/controllers/evaluationController.ts` | TXT import, teacher approval/lock, sequential PDF batches, per-file outcomes and batch-stop policy. |
| `backend/src/routes/evaluationRoutes.ts` | Multipart routes, 1 MiB TXT / 10 MiB PDF limits and failed-upload cleanup. |
| `backend/src/server.ts` | Express startup, CORS, Gemini health response and global errors. |
| `backend/src/services/geminiService.ts` | Private-key check, approved-rubric adapter, nullable results, usage and errors. |
| `backend/src/services/jobStore.ts` | In-memory session/job queue, UUIDs, two-hour expiry and temporary files. |
| `backend/src/services/pdfService.ts` | PDF header and page-count checks using pdfinfo; no image rendering. |
| `backend/src/services/textKeyService.ts` | Structured TXT parsing, subpart grouping, source split-ups and flexible marking policy. |
| `backend/src/types/evaluation.ts` | Duplicated backend/frontend rubric, nullable evaluation and batch types; keep aligned. |
| `backend/src/utils/rubric.ts` | Validate IDs, criterion sums, fixed paper total and disjoint equal-mark choices. |
| `backend/tests/gemini-all.test.cjs` | Full-sheet request, labels, uncertain evidence, missing/duplicate IDs and no-retry checks. |
| `backend/tests/gemini-integration.test.cjs` | HTTP workflow with real PDF validation and a Gemini stub: approval edits, limits, batches, nulls and quota. |
| `backend/tests/gemini-trial.test.cjs` | Q19 transport, bounds, ambiguity, billing and incomplete-response checks. |
| `backend/tests/scoring.test.cjs` | Shared Gemini scoring, choices, rubric and PDF-content regression checks. |
| `backend/tests/text-key.test.cjs` | TXT grouping, fixed totals, duplicates, missing fields and explicit split-ups. |
| `backend/tsconfig.json` | Build, TypeScript or lint configuration. |
| `docs/ccp8/api.md` | Reference for api. |
| `docs/ccp8/gemini-trial.md` | Reference for gemini trial. |
| `docs/ccp8/pages.md` | Reference for pages. |
| `docs/ccp8/repository-map.md` | Reference for repository map. |
| `docs/ccp8/text-key.md` | Reference for text key. |
| `docs/ccp8/workflow.md` | Reference for workflow. |
| `frontend/.env.example` | Public configuration template; never contains a real API key. |
| `frontend/.gitignore` | Exclude generated output, dependencies and private local files. |
| `frontend/README.md` | Frontend start/check commands and reference links. |
| `frontend/eslint.config.js` | Build, TypeScript or lint configuration. |
| `frontend/index.html` | CCP8 page title, favicon, root and entry module. |
| `frontend/package-lock.json` | Pinned dependency graph. |
| `frontend/package.json` | Package dependencies and run/build/test scripts. |
| `frontend/public/favicon.svg` | Used browser favicon. |
| `frontend/src/App.tsx` | Only application page: key upload, editable approval, locked scheme, batch upload and results. |
| `frontend/src/api.ts` | JSON API client and two-second job polling. |
| `frontend/src/components/FileUpload.tsx` | TXT or multi-PDF upload selection and client validation. |
| `frontend/src/components/QuestionResult.tsx` | Per-question/criterion marks, reasons, review/choice flags and student evidence. |
| `frontend/src/components/ScoreCard.tsx` | Fixed total or pending review, percentage, timing/model and warnings. |
| `frontend/src/index.css` | Layout, evidence wrapping and table styling. |
| `frontend/src/main.tsx` | React mount and Bootstrap/styles imports. |
| `frontend/src/types/evaluation.ts` | Duplicated backend/frontend rubric, nullable evaluation and batch types; keep aligned. |
| `frontend/tsconfig.app.json` | Build, TypeScript or lint configuration. |
| `frontend/tsconfig.json` | Build, TypeScript or lint configuration. |
| `frontend/tsconfig.node.json` | Build, TypeScript or lint configuration. |
| `frontend/vite.config.ts` | Build, TypeScript or lint configuration. |

## Change navigation

- Change grading prompts, question IDs or marks in `backend/lib/gemini.cjs`; update shared-engine tests and API contracts.
- Change key format in `textKeyService.ts` and `docs/ccp8/text-key.md`; preserve teacher-approved edits.
- Change API/job behavior in controller/routes/jobStore and `api.md`; keep frontend polling/types aligned.
- Change result presentation in ScoreCard/QuestionResult and `pages.md`; never render unresolved marks as zero.
- Keep optional diagnostic CLI scripts separate from the production request path.
