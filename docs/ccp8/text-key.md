# Structured TXT answer keys (15 November 2026)

Key upload accepts UTF-8 `.txt`, at most 1 MiB. Arbitrary prose keys are not supported: no model is used to invent a schema. Student uploads remain handwritten PDFs. The existing `/api/schemes/extract` job envelope and approval endpoint are retained.

Example:

```text
Mathematics
TOTAL_MARKS: 3
RECORD_COUNT: 1
INTERNAL_CHOICES: none
BEGIN_RECORD: Q01
QUESTION_NUMBER: 1
SUBPART: none
MARKS: 3
QUESTION: Find the domain and range of sqrt(9-x²).
ANSWER: Domain [-3,3]; range [0,3].
MARKING_CRITERIA: [{"id":"domain","description":"Domain with valid justification","maximumMarks":1},{"id":"range","description":"Range with valid justification","maximumMarks":2}]
STEPS: Require 9-x² >= 0; function values run from 0 to 3.
END_RECORD: Q01
```

Fields begin at the start of a line. Indented continuation lines belong to the preceding field. Required record fields: QUESTION_NUMBER, MARKS, QUESTION, ANSWER. Record labels must be unique and matched. Repeated QUESTION_NUMBER values require distinct SUBPART values; these become one question with separately capped criteria. Options and CASE_STUDY_CONTEXT are preserved. SOURCE_PAGES are historical metadata, not renderable images; rubric keyPages is empty.

MARKS supports a number followed by optional parenthetical commentary, as in the user's supplied key. Explicit MARKING_CRITERIA is preferred. The parser also recognises `SOURCE_NOTE: Marks breakdown: modulus 1 mark, argument 2 marks.` and validates its sum. Otherwise it creates one flexible criterion per record, not guessed equal step splits. Review unsupported prose allocations in the JSON editor. SOURCE_NOTE and confidence warnings are shown for review. ADDITIONAL_VERIFICATION does not override ANSWER/CORRECT_OPTION.

Use `CHOICE_GROUPS: [{"id":"choice","questionIds":["20.A","20.B"],"choose":1}]` for complete equal-mark alternatives; their QUESTION_NUMBER fields can be 20.A and 20.B. Missing choice declarations warn for teacher confirmation. Invalid groups or totals fail instead of rescaling.

## Agreed marking policy

The approved key governs selected options, assumptions and principal arguments (the sample's Q3 accepts only Elements, Q15 assumes everyone likes a sport, Q22 requires the principal argument). Valid alternative methods and equivalent forms within those requirements are accepted. Worked questions require supporting working even when the result is correct. MCQs and direct-answer questions do not require unnecessary steps. A correctly labelled and filled Venn diagram is valid working.

For incorrect final answers, judge valid progress and the first substantive error: small late errors earn most credit; substantial valid progress may justify half the question marks plus 0.5 for a correct relevant formula; early errors earn only demonstrated credit. The half-plus-formula rule is never automatic. A relevant formula alone earns at most 0.5. Explicit split-ups take priority; do not count formula marks twice or exceed criterion caps. Credit valid follow-through without repeatedly penalising one error. Explanations identify the error location and awarded/lost credit.

These qualitative judgments are model instructions, not a deterministic mathematical proof checker. Backend code validates award bounds and computes the fixed total. Teacher review remains necessary for uncertain handwriting and reasoning. Key import is tested without model calls; live M1 latency and grading quality have not been benchmarked.


Student mapping correction: image crop retries apply only to incomplete vision transcription. Completed text is mapped via `studentTextService.ts` (600 output tokens, no retry, bounded chunks). Invalid/truncated mappings retain complete unassigned text in result warnings for teacher review instead of aborting the sheet. This avoids regenerating all student work as JSON. Live model speed and mapping accuracy still need hardware testing.
