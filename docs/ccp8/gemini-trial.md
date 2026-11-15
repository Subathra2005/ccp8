# Gemini Q19 API trial

This is an opt-in command-line experiment, not a change to the web app's Ollama provider. It sends the original PDF and the parsed Q19 reference from your TXT key to Google in one request. It does not use OCR or make automatic retries. Requires Node 22.12+, npm dependencies, a backend build and Poppler for local PDF validation.

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

Tests mock Gemini. No live request was made by the coding agent. Compare the result against the source PDF before expanding to a complete sheet or changing the web app.
