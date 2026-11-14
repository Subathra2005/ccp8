---
name: ccp8-guide
description: Understand and modify Subathra2005/ccp8, the local handwritten PDF answer evaluator. Use for teacher-key extraction and approval, multiple student sheets, fixed-total criterion scoring, internal choices, Ollama vision, UI, APIs, debugging, and setup on an 8 GB M1 Mac.
---

# CCP8 project guide

Read this entry point before working on CCP8. Describe the current implementation, not the previous text-only evaluator. This guide accompanies the handwritten-PDF batch-evaluation implementation dated 14 November 2026; verify current source before changes.

## Read the relevant reference

- [API contracts](docs/ccp8/api.md): all inbound/outbound endpoints, payloads, jobs and errors.
- [Pages](docs/ccp8/pages.md): complete single-page states, teacher approval and result presentation.
- [Workflow](docs/ccp8/workflow.md): extraction, visual evidence, scoring, choices, cleanup, limits and validation.
- [Repository map](docs/ccp8/repository-map.md): all tracked files and change navigation.
- [README](README.md): runnable Mac setup and teacher instructions.

## Preserve these invariants

1. Send actual rendered PDF images to a vision-capable Ollama model, never instructions alone. Use unconstrained streamed plain text for image transcription; index key text directly and organise student text in a separate text-only schema request. Preserve early repetition cancellation, complete-stream checks and bounded region fallback; never accept truncated evidence or partial JSON. Use `qwen3-vl:2b-instruct` as the default for an 8 GB M1 Mac; do not substitute a text-only model.
2. Extract the key once per session, then require teacher correction/approval of its total, expected answers, split-ups, page references and choices. Treat approval as a required product step. Never infer approval from a successful extraction.
3. Lock the approved rubric on the backend. Never trust model-provided totals or maximum marks. Sum validated criterion awards in code against the locked maxima and reject inconsistent schemes.
4. Apply choice groups using best N equal-mark complete alternatives, with stable key-order tie breaking. Require explicit teacher approval of this policy. Reject overlapping, nested or unequal-mark groups; explain the limitation rather than guessing.
5. Accept alternative mathematically valid methods after checking reasoning and final answers. Preserve criterion-level explanations of credit awarded/deducted and separate method, final-answer and diagram assessments.
6. Process sheets independently and sequentially, with one global model queue. Show per-sheet failures and provisional question failures instead of inventing scores.
7. Flag low/medium confidence, unreadable/missing evidence, diagrams and multi-page visual comparisons for teacher review. A zero for a failed or unreadable question is provisional. Do not describe a small vision model as an authoritative mathematical verifier.
8. Keep frontend/backend evaluation types aligned. Update this guide and API docs whenever behavior changes.

## Architecture

Use React/TypeScript/Vite/Bootstrap in frontend and Express/TypeScript/Multer/Poppler/native fetch in backend. There is one app page; no database, accounts, history or external grading provider. Model integration is `POST /api/chat` to local Ollama. Run Node 22.12+ and Poppler; see README for package commands. Environment variables are read at request time for model settings.

## Work carefully

Trace key upload → page rendering/transcription → rubric draft → validation/approval → student batch → visual and text evidence → criterion awards → fixed scoring → UI. Read current AGENTS.md and relevant source files. Run backend tests plus frontend build/lint for changes affecting this flow. Report which checks used a stub versus a live model. Never claim end-to-end handwriting accuracy or M1 speed without a live hardware test.
