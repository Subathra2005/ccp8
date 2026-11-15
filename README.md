# CCP8 — handwritten answer evaluator

Upload one structured UTF-8 TXT answer key, review its directly parsed marking scheme, and evaluate up to ten handwritten student PDFs against the same approved scheme. Results include each question's criteria/subpart marks, why credit was awarded or deducted, method/final-answer/diagram assessments, and a fixed-total summary.

## Run on a MacBook Air M1 (8 GB)

Install Node 22.12+ and Poppler (`brew install poppler`). Gemini is now the default provider; Ollama does not need to run.

From the repository root:

```bash
cd backend
npm ci
# Only if .env does not already exist:
cp -n .env.example .env
npm run dev
```

Before starting, put these settings in `backend/.env` using your editor. Keep your existing private key; never paste it into chat or frontend code:

```dotenv
EVALUATION_PROVIDER=gemini
GEMINI_API_KEY=your_actual_key
```

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Backend defaults to `http://localhost:5001`. Restart the backend after editing `.env`. See each package's `.env.example` for port/origin overrides.

Gemini receives the original student PDF plus the teacher-approved rubric in one request per sheet, using `gemini-4-hydrogen`. No preliminary OCR pipeline is used. The TXT key is parsed locally without a model. The existing local provider remains available only when explicitly configured with `EVALUATION_PROVIDER=ollama`; it is never used as an automatic fallback. For that provider install/pull `qwen3-vl:2b-instruct` and start Ollama.

The user's full-sheet CLI trial returned 24 assessments in 76.5 seconds. This is one observed run, not a guaranteed latency or accuracy benchmark. Your API project's quota/billing applies. `store:false` disables interaction history, not all provider data processing.

## Teacher workflow

1. Upload the structured TXT key (UTF-8, up to 1 MiB). See [TXT format](docs/ccp8/text-key.md). No Ollama or Poppler call is made to prepare the key.
2. Review the draft's expected answers, question/criterion marks, page references, diagrams, and choice rules against the original TXT. The editable JSON and page transcriptions allow correction of OCR errors; this review is essential.
3. Correct missing or conflicting marks. The sum of criterion maxima must equal each question maximum. The paper maximum must equal required question maxima plus the permitted internal choices. The server rejects inconsistent totals instead of guessing or rescaling.
4. Confirm and lock the scheme. It stays immutable for that session. To revise it, start with the key again.
5. Upload 1–10 student PDFs for the same scheme. Students are processed sequentially. A failed sheet does not discard successful sheets. Keep the tab open while polling; the status describes the current stage/sheet, not a precise ETA.
6. Read each question's mark split-up and explanations, then the total. Check flagged, unreadable and unmatched answers before finalising. With Gemini, unresolved questions have null marks and the paper total/percentage is withheld, not counted as zero. Confirmed unanswered work may receive zero.

### Marking split-ups and choices

A question contains `criteria`: separately marked subparts or method/final/diagram steps. Use the key's exact split-ups. If the key specifies only a total, one criterion may cover the whole answer and the evaluator can award partial credit with reasons. Correct alternative methods are accepted after checking the reasoning, rather than requiring the key's exact steps.

Use a `choiceGroups` entry such as `{"id":"or20","questionIds":["20.A","20.B"],"choose":1}` for internal OR alternatives sharing a question number. The underlying student question label remains `20`. Use whole, equal-mark alternatives; `choose: 2` supports answer-any-two groups. The best permitted N scores count; ties use key order. All assessed alternatives remain visible, with excluded ones marked not counted. Teachers explicitly approve this selection policy. Other selection policies, unequal-mark alternatives and nested/overlapping choices must be resolved into independent complete equal-mark alternatives before approval; they are not silently interpreted.

### Limits and retention

- Per file: PDF MIME and `%PDF-` header checks, Poppler parsing, 10 MiB for Gemini (20 MiB for explicit Ollama), 1–30 pages. Password-protected/unreadable PDFs fail with a message. Upload limits also apply on the server.
- Gemini uses a 10-minute timeout and a 24,576 output-token cap. No automatic retries or provider fallback. Truncated/invalid responses fail explicitly. Quota/auth/billing/model-access errors stop remaining sheets in the batch; completed results are preserved. Check usage before manually retrying a timeout.
- Jobs and approved schemes live in memory. Restarting the backend loses them; there is no durable student history or resume-after-refresh UI.
- Uploaded keys remain in an OS temporary directory for the session. Idle sessions/results expire after two hours. Student PDFs are removed after processing, and rendered images are removed immediately after reading. Abnormal process termination can leave OS temporary files; these are not a durable storage feature.
- This is a local development app without accounts or access control. The default browser origin is localhost. It is not configured as a multi-user hosted grading service.

## Checks

```bash
cd backend
npm test
cd ../frontend
npm run build
npm run lint
```

Tests use controlled Gemini and Ollama HTTP stubs and real Poppler rendering to verify image transport, scheme approval, fixed scoring, choices, invalid uploads and isolated batch failures. They do not measure model handwriting or mathematics accuracy. Optional real-PDF pipeline test (still using the stub):

```bash
cd backend
TEST_SHEET_PDF=/absolute/path/student.pdf node --test tests/integration.test.cjs
```

The optional check uses a synthetic TXT key and the selected student PDF. No teacher or student sample PDF is committed to this repository.

## Agent and API documentation

Read [SKILL.md](SKILL.md) and [docs/ccp8](docs/ccp8/) before modifying the project. Gemini is the default full-PDF provider; the explicit local Ollama path remains available. No fixed `answer_key.txt` is read.

Official provider references: [Ollama chat API](https://docs.ollama.com/api/chat), [Qwen3-VL 2B instruct](https://ollama.com/library/qwen3-vl:2b-instruct).

## Optional Gemini grading trials

See [the API trial instructions](docs/ccp8/gemini-trial.md) to test direct PDF grading with your own key. The web app now uses the same full-sheet Gemini engine. This separate script reports response time, usage and a reviewable Q19 assessment; it does not automatically retry or change providers.

For all questions, use `node scripts/gemini-all.cjs "/path/Answer sheet.pdf" "/path/Answer key.txt"` from `backend` after building. This reports criterion-level reasons and a key-locked total, withheld when any assessment is unresolved. See the trial instructions above.
