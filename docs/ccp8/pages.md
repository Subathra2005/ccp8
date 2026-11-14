# Pages and components

Source revision: `bd23fa0571397697274d10f2ee6b98ee5f71ad10`.

## Complete page inventory

There is one application screen, normally opened at `http://localhost:5173/`. No React Router, separate page files, links to other app screens, or authenticated routes exist. Other URL handling is the dev/hosting server's concern, not an application route definition. `index.html` supplies title `frontend`, favicon `/favicon.svg`, root div, and module `/src/main.tsx`. `main.tsx` mounts App inside React StrictMode and imports Bootstrap CSS plus `index.css`.

## App.tsx: persistent shell and state

The blue navbar displays **AI Answer Evaluator**. The centered heading is **Automated Answer Evaluation**, followed by text asking for a handwritten answer sheet to evaluate against the provided key. A responsive Bootstrap `col-lg-9` contains all content.

App owns `result: FinalEvaluation | null`, `loading: boolean`, and `error: string | null`, initially null/false/null. The upload component owns selected-file state. No localStorage, sessionStorage, database, context store, or navigation state persists results.

| UI state | What appears | Actions and transitions |
|---|---|---|
| Initial | Shell, upload card; submit disabled | Select PDF to enable evaluation |
| Selected file | Filename and size to 2 decimal places in MB | Click Evaluate Answer Sheet |
| Loading | Upload remains, inputs disabled, button spinner/text; additional centered spinner and explanatory text | Await one POST; no cancel/progress polling |
| Error | Upload and red **Evaluation Failed** alert with error text | Retry; error clears on next request |
| Success | Score card, Question-wise Evaluation heading, Evaluate Another button, one result card per question | Evaluate Another clears result/error and remounts fresh upload |

Request start sets loading true, clears old result and error, builds FormData with `answerSheet`, and posts to hardcoded `http://localhost:5001/api/evaluate`. App parses JSON before checking HTTP status. A non-OK response throws its `message` or `Evaluation failed.`. Success sets `data.data` without runtime schema checks. Catch logs and displays Error.message or `Something went wrong.`; finally clears loading. There is no check of the response's `success` boolean independent of HTTP status. Reset does not call the backend.

## FileUpload.tsx

Props: `onEvaluate(file: File): void`, `loading: boolean`.

Card heading: **Upload Student Answer Sheet**. Native single-file input has `accept="application/pdf"`, Bootstrap styling, and disables while loading. Selection validates `selectedFile.type === 'application/pdf'`; rejection alerts `Please select a PDF file.` and clears the input. No selection clears state. Valid selection displays name and `(size / 1024 / 1024).toFixed(2)` MB. There is no frontend file-size limit, drag/drop, preview, multipage selector, or answer-key selector.

Submit alerts `Please select an answer sheet.` if called without a stored file, otherwise invokes onEvaluate. The button is disabled without a file or while loading; labels are **Evaluate Answer Sheet** and **Evaluating Answer Sheet...**.

Known edge case: selecting an invalid file after a valid one clears the input but does not clear the previous stored File. A later submit can still use the prior valid PDF. Treat this as current behavior, not a desired contract.

## ScoreCard.tsx

Prop: `result: FinalEvaluation`. Shows **Evaluation Result**, subtitle **AI-assisted handwritten answer evaluation**, total / maximum, percentage, and a progress bar whose inline width is `${percentage}%`. When manualReviewRequired is true, shows **Manual Review Recommended** with text about low confidence or unreadable handwriting. It has no editable marks, review submission, download, or export action.

## QuestionResult.tsx

Prop: `question: QuestionEvaluation`. Shows question number, uppercase status badge, obtained / maximum marks, **Student's Answer**, **AI Evaluation** reason, and confidence. Missing/empty studentAnswer displays **No readable answer detected.**. App uses questionNumber as React key; duplicates from unvalidated model output can cause duplicate keys.

| Status | Bootstrap badge color | Icon |
|---|---|---|
| correct | success | ✓ |
| partial | warning | ◐ |
| incorrect | danger | ✕ |
| unreadable | secondary | ? |
| unexpected | secondary | empty |

There is no detailed PDF viewer, OCR correction screen, rubric editor, human reviewer page, login, dashboard, or evaluation history page.

## Styling and assets

`main.tsx` imports `bootstrap/dist/css/bootstrap.min.css` and `index.css`. Global CSS removes body margin, sets a system font, removes card borders, and animates progress width for 0.6s. App does not import App.css: its template CSS is inactive in the current import graph. The hero/react/vite assets and public icons sprite are not referenced by the inspected TSX application. The favicon is referenced by index.html.
