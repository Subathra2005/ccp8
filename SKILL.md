---
name: ccp8-guide
description: Understand and work on Subathra2005/ccp8, the AI Answer Evaluator. Use for CCP8 onboarding, page behavior, HTTP API contracts, Ollama integration, scoring, debugging, setup, or feature changes. Includes the complete source-file map and current implementation limitations.
---

# CCP8 Project Guide

Read this guide before modifying CCP8. Explain behavior in plain language and trace each change through the UI, controller, model service, scoring function, and shared types.

## Source and freshness

Use [Subathra2005/ccp8](https://github.com/Subathra2005/ccp8). This guide describes `main` at commit `bd23fa0571397697274d10f2ee6b98ee5f71ad10`, inspected on 14 November 2026. Treat current source as authoritative if the repository changes. Inspect the complete tree and any AGENTS.md before editing; none was present in the inspected tree. Do not confuse similarly named repositories with this one.

## Read the relevant reference

- Read [API contracts](docs/ccp8/api.md) for every implemented HTTP endpoint, multipart fields, payloads, responses, error behavior, and the outbound Ollama request.
- Read [Pages and components](docs/ccp8/pages.md) for the entire single-page UI, its states, actions, and display rules.
- Read [Workflow and development](docs/ccp8/workflow.md) for setup, request lifecycle, scoring, known gaps, debugging, and change verification.
- Read [Complete repository map](docs/ccp8/repository-map.md) for every tracked file and its purpose.

## Understand the architecture

Use React 19 + TypeScript + Vite + Bootstrap in `frontend/`; use Express 5 + TypeScript + Multer in `backend/`. Run the two packages separately. There is no database, authentication, durable evaluation history, router, or CI workflow in the inspected tree.

Treat `frontend/src/App.tsx` as the only application page. Treat upload, loading, error, and results as states on that page, not separate URL routes. The backend exposes `GET /api/health` and `POST /api/evaluate`. The service makes an outbound `POST /api/generate` to Ollama.

## Preserve the important contracts

- Use multipart field `answerSheet` for a single PDF, with a backend limit of 20 MiB.
- Keep frontend and backend `types/evaluation.ts` aligned; they are duplicated definitions, not a shared package.
- Keep the frontend's hardcoded `http://localhost:5001` address and backend CORS origin `http://localhost:5173` in mind when changing ports or deployment.
- Start the backend with `backend/` as its working directory: `.env`, `answer_key.txt`, and `uploads/` are relative to that directory.
- Calculate totals in `scoreCalculator.ts`, after the model response. Preserve clamping and the low-confidence/unreadable review flag unless requirements change.

## Do not mistake intent for working functionality

The critical defect is in `backend/src/services/geminiService.ts`: it verifies PDF existence but never reads or sends PDF contents. Ollama receives the answer key and instructions only. Do not claim the current application actually transcribes or grades the uploaded student's handwriting. A successful HTTP response does not establish grading correctness.

Despite Gemini names, comments, and logs, the live service calls Ollama with default model `qwen2.5:3b`; it does not call Google Gemini. The installed `@google/genai` dependency is unused by the inspected application source. The answer key has 20 questions but no explicit per-question mark allocation; the model supplies maximum marks without an authoritative rubric.

## Follow a change workflow

1. Resolve the current repository and revision; read the affected reference and implementation files.
2. Trace UI action → HTTP request → upload middleware → controller → Ollama → scoring → response → UI.
3. State whether a proposed behavior exists today or is new work. Avoid inventing routes, pages, persistence, or provider capabilities.
4. Edit the smallest relevant set of files; update both type copies for contract changes.
5. Run the package's existing build/lint commands as applicable. No automated test suite is configured. Verify meaningful positive and failure paths when changing behavior.
6. Report what was verified and any blocked checks. Do not report live Ollama evaluation as tested without actually running it.
7. Refresh these references after route, page, model, schema, or setup changes; record the new source revision.
