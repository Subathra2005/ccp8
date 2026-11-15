# Complete page and component guide

One React page in App.tsx, normally `http://localhost:5173/`. Upload, marking-scheme review and batch results are states on that page, not URL routes. No login/dashboard/history page exists.

| State | Contents | Action |
|---|---|---|
| Initial | AI Answer Evaluator navbar, one-key/multiple-sheets heading, local processing guidance, key uploader | Upload one TXT and Read answer key |
| Extracting | Disabled uploader, spinner and polled job message | Wait; no cancellation or ETA |
| Review | Draft title/fixed total, question/max/split-up/page table, extraction warnings, editable scheme JSON, expandable page transcriptions | Correct scheme; checkbox confirms key answers, total, split-ups, diagrams, choices and best-N policy |
| Approving | Disabled review controls | Backend validates and locks rubric |
| Ready | Locked scheme summary, multiple student PDF uploader | Select 1–10 PDFs and Evaluate answer sheets |
| Grading | Disabled controls and current job/sheet message | Poll job; process sequentially |
| Results | One article per filename, score summary, per-question results or independent file error | Upload another batch using the same locked key |
| Error | Alert with server/network/JSON/model validation message | Correct/retry where possible |
| Start different key | Button after draft creation; disabled while loading | Clear current client state and begin again |

## Components

- `FileUpload.tsx`: reusable key or multi-sheet uploader. Accept one .txt key (1 MiB) or ≤10 student PDFs (20 MiB each). Clear stored selection on invalid replacement (fixes the former stale-file bug). List filename and size, disable during work.
- `App.tsx`: own draft/editor/approval/results/loading/progress/error state. No storage or router. Scheme edits reset confirmation; server approval is required. Start different key clears client state; server session expires later.
- `ScoreCard.tsx`: total / fixed maximum, percentage and progress. Prominent provisional-result warning when review is required; show all transcription warnings.
- `QuestionResult.tsx`: question marks/status, counted/excluded-choice flag, review badge, explanation, criterion table (awarded/max and why), method assessment, final answer assessment, diagram assessment. Expand source-page transcription and confidence.
- `api.ts`: configurable API base, JSON error handling, queued/running/completed/failed polling every two seconds. No durable browser job recovery after refresh.
- `main.tsx`: React StrictMode mount; Bootstrap and index.css imports.

Global CSS includes pre-wrapped evidence and top-aligned table cells. Tables scroll horizontally inside their own responsive container. Existing App.css and starter artwork are unused by TSX. index.html still provides root div, favicon and entry module. There is no PDF annotation/editor, editable awarded marks, export or formal review-submission screen. Mathematical transcription is displayed as plain text/LaTeX source, not a symbolic-math renderer.

The current review editor is JSON plus a readable summary table. Teachers compare it with their original TXT externally. It does not yet offer a dedicated form editor or embedded PDF viewer. Do not describe this as automatic approval or a polished one-click review flow.
