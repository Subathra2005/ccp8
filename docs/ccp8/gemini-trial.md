# Gemini API grading trials

This is an opt-in command-line experiment, also available separately from the Gemini web workflow. It sends the original PDF and the parsed Q19 reference from your TXT key to Google in one request. It does not use OCR or make automatic retries. Requires Node 22.12+, npm dependencies, a backend build and Poppler for local PDF validation.

From the repository root:

```bash
git pull origin main
cd backend
npm ci
npm run build
```

Add `GEMINI_API_KEY=your_actual_key` to `backend/.env` using your editor. This file is ignored by git. Do not put the key in frontend variables, screenshots, chat or command arguments. Use your intended free-tier project's key; this script cannot inspect your billing tier or promise zero cost for a paid key.

Run with the actual file paths (drag files from Finder into Terminal to insert paths):

```bash
node scripts/gemini-q19.cjs "/absolute/path/Answer sheet.pdf" "/absolute/path/answer_key.txt"
```

The complete PDF is transmitted (maximum 10 MiB / 30 pages for this trial), but only Q19 is assessed. Output includes elapsed seconds, returned usage metadata, transcription and a proposed mark capped by the TXT key. Material uncertainty forces a null mark and review. Saved reports are under ignored `backend/trial-results/`; they may contain student work. No credentials or request PDF bytes are logged.

An uncrossed-out complete correct answer established by valid work earns full credit despite a minor later redundant copying error; rejected/replaced answers are assessed differently. This is an explicit trial instruction, not a verified proof checker.

HTTP 402 indicates prepayment requirements; 403 permissions/access; 404 model/endpoint availability; 429 quota. None triggers an automatic retry. `store:false` disables stored interaction history; it is not a claim that all provider data processing/retention is disabled.

Official contracts checked 15 November 2026:
- https://aistudio.google.com/docs/models/gemini-4-hydrogen
- https://aistudio.google.com/docs/document-processing
- https://aistudio.google.com/docs/structured-output
- https://aistudio.google.com/api-reference/interactions-api/create-interaction

Tests mock Gemini. No live request was made by the coding agent. Compare every proposed mark against the source PDF before changing the web app.

## Full-sheet trial

After the successful local Q19 trial, run all questions with the same model:

```bash
git pull origin main
npm run build
node scripts/gemini-all.cjs "/absolute/path/Answer sheet.pdf" "/absolute/path/Answer key.txt"
```

These commands assume your terminal is already in `backend`. The script sends the original PDF and the entire parsed TXT rubric in one request. It uses the same `.env` key, file limits and no-retry policy as Q19. The request allows 24,576 output tokens and a 10-minute timeout; this is an upper bound, not a latency estimate. A timeout may still consume provider quota, so check usage before rerunning.

The JSON report under `backend/trial-results/gemini-all-<timestamp>.json` includes per-question visible steps, method/final-answer/diagram assessments, criterion awards with reasons, and question totals calculated in code. Maximum marks and the paper denominator come only from the parsed key. Internal choices select best N with stable key-order tie breaking. Check the printed key warnings and choice policy before relying on a score.

Missing questions become `not_evaluated`; ambiguous, unreadable or review-required assessments have null scores. Any unresolved question withholds the paper total (including unresolved choice alternatives). Only a model-confirmed genuinely unanswered question receives zero for absent work. Invalid criteria, out-of-range marks and truncated responses are rejected. Unknown/duplicate question IDs withhold the total while preserving other valid assessments. A complete response still requires human comparison against the handwriting: schema validation cannot establish mathematical or visual accuracy.

The agent tested transport and scoring using mocks, not a live full-sheet API request. The web application now defaults to Gemini and shares `backend/lib/gemini.cjs` with this full-sheet script.
