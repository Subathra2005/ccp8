# Complete repository map

This inventory accompanies the handwritten-PDF implementation. All 50 tracked files are listed; dependency lockfiles and artwork are inventoried by role, not audited dependency/image contents. Generated node_modules/dist and personal sample PDFs are excluded.

| Path | Purpose |
|---|---|
| `.DS_Store` | macOS metadata; no application behavior. |
| `AGENTS.md` | Agent entry point; directs repository workers to SKILL.md. |
| `README.md` | Mac setup, teacher workflow, choice policy, retention, checks and limitations. |
| `SKILL.md` | Main project guide and invariants; links these reference files. |
| `backend/.env.example` | Backend port/origin, local Ollama URL and default vision model. |
| `backend/.gitignore` | Exclude node_modules, dist, .env and upload contents. |
| `backend/package-lock.json` | Locked backend dependency graph; use for reproducible installation. |
| `backend/package.json` | Node engine, Express/TypeScript/Multer dependencies and dev/build/start/test scripts. |
| `backend/src/controllers/evaluationController.ts` | Key extraction job, scheme approval/locking, batch jobs, per-file outcomes and job polling. |
| `backend/src/routes/evaluationRoutes.ts` | All API routes, single/multiple PDF upload limits and middleware-error cleanup/statuses. |
| `backend/src/server.ts` | dotenv, configurable CORS, JSON parser, health, router, global error response, listen. |
| `backend/src/services/evaluationService.ts` | Page transcription, key indexing/per-question rubric extraction, visual/text grading and criterion validation. |
| `backend/src/services/jobStore.ts` | Process-wide sequential job queue, UUID sessions/jobs, busy locking and idle TTL cleanup. |
| `backend/src/services/ollamaService.ts` | Native Ollama chat fetch with images, JSON schemas, deterministic sampling, timeout and parsing. |
| `backend/src/services/pdfService.ts` | Header/page inspection via pdfinfo; sequential bounded PNG rendering via pdftoppm and image cleanup. |
| `backend/src/types/evaluation.ts` | Rubric, choice, evidence, criterion award, question, final and sheet response interfaces. |
| `backend/src/utils/rubric.ts` | Runtime scheme validation: ids, finite marks, split-ups, page refs, choices and fixed paper total. |
| `backend/src/utils/scoreCalculator.ts` | Reconstruct approved maxima; sum criteria; best-N choices; fixed denominator and review flags. |
| `backend/tests/integration.test.cjs` | Real Poppler plus controlled Ollama HTTP stub; image transport, approval, upload errors and isolated batch outcomes. |
| `backend/tests/scoring.test.cjs` | Deterministic rubric/scoring, fractional choice, invalid award and PDF-byte tests. |
| `backend/tsconfig.json` | Strict TypeScript; ES2022, CommonJS, Node resolution, src → dist, esModuleInterop. |
| `docs/ccp8/api.md` | Complete HTTP and payload contracts. |
| `docs/ccp8/pages.md` | All page states, actions and component roles. |
| `docs/ccp8/repository-map.md` | This complete tracked-file inventory. |
| `docs/ccp8/workflow.md` | Pipeline, scoring, setup, resource limits and verification. |
| `frontend/.env.example` | Optional VITE_API_BASE_URL override. |
| `frontend/.gitignore` | Exclude generated output, dependencies, logs, local and editor artifacts. |
| `frontend/README.md` | Generic React/TypeScript/Vite starter notes, not project-specific documentation. |
| `frontend/eslint.config.js` | JS/TS recommended rules, React Hooks and refresh rules, browser globals; ignore dist. |
| `frontend/index.html` | HTML shell, favicon, viewport, title frontend, root element and main.tsx module. |
| `frontend/package-lock.json` | Locked frontend dependency graph, resolved versions and package engine constraints. |
| `frontend/package.json` | Node engine, React/Bootstrap/Vite/TypeScript dependencies and dev/build/lint/preview scripts. |
| `frontend/public/favicon.svg` | Static SVG favicon referenced by index.html. |
| `frontend/public/icons.svg` | Static SVG icon asset; not referenced by current TSX application. |
| `frontend/src/App.css` | Unused starter CSS; App does not import this file. |
| `frontend/src/App.tsx` | Only app page; key extraction/review/editor/approval, locked-key batches, progress and results. |
| `frontend/src/api.ts` | Configurable API helper and 2-second job polling. |
| `frontend/src/assets/hero.png` | Starter image asset; not referenced by current application TSX. |
| `frontend/src/assets/react.svg` | Starter React artwork; not referenced by current application TSX. |
| `frontend/src/assets/vite.svg` | Starter Vite artwork; not referenced by current application TSX. |
| `frontend/src/components/FileUpload.tsx` | Reusable PDF single-key/multiple-sheet selection with MIME/size/count checks. |
| `frontend/src/components/QuestionResult.tsx` | Criterion awards/reasons, method/final/diagram assessment, evidence and choice/review flags. |
| `frontend/src/components/ScoreCard.tsx` | Fixed-total summary, percentage/progress and provisional/review warnings. |
| `frontend/src/index.css` | Global typography, wrapped evidence and table layout. |
| `frontend/src/main.tsx` | ReactDOM entry; StrictMode, App, Bootstrap and global CSS imports. |
| `frontend/src/types/evaluation.ts` | Aligned copy of backend rubric/evidence/grading types. |
| `frontend/tsconfig.app.json` | Frontend compiler settings: ES2023/DOM, bundler resolution, React JSX, no emit and unused checks. |
| `frontend/tsconfig.json` | Project references to app and node configurations. |
| `frontend/tsconfig.node.json` | Type-check Vite configuration with Node types, nodenext and no emit. |
| `frontend/vite.config.ts` | Vite React plugin only; no explicit proxy, custom port or API environment wiring. |

## Change navigation

| Task | Start | Follow through |
|---|---|---|
| Add/alter endpoint | routes/evaluationRoutes.ts | Controller, API client, docs/api |
| Change key extraction | services/evaluationService.ts | Rubric validator, review UI, both type copies |
| Change PDF handling | services/pdfService.ts | Upload limits, model images, integration test |
| Change marks/choices | utils/rubric.ts and scoreCalculator.ts | Extraction prompt, criterion schema, UI explanation, tests |
| Change memory settings | services/ollamaService.ts | PDF dimensions, context guards, README hardware guidance |
| Add persistence | services/jobStore.ts | Controller lifecycle, retention policy, browser recovery |

Paths in navigation are relative to backend/src unless specified. There is no database, CI workflow, container/deployment configuration, account system or other application page.
