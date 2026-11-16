---
name: ccp8-guide
description: Understand and modify Subathra2005/ccp8, the Gemini-only handwritten answer evaluator. Use for TXT keys, teacher approval, PDF batches, marking split-ups, fixed totals, question-ID recovery, APIs, page behavior, setup, debugging and source navigation.
---

# CCP8 project guide

Use [Subathra2005/ccp8](https://github.com/Subathra2005/ccp8). This guide describes the Gemini-only cleanup of 16 November 2026. Check the current branch and implementation before editing; do not confuse similarly named CCP repositories.

## Read the relevant reference

- [API contracts](docs/ccp8/api.md): every inbound/outbound endpoint, payload, limit and failure.
- [Pages](docs/ccp8/pages.md): the single React page, approval state and result display.
- [Workflow](docs/ccp8/workflow.md): request lifecycle, configuration, tests and limitations.
- [TXT key and marking policy](docs/ccp8/text-key.md): record format, explicit split-ups and flexible grading rules.
- [Repository map](docs/ccp8/repository-map.md): every tracked file and change navigation.
- [CLI trials](docs/ccp8/gemini-trial.md): optional all-question and Q19 diagnostics.
- [README](README.md): runnable Mac setup and teacher instructions.

## Preserve the working design

1. Use only `gemini-4-hydrogen`. Send each original handwritten PDF and the immutable teacher-approved rubric in one request. Do not reintroduce an OCR/transcription pipeline or a local-model fallback. Use `backend/lib/gemini.cjs` for shared web/CLI transport, runtime validation and scoring; use `geminiService.ts` for the web adapter.
2. Parse structured UTF-8 TXT keys locally. Require teacher approval after edits to answers, maxima, criteria and choices. Never reparse the original key during grading and thereby lose approved edits.
3. Keep `GEMINI_API_KEY` only in backend `.env`. Do not log it, expose it in frontend variables, request it in chat, or commit student documents/results. Use `store:false` without claiming that it disables all provider processing. Explain that API quota/billing belongs to the selected key's project.
4. Lock all maxima to the key. Validate finite bounded criterion awards and compute question/paper sums in code. Preserve fractional marks. Do not rescale the denominator or trust a model total.
5. Constrain model question IDs to the rubric. Normalize only unambiguous plain numeric formatting (`Q19` / `19`). During model-result ID recovery, never merge subparts or OR alternatives (TXT parsing separately groups explicit subpart records into criteria). Leave duplicates unscored, report unknown IDs, preserve valid assessments and withhold the paper total on any unresolved mapping.
6. Keep unreadable, missing, ambiguous or review-required question/criterion marks null. Only genuinely unanswered work earns zero for absence. Withhold total and percentage until every assessment is resolved. Present “Not scored” and “Pending review”; never display null as zero.
7. Support disjoint equal-mark best-N choices with stable key-order ties. Require teacher acceptance. Reject nested, overlapping or unequal alternatives. Do not choose among unresolved alternatives.
8. Preserve explicit split-ups and the approved flexible policy: accept valid alternate methods and correctly filled Venn diagrams; require working where appropriate; award partial credit according to where an error occurred; avoid double-crediting formulas or repeatedly penalizing follow-through. A valid complete uncrossed-out solution may earn full credit despite a later redundant copying slip.
9. Process sheets sequentially in the global queue. Do not retry model calls automatically. Quota/auth/billing/access errors and timeouts stop remaining requests while retaining completed results. Keep invalid PDFs as independent per-file failures.
10. Keep backend/frontend evaluation types aligned. Update these references after behavior changes. Run backend tests and frontend build/lint; distinguish mocked checks from live accuracy/speed observations.

## Architecture and boundaries

Use React/TypeScript/Vite/Bootstrap, Express/TypeScript/Multer, native fetch and Poppler `pdfinfo` only for PDF validation. There is one page and no database, accounts, durable history, manual score-edit/save API, PDF annotation or automatic resume. Sessions/jobs expire after two idle hours; student uploads are removed after processing. Keep Node 22.12+ compatibility.

Trace TXT upload → parser → editable draft → approval/lock → original PDF + locked rubric → strict result validation and code scoring → nullable web results. A complete model response is still a proposed grade, not proof of handwriting or mathematical correctness. The user's 76.5-second full-sheet trial is a single observation, not a latency guarantee.
