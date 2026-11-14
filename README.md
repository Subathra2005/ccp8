# CCP8 — handwritten answer evaluator

Upload one handwritten PDF answer key, review its extracted marking scheme, and evaluate up to ten handwritten student PDFs against the same approved scheme. Results include each question's criteria/subpart marks, why credit was awarded or deducted, method/final-answer/diagram assessments, and a fixed-total summary.

## Run on a MacBook Air M1 (8 GB)

Install Node 22.12+ and an up-to-date Ollama (Qwen3-VL requires Ollama 0.12.7 or newer). Install Poppler and pull the small vision model:

```bash
brew install poppler
ollama pull qwen3-vl:2b-instruct
```

Keep Ollama running (open the Ollama application, or use `ollama serve` if it is not already serving). Then, from the repository root:

```bash
cd backend
npm ci
cp .env.example .env
npm run dev
```

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The default backend is `http://localhost:5001`; Ollama is `http://localhost:11434`. See `.env.example` in each package for overrides. If the browser origin changes, also set backend FRONTEND_ORIGIN. Do not manually set a multipart Content-Type header.

The 2B vision model is a memory-conscious starting point, not a guarantee of handwriting/math accuracy or a latency benchmark. One model request runs at a time; PDFs are read one page at a time at a maximum dimension of 1800 pixels. Grading revisits the first matched student page and first referenced key page together (at most two images); other pages contribute their separately extracted transcriptions and are flagged for review. Close memory-heavy apps and expect lengthy processing. A larger vision model can be configured on stronger hardware.

## Teacher workflow

1. Upload the teacher's answer key as a PDF (up to 20 MiB and 30 pages).
2. Review the draft's expected answers, question/criterion marks, page references, diagrams, and choice rules against the original PDF. The editable JSON and page transcriptions allow correction of OCR errors; this review is essential.
3. Correct missing or conflicting marks. The sum of criterion maxima must equal each question maximum. The paper maximum must equal required question maxima plus the permitted internal choices. The server rejects inconsistent totals instead of guessing or rescaling.
4. Confirm and lock the scheme. It stays immutable for that session. To revise it, start with the key again.
5. Upload 1–10 student PDFs for the same scheme. Students are processed sequentially. A failed sheet does not discard successful sheets. Keep the tab open while polling; the status describes the current stage/sheet, not a precise ETA.
6. Read each question's mark split-up and explanations, then the total. Check flagged, unreadable and unmatched answers before finalising. Zero for an unreadable/failed question is provisional, not a claim that the student earned no credit.

### Marking split-ups and choices

A question contains `criteria`: separately marked subparts or method/final/diagram steps. Use the key's exact split-ups. If the key specifies only a total, one criterion may cover the whole answer and the evaluator can award partial credit with reasons. Correct alternative methods are accepted after checking the reasoning, rather than requiring the key's exact steps.

Use a `choiceGroups` entry such as `{"id":"or20","questionIds":["20.A","20.B"],"choose":1}` for internal OR alternatives sharing a question number. The underlying student question label remains `20`. Use whole, equal-mark alternatives; `choose: 2` supports answer-any-two groups. The best permitted N scores count; ties use key order. All assessed alternatives remain visible, with excluded ones marked not counted. Teachers explicitly approve this selection policy. Other selection policies, unequal-mark alternatives and nested/overlapping choices must be resolved into independent complete equal-mark alternatives before approval; they are not silently interpreted.

### Limits and retention

- Per file: PDF MIME and `%PDF-` header checks, Poppler parsing, 20 MiB, 1–30 pages. Password-protected/unreadable PDFs fail with a message. Upload limits also apply on the server.
- A small-model context limit can require splitting long exams into sections; truncation is rejected rather than silently dropping evidence.
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

Tests use a controlled Ollama HTTP stub and real Poppler rendering to verify image transport, scheme approval, fixed scoring, choices, invalid uploads and isolated batch failures. They do not measure model handwriting or mathematics accuracy. Optional real-PDF pipeline test (still using the stub):

```bash
cd backend
TEST_KEY_PDF=/absolute/path/key.pdf TEST_SHEET_PDF=/absolute/path/student.pdf node --test tests/integration.test.cjs
```

The optional sample check expects the supplied 8-page key and 5-page sheet. No teacher or student sample PDF is committed to this repository.

## Agent and API documentation

Read [SKILL.md](SKILL.md) and [docs/ccp8](docs/ccp8/) before modifying the project. The former text-key/Gemini-named implementation has been replaced by an image-bearing Ollama workflow; no fixed `answer_key.txt` is read.

Official provider references: [Ollama chat API](https://docs.ollama.com/api/chat), [Qwen3-VL 2B instruct](https://ollama.com/library/qwen3-vl:2b-instruct).
