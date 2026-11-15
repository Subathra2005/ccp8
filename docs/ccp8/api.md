# HTTP contracts

This reference accompanies the TXT-key / handwritten-student-PDF implementation (15 November 2026). Base URL defaults to `http://localhost:5001/api`. No application auth exists. Session/job ids are random UUIDs and must be kept private in this local workflow.

## Complete endpoint inventory

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/health` | None | 200 `{success:true,message,model}`; process check only |
| POST | `/api/schemes/extract` | Multipart single `answerKey` TXT (1 MiB) | 202 `{success:true,jobId}` |
| GET | `/api/jobs/:id` | Job UUID | 200 `{success:true,id,status,message,data?,expires}`; 404 if expired/missing |
| POST | `/api/schemes/:id/approve` | JSON `{rubric,confirmed:true}` | 200 `{success:true,sessionId,rubric}` |
| POST | `/api/evaluate` | Multipart `sessionId` and 1–10 `answerSheets` PDFs | 202 `{success:true,jobId}` |
| POST (outbound) | `${OLLAMA_BASE_URL}/api/chat` | JSON with schema and optional images | Non-streaming Ollama `message.content`, parsed as JSON |

No fixed answer-key file, history/list/delete/export/review-update endpoint, separate provider upload, or Gemini call exists. Framework CORS/preflight, GET-associated HEAD and default 404 are not custom application routes.

## Upload and transport

Keys accept .txt filenames with a 1 MiB server limit and UTF-8/content validation. Students use PDF MIME. Multer writes temporary files to the OS temp directory and limits each file to 20 MiB, limits ten files, two text fields, and 1 KiB per multipart field. Poppler subsequently checks PDF bytes (`%PDF-`) and 1–30 pages. Frontend applies corresponding input limits. Upload size errors are 413; other Multer rejections are 400. The key is moved into its session directory; student files are deleted after processing.

Backend JSON body limit is 200 KiB. Allow frontend origin via FRONTEND_ORIGIN (default `http://localhost:5173`). Frontend API base is VITE_API_BASE_URL (default `http://localhost:5001/api`). Let the multipart sender set Content-Type/boundary.

## Job lifecycle

`status` is queued, running, completed or failed. Poll every two seconds. `message` describes the current stage/sheet. All model work goes through one process-wide sequential queue, with at most five pending/running jobs. Completed/failed jobs expire after two hours; active jobs do not expire mid-run. There is no durable database or cancellation endpoint.

Completed extraction `data`:

```json
{
  "sessionId": "uuid",
  "rubric": {"title":"Exam","totalMarks":40,"instructions":"...","questions":[],"choiceGroups":[]},
  "warnings": ["Resolve ambiguous marks before approval"],
  "evidence": [{"page":1,"text":"Transcription","questions":[],"warnings":[]}]
}
```

This abbreviated example shows the envelope, not an approvable rubric: questions cannot be empty. Failed jobs expose the error in message; HTTP GET remains 200 because the job was retrieved successfully.

## Marking-scheme schema

| Field | Meaning |
|---|---|
| `title`, `instructions` | Strings; preserve exam instructions and choice policy |
| `totalMarks` | Positive finite paper maximum from teacher key |
| `questions` | 1–200 unique question ids |
| `questions[].id` | String matching main student label, e.g. `20`; use `20.A`/`20.B` for whole OR alternatives under number 20 |
| `question`, `expectedAnswer` | Question wording if available; non-empty expected answer including working |
| `maximumMarks` | Positive finite per-question maximum |
| `criteria` | Non-empty `{id,description,maximumMarks}` list with unique ids, non-empty descriptions, maxima summing exactly to question maximum (within numeric tolerance) |
| `keyPages` | Empty array for TXT; legacy PDF references are not used |
| `diagramRequired` | Boolean |
| `choiceGroups` | `{id,questionIds,choose}` list; unique ids, known disjoint question ids, equal maxima, 1 ≤ choose < alternatives |

Required question maxima plus choose-counted alternatives must sum to totalMarks. No automatic normalisation or rescaling. Each maximum ≤ 10,000; scheme JSON ≤ 100,000 characters. Approval validates again against actual key page count. Approval requires confirmed=true and cannot replace an already approved rubric. A busy session returns 409 on approval; other approval validation failures return 400. Teacher must resolve compound/nested/unequal choices into supported alternatives first.

## Student batch response

Completed batch `data` is `{results: SheetResult[], rubric}`. A SheetResult is either `{filename,success:true,data:FinalEvaluation}` or `{filename,success:false,message}`. Every accepted file gets its own outcome; invalid PDF contents can fail one file without failing the batch.

FinalEvaluation:

- `totalMarks`: backend sum of counted criterion awards.
- `maximumMarks`: immutable approved rubric.totalMarks.
- `percentage`: ratio rounded to two decimals.
- `manualReviewRequired`, `warnings`, `questions`.

Each question returns questionNumber (string), maximumMarks, obtainedMarks, status (`correct|partial|incorrect|unreadable|unanswered`), confidence, studentAnswer, reason, methodAssessment, finalAnswerAssessment, diagramAssessment, criteria, sourcePages, counted and manualReviewRequired. Criteria include id, description, approved maximumMarks, obtainedMarks and a specific reason. Excluded choices remain visible with counted=false. Missing/failed questions have provisional zero marks and a review flag.

## Outbound Ollama contract

Defaults: OLLAMA_BASE_URL=`http://localhost:11434`, OLLAMA_MODEL=`qwen3-vl:2b-instruct`. Native fetch calls `/api/chat` with JSON header, JSON-schema format for structured requests; image transcription instead streams plain text without format, keep_alive=`5m`, options `{seed:42,num_ctx:8192}` with temperature 0 for structured calls, and temperature 0.2 / repeat_penalty 1.05 for vision transcription. Budgets: 1600 for image transcription, 2200 for student grading, 1800 for indexing/question extraction (default 2400), and a 10-minute per-request timeout. Each request contains system instructions treating document contents as untrusted evidence and a user prompt. Vision requests include base64 PNGs in the user message's `images` array: one for page transcription, one for TXT-key grading (first matched student page). The TXT key is parsed in code without model calls. Legacy PDF indexing helpers are unused by the upload route.

Non-OK responses, empty message content and JSON parse failures fail explicitly. Truncated text requests retry once with a compact-output instruction at the same budget; partial JSON is never accepted. Truncated page readings split into sequential overlapping halves, then quarters if needed (maximum two split levels). Image transcription is unconstrained plain text, not image-to-JSON. Keys keep that text directly for indexing. Student question boundaries are mapped in chunks of at most 30 lines / roughly 4,000 characters with a 600-token output cap and no retry. The model returns only question ids and starting lines; code slices the original transcript exactly. Mapping failures preserve unassigned text with review warnings and never trigger image cropping. Repeated output is detected during streaming and that unsuccessful reading is cancelled early and passed to the crop fallback. Disconnected streams without a completed final event are rejected. Region-recovery warnings remain visible for teacher review. Every request logs its task, elapsed seconds, token count when provided, and stop reason; job messages expose page/region/question progress. Typed interfaces do not replace runtime checks: service validates transcriptions and awards; approval validates the complete rubric. Fixed scoring and seeded structured requests reduce variability but are not a guarantee of identical AI awards or correctness. Maxima/totals remain fixed independently.

## Other failures

Missing uploads, expired/unapproved/busy sessions, malformed PDFs, missing Poppler and queue rejection produce a JSON error envelope `{success:false,message}` (usually 400 in controllers). Grading job-level model failures fail a sheet or produce provisional failed-question results depending on the stage. Global unexpected errors return 500. Successful extraction does not imply approval, and process health does not check Poppler/Ollama availability.


Student mapping correction: image crop retries apply only to incomplete vision transcription. Completed text is mapped via `studentTextService.ts` (600 output tokens, no retry, bounded chunks). Invalid/truncated mappings retain complete unassigned text in result warnings for teacher review instead of aborting the sheet. This avoids regenerating all student work as JSON. Live model speed and mapping accuracy still need hardware testing.
