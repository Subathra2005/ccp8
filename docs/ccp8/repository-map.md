# Complete repository map

Source revision: `bd23fa0571397697274d10f2ee6b98ee5f71ad10`. The recursive tree was not truncated. All 35 tracked files are listed below. Text application, configuration and key files were read directly; lockfiles and artwork are inventoried by their role and metadata, not claimed as individually audited dependency or image contents.

| Path | Purpose |
|---|---|
| `.DS_Store` | macOS metadata; no application behavior. |
| `backend/.gitignore` | Exclude node_modules, dist, .env and upload contents. |
| `backend/answer_key.txt` | Fixed 20-question Class XI nutrition answer key; no explicit mark allocation. |
| `backend/package-lock.json` | Locked backend dependency graph; use for reproducible installation. |
| `backend/package.json` | Backend dependencies and dev/build/start scripts; Google SDK declared but unused. |
| `backend/src/controllers/evaluationController.ts` | evaluateController: file checks, read key, call service, calculate score, response/error, temporary-file cleanup. |
| `backend/src/routes/evaluationRoutes.ts` | Multer destination, 20 MiB limit, PDF MIME filter; POST /evaluate with answerSheet. |
| `backend/src/server.ts` | dotenv, Express, CORS, JSON parser, GET /api/health, /api router, global 500 handler, listen. |
| `backend/src/services/geminiService.ts` | evaluateAnswerSheet: existence check, prompt, Ollama fetch, response parse and questions-array check. Does not send PDF. |
| `backend/src/types/evaluation.ts` | Status/confidence unions; QuestionEvaluation, GeminiEvaluationResponse, FinalEvaluation. |
| `backend/src/utils/scoreCalculator.ts` | calculateFinalScore: convert/clamp marks, aggregate totals, percentage, review flag. |
| `backend/tsconfig.json` | Strict TypeScript; ES2022, CommonJS, Node resolution, src → dist, esModuleInterop. |
| `frontend/.gitignore` | Exclude generated output, dependencies, logs, local and editor artifacts. |
| `frontend/README.md` | Generic React/TypeScript/Vite starter notes, not project-specific documentation. |
| `frontend/eslint.config.js` | JS/TS recommended rules, React Hooks and refresh rules, browser globals; ignore dist. |
| `frontend/index.html` | HTML shell, favicon, viewport, title frontend, root element and main.tsx module. |
| `frontend/package-lock.json` | Locked frontend dependency graph, resolved versions and package engine constraints. |
| `frontend/package.json` | React 19, Bootstrap 5, Vite 8, TypeScript 6 dependencies and dev/build/lint/preview scripts. |
| `frontend/public/favicon.svg` | Static SVG favicon referenced by index.html. |
| `frontend/public/icons.svg` | Static SVG icon asset; not referenced by current TSX application. |
| `frontend/src/App.css` | Unused starter CSS; App does not import this file. |
| `frontend/src/App.tsx` | Only app page; upload request, loading/error/result state, shell, reset and result composition. |
| `frontend/src/assets/hero.png` | Starter image asset; not referenced by current application TSX. |
| `frontend/src/assets/react.svg` | Starter React artwork; not referenced by current application TSX. |
| `frontend/src/assets/vite.svg` | Starter Vite artwork; not referenced by current application TSX. |
| `frontend/src/components/FileUpload.tsx` | PDF selection, filename/size display, submission and loading-disable behavior. |
| `frontend/src/components/QuestionResult.tsx` | One question card: status, marks, student text, explanation and confidence. |
| `frontend/src/components/ScoreCard.tsx` | Aggregate marks, percentage, progress bar and manual-review recommendation. |
| `frontend/src/index.css` | Active global system font, body margin, card border and progress animation styles. |
| `frontend/src/main.tsx` | ReactDOM entry; StrictMode, App, Bootstrap and global CSS imports. |
| `frontend/src/types/evaluation.ts` | Duplicated question/final types plus EvaluationResponse; keep aligned with backend. |
| `frontend/tsconfig.app.json` | Frontend compiler settings: ES2023/DOM, bundler resolution, React JSX, no emit and unused checks. |
| `frontend/tsconfig.json` | Project references to app and node configurations. |
| `frontend/tsconfig.node.json` | Type-check Vite configuration with Node types, nodenext and no emit. |
| `frontend/vite.config.ts` | Vite React plugin only; no explicit proxy, custom port or API environment wiring. |

## Navigation for changes

| Task | Start here | Follow through |
|---|---|---|
| Change evaluation contract | backend/src/types/evaluation.ts | Service, scoring, controller, frontend type copy and rendering |
| Add a backend endpoint | backend/src/routes/evaluationRoutes.ts | Controller, server mount and caller |
| Fix PDF/model integration | backend/src/services/geminiService.ts | Upload controller, explicit rubric, output validation |
| Change scoring policy | backend/src/utils/scoreCalculator.ts | Both type copies, ScoreCard and QuestionResult |
| Change page flow | frontend/src/App.tsx | FileUpload and result components |
| Configure deployment | server.ts and App.tsx | CORS, API base, model networking, working directory and hosting |

No AGENTS.md, root README, test files, CI workflows, database schema, migration, auth module, or other application page is present at this revision.
