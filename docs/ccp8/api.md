# HTTP API contracts

Source revision: `bd23fa0571397697274d10f2ee6b98ee5f71ad10`.

## Endpoint inventory

| Direction | Method and URL | Implementation | Purpose |
|---|---|---|---|
| Client → backend | `GET http://localhost:5001/api/health` | `backend/src/server.ts` | Process health response; does not check Ollama or the answer key |
| Client → backend | `POST http://localhost:5001/api/evaluate` | `evaluationRoutes.ts` → `evaluationController.ts` | Accept a PDF, call the model service, calculate scores |
| Backend → Ollama | `POST ${OLLAMA_BASE_URL}/api/generate` | `backend/src/services/geminiService.ts` | Request a non-streaming JSON generation |

These are all explicit application HTTP handlers and outbound calls in the inspected source. Vite serves the frontend and static assets; those are not additional custom API handlers. Express/CORS provide framework behavior such as preflight and GET-associated HEAD handling. No custom list, delete, login, answer-key upload, history, export, or review-update endpoint exists. Unknown routes fall through Express's default 404 behavior; there is no custom JSON 404 handler.

## Shared transport rules

Backend port: `process.env.PORT || 5001`. CORS response configuration allows browser origin `http://localhost:5173`; this is not authentication or a restriction on non-browser callers. `express.json()` is installed, but evaluation requires multipart rather than a JSON body. No application auth headers, cookies, or tokens are used. No explicit request timeout, retry, cancellation, rate limit, or schema validation library is configured.

## GET /api/health

No request body or parameters. HTTP 200 JSON:

```json
{"success":true,"message":"Automated Evaluation API is running"}
```

The frontend does not call this endpoint. Use it to isolate backend availability from model or upload issues.

## POST /api/evaluate

Send `multipart/form-data` with exactly one file field named `answerSheet`. Let the browser or curl set the multipart boundary. Multer saves the file to relative `uploads/` and limits it to `20 * 1024 * 1024` bytes (20 MiB). Its filter accepts only the supplied MIME value `application/pdf`; no PDF magic-byte or content validation is implemented. The controller repeats the MIME check.

```bash
curl http://localhost:5001/api/health
curl -X POST http://localhost:5001/api/evaluate \
  -F 'answerSheet=@/absolute/path/student.pdf;type=application/pdf'
```

No query parameters, path parameters, student identifiers, rubric fields, or additional text fields are consumed. The official key always comes from `backend/answer_key.txt` via the backend working directory.

HTTP 200 response shape (illustrative values, not an observed model result):

```json
{
  "success": true,
  "message": "Answer sheet evaluated successfully.",
  "data": {
    "totalMarks": 1,
    "maximumMarks": 2,
    "percentage": 50,
    "questions": [{
      "questionNumber": 1,
      "maximumMarks": 2,
      "obtainedMarks": 1,
      "status": "partial",
      "confidence": "medium",
      "studentAnswer": "Example transcription",
      "reason": "Example explanation"
    }],
    "manualReviewRequired": false
  }
}
```

### Data contract

| Field | Declared type | Meaning |
|---|---|---|
| `questionNumber` | number | Question identifier supplied by the model |
| `maximumMarks` | number | Per-question maximum supplied by the model |
| `obtainedMarks` | number | Model mark, converted and clamped by backend |
| `status` | `correct`, `partial`, `incorrect`, `unreadable` | Question outcome |
| `confidence` | `high`, `medium`, `low` | Model confidence |
| `studentAnswer` | string | Model-provided transcription; current PDF integration cannot substantiate it |
| `reason` | string | Model explanation |
| `totalMarks` | number | Sum of clamped marks |
| `maximumMarks` in data | number | Sum of converted maxima |
| `percentage` | number | Total / maximum × 100, rounded to two decimals; 0 when maximum is 0 |
| `manualReviewRequired` | boolean | True if any status is unreadable or confidence is low |

The unions and field types are TypeScript declarations, not full runtime validation. Only the presence of an array `questions` is checked by the service; scoring does limited numeric checks. The frontend `EvaluationResponse` interface requires `data`, although actual error envelopes omit it; App does not use that interface to validate responses.

### Errors as implemented

| Status | Trigger | Message or behavior |
|---|---|---|
| 400 | Controller receives no file | `Please upload a PDF answer sheet.` |
| 400 | Controller MIME fallback rejects file | `Only PDF files are allowed.` |
| 500 | Multer rejects non-PDF before controller | `Only PDF files are allowed.` via global handler |
| 500 | Multer limit/unexpected field/other middleware error | Middleware error message via global handler; not mapped to 413 or 400 |
| 500 | Answer key is whitespace/empty | `Answer key is empty.` |
| 500 | Answer key read, network, model, parsing, or scoring fails | Error's message, or `Something went wrong during evaluation.` |

Error envelope: `{"success":false,"message":"..."}`. Global handler fallback: `Internal server error`. Controller cleanup attempts `fs.unlink` in `finally` after recording a path, including its own validation and evaluation failures. Middleware errors occur before controller execution, so do not attribute their cleanup guarantees to that finally block. Cleanup errors are logged without changing the response.

## Outbound Ollama POST /api/generate

Configuration is read into module constants:

| Variable | Default |
|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` |
| `OLLAMA_MODEL` | `qwen2.5:3b` |

Header: `Content-Type: application/json`. Body:

```json
{"model":"qwen2.5:3b","prompt":"<evaluation instructions plus official answer key>","format":"json","stream":false}
```

The prompt requests semantic grading, partial credit, no spelling penalty unless meaning changes, unreadable status, all key questions, no invented answers, no marks above maxima, and no total calculation. It requests `{"questions":[...]}`. These are instructions, not enforced correctness checks. The PDF is absent from the payload; there is no file upload, base64 content, OCR text, image array, or document extraction step.

Expect an Ollama response object containing a string `response`; JSON.parse that string into the question object. Other Ollama response fields are ignored. On non-OK status throw `Ollama request failed: <response text>`. Missing/empty response throws `Ollama returned an empty response`; parse failure throws `Ollama returned invalid JSON`; missing/non-array questions throws `Invalid evaluation structure returned by Ollama`. Failed file access throws `Uploaded PDF file was not found.`. Do not treat this as a Gemini REST endpoint.
