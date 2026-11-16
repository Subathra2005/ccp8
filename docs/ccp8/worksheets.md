# Topic reports and personalised worksheets

## Teacher workflow

Add curriculum headers and lesson/subtopic mappings to the structured TXT key. These are optional for grading, but worksheet generation needs subject, class and board plus at least one mapped, assessed topic. Any subject/class labels are accepted; generated material must follow the supplied scope. This is not a built-in syllabus database.

```text
Science test
SUBJECT: Science
CLASS: 8
BOARD: CBSE
SYLLABUS: Current school term
LANGUAGE: English
LESSONS: ["Nutrition"]
TOTAL_MARKS: 2
INTERNAL_CHOICES: none
BEGIN_RECORD: Q1
QUESTION_NUMBER: 1
LESSON: Nutrition
SUBTOPIC: Vitamins
MARKS: 2
QUESTION: Explain two functions of vitamins.
ANSWER: Expected functions with examples.
END_RECORD: Q1
```

LESSONS is an optional JSON list; mapped lessons must belong to it when present. LESSON/SUBTOPIC on a record are copied to its criteria. Explicit MARKING_CRITERIA can override lesson/subtopic per criterion. The approval editor also accepts question-level lesson/subtopic as fallbacks. All labels are teacher-reviewed and locked with the rubric. Old keys continue to grade; missing metadata yields report warnings and may disable worksheets.

1. Grade normally. The existing Gemini call adds per-criterion mistake_type and learning_note; there is no extra report-generation call.
2. Read the teacher report: lesson/subtopic, assessed marks, question count, evidence and mistake classification. A deduction means “needs practice”, not a diagnosis of ability. Calculation slips are distinct from conceptual, method, formula, knowledge, expression and incomplete-work issues. Unknown classifications remain unknown.
3. Select 1–15 mapped topics. Deduction-bearing topics are preselected; teachers may also select topics without deductions. Unanswered, unresolved, unreadable, review-required and uncounted-choice evidence is excluded from weakness claims.
4. Create a 15-question worksheet. Free retrieval runs first; one Gemini text request fills missing questions or answers if needed. No Gemini request is made if all 15 selected questions already have source answers/guidance. The button discloses additional quota use. No automatic retry occurs.
5. Review the draft questions, solutions, marks, source links and provenance. Edit content using the worksheet JSON editor, then confirm and approve. Server-owned topic/source attribution cannot be forged through edits; teacher edits are labelled. The worksheet is separate from the original grading result.
6. Use Student PDF or Teacher answer key PDF. These open the browser print dialog; choose Save as PDF. The student document has answer space and no solution fields. The teacher document contains solutions/expected points and marking guidance. KaTeX renders $...$/$$...$$ mathematics locally; other text uses browser Unicode fonts. No paid PDF service is used.

## Free retrieval and limitations

questionRetrievalService.ts uses the fixed public English Wikibooks MediaWiki API. It searches subject, lesson, subtopic and exercises, then fetches at most two matching pages per topic. Requests never contain student names, filenames, raw answers or marks. Search is free and requires no API key, but coverage and availability are not guaranteed. This is not a general web search service or an official board-question catalogue.

The extractor retains conservative, self-contained plain-text questions, preserves available LaTeX, pairs explicit inline or definition-list answers, skips missing-figure/table questions and deduplicates. It does not guess answers, scrape paywalls or follow arbitrary model-provided URLs. Source questions remain candidates: teachers must confirm class/board/syllabus fit and difficulty. Retrieved source marks default to 1 and difficulty to practice pending teacher review; no fabricated exam-frequency claim is made.

Retrieved/adapted content includes revision URLs and CC BY-SA 4.0 attribution. Relevant source documentation:
- https://en.wikibooks.org/wiki/Wikibooks:Copyrights
- https://www.mediawiki.org/wiki/API:Search
- https://www.mediawiki.org/wiki/API:Parsing_wikitext

Retrieval has a 45-second overall deadline, 2 MiB response cap, no redirects and a one-hour in-memory cache capped at 100 curriculum/topic queries. Network/parser failures become warnings and use the approved generation fallback. The cache is not student-specific.

Gemini fallback generates exactly the missing slots, preserving retrieved question wording when supplying a missing answer. It receives curriculum context, selected topic needs and bounded approved reference scope. It must provide original self-contained questions, subject-appropriate solutions, marks and guidance, with an intended foundation/practice/challenge progression. It may ask students to draw diagrams; it does not produce image diagrams. Invalid IDs, incomplete/duplicate items or altered retrieved questions are rejected. Generated answers and retrieved answers are separately labelled. Teacher review is essential; structural validation cannot prove correctness.

## Storage and APIs

Session memory retains up to 50 recent successful evaluations and 20 worksheets, expiring with the session. Restart loses them. This adds no database or durable history.

- POST `/api/schemes/:id/worksheets`: JSON `{evaluationId,topicIds}`. Requires locked rubric, valid stored evaluation, curriculum context, distinct selected topics and idle session. Returns 202 `{success:true,jobId}`. Poll the existing job endpoint; completed `data` is `{worksheet}`.
- POST `/api/schemes/:id/worksheets/:worksheetId/approve`: JSON `{questions,confirmed:true}`. Validates exactly 15 unique IDs, nonempty question/answer/guidance, finite marks 0.5–20 and known difficulty; retains server-owned provenance. Returns `{success:true,worksheet}` with `reviewed:true`.

Failures return 400 or a failed job; grading results are unchanged. Worksheets share the existing sequential queue and session lock. PDF printing is local in the browser, not a backend download endpoint. JSON bodies allow 512 KiB; rubric validation still limits schemes to 100,000 characters.

## Verification

Tests cover metadata validation/backward compatibility, excluded evidence, topic sums, extraction and privacy, no-call complete retrieval, single-call gaps, provenance, incomplete/duplicate generated output, HTTP worksheet creation/approval, and student-print answer exclusion/XSS escaping. The local browser smoke test was blocked by the environment's Chromium process/socket restriction; actual Mac print-dialog behavior still needs a user check. A live free-source request was exercised, and its false-positive prose candidate was used to tighten extraction. No live Gemini worksheet call was made by the coding agent.
