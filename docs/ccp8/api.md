# HTTP contracts

This reference accompanies the TXT-key / handwritten-student-PDF implementation (15 November 2026). Base URL defaults to `http://localhost:5001/api`. No application auth exists. Session/job ids are random UUIDs and must be kept private in this local workflow.

## Complete endpoint inventory

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/health` | None | 200 `{success:true,message,provider,model}`; process check only |
| POST | `/api/schemes/extract` | Multipart single `answerKey` TXT (1 MiB) | 202 `{success:true,jobId}` |
| GET | `/api/jobs/:id` | Job UUID | 200 `{success:true,id,status,message,data?,expires}`; 404 if expired/missing |
| POST | `/api/schemes/:id/approve` | JSON `{rubric,confirmed:true}` | 200 `{success:true,sessionId,rubric}` |
| POST | `/api/evaluate` | Multipart `sessionId` and 1–10 `answerSheets` PDFs | 202 `{success:true,jobId}` |
| POST (outbound, default) | `https://generativelanguage.googleapis.com/v1beta/interactions` | PDF document plus locked rubric text and JSON schema | Completed structured assessment |

No fixed answer-key file, history/list/delete/export/review-update endpoint or separate provider upload exists. Framework CORS/preflight, GET-associated HEAD and default 404 are not custom application routes.

## Upload and transport

Keys accept .txt filenames with a 1 MiB server limit and UTF-8/content validation. Students use PDF MIME. Multer writes temporary files to the OS temp directory and limits each file to 10 MiB, limits ten files, two text fields, and 1 KiB per multipart field. Poppler subsequently checks PDF bytes (`%PDF-`) and 1–30 pages. Frontend and Gemini transport enforce the same 10 MiB limit. Upload size errors are 413; other Multer rejections are 400. The key is moved into its session directory; student files are deleted after processing.

Backend JSON body limit is 200 KiB. Allow frontend origin via FRONTEND_ORIGIN (default `http://localhost:5173`). Frontend API base is VITE_API_BASE_URL (default `http://localhost:5001/api`). Let the multipart sender set Content-Type/boundary.

## Job lifecycle

`status` is queued, running, completed or failed. Poll every two seconds. `message` describes the current stage/sheet. All model work goes through one process-wide sequential queue, with at most five pending/running jobs. Completed/failed jobs expire after two hours; active jobs do not expire mid-run. There is no durable database or cancellation endpoint.

Completed extraction `data`:

```json
{
  "sessionId": "uuid",
  "rubric": {"title":"Exam","totalMarks":40,"instructions":"...","questions":[],"choiceGroups":[]},
  "warnings": ["Resolve ambiguous marks before approval"],
  "evidence": []
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

Required question maxima plus choose-counted alternatives must sum to totalMarks. No automatic normalisation or rescaling. Each maximum ≤ 10,000; scheme JSON ≤ 100,000 characters. Approval validates again with a key page count of zero because the reference is TXT; keyPages must be empty. Approval requires confirmed=true and cannot replace an already approved rubric. A busy session returns 409 on approval; other approval validation failures return 400. Teacher must resolve compound/nested/unequal choices into supported alternatives first.

## Student batch response

Completed batch `data` is `{results: SheetResult[], rubric}`. A SheetResult is either `{filename,success:true,data:FinalEvaluation}` or `{filename,success:false,message}`. Every accepted file gets its own outcome; invalid PDF contents can fail one file without failing the batch.

FinalEvaluation:

- `totalMarks`: backend sum of counted criterion awards, or null when Gemini assessments are unresolved.
- `maximumMarks`: immutable approved rubric.totalMarks.
- `percentage`: ratio rounded to two decimals, or null.
- Gemini adds `provider`, `model`, `elapsedSeconds`, `usage` (provider token metadata).
- `manualReviewRequired`, `warnings`, `questions`.

Each question returns questionNumber (string), maximumMarks, obtainedMarks, status (`correct|partial|incorrect|unreadable|unanswered|not_evaluated`), confidence, studentAnswer, reason, methodAssessment, finalAnswerAssessment, diagramAssessment, criteria, sourcePages, counted and manualReviewRequired. Criteria include id, description, approved maximumMarks, obtainedMarks and a specific reason. Excluded choices remain visible with counted=false. Gemini question/criterion `obtainedMarks` can be null. Missing assessments are `not_evaluated`; unreadable/review-required results remain unscored. `counted` is null for unresolved choice selection. Any unresolved question withholds the total.

## Outbound Gemini contract (default)

Gemini only; backend-only `GEMINI_API_KEY`. `POST https://generativelanguage.googleapis.com/v1beta/interactions`, headers `x-goog-api-key` and `Api-Revision: 2026-05-20`. Native fetch sends `model:gemini-4-hydrogen`, `store:false`, base64 PDF `document` input and text containing the immutable approved rubric. Structured `response_format` supplies JSON schema; `generation_config.max_output_tokens=24576`. Timeout: 600 seconds. No automatic retries or fallback.

Shared `backend/lib/gemini.cjs` powers the CLI and web adapter. It accepts only completed JSON, exact criterion IDs, bounded finite marks and valid source pages. The response schema enumerates approved question IDs. Unambiguous plain-number formatting such as Q19/19 is normalized; subparts and OR labels are never flattened. Duplicate questions remain unscored, unknown labels are reported in warnings, and either condition withholds the total while retaining other valid assessments. Missing questions are unscored. Code supplies maxima, sums and best-N choice selection. Error messages redact keys. HTTP 401/402/403/404/429 and timeouts stop the remaining batch; other per-sheet failures preserve independent processing. Missing API key fails before queueing. Health reports configuration, not credentials or verified provider access.

## Other failures

Missing uploads, expired/unapproved/busy sessions, malformed PDFs, missing Poppler and queue rejection produce a JSON error envelope `{success:false,message}` (usually 400 in controllers). Grading job-level model failures fail a sheet or return unscored questions when evidence is unresolved. Global unexpected errors return 500. Successful extraction does not imply approval, and process health does not check Poppler/Gemini availability.

