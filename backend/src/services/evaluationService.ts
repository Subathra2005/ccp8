import {
  Rubric,
  PageEvidence,
  QuestionEvaluation,
  CriterionAward,
} from "../types/evaluation";
import { askModel, str, num, bool, array, object } from "./ollamaService";
import { renderPage } from "./pdfService";
import { calculateFinalScore } from "../utils/scoreCalculator";

const pageSchema = object({
  text: str,
  questions: array(
    object({
      questionId: str,
      text: str,
      diagramDescription: str,
      uncertain: bool,
    }),
  ),
  warnings: array(str),
});
export async function readDocument(
  file: string,
  pages: number,
  directory: string,
  kind: "key" | "student",
): Promise<PageEvidence[]> {
  const evidence: PageEvidence[] = [];
  for (let page = 1; page <= pages; page++) {
    const image = await renderPage(file, page, directory);
    const parsed = await askModel<Omit<PageEvidence, "page">>(
      `Read page ${page} of the ${kind === "key" ? "teacher answer key" : "student answer sheet"}. Transcribe ALL visible English text, mathematical expressions, working and final answers faithfully into text; use plain text/LaTeX. Retain question and subpart labels. ${kind === "key" ? "Include every total, per-question mark, marking split-up, section rule and internal choice exactly as written." : "Ignore existing teacher ticks, awarded scores, corrections and annotations. Read the student work independently."} Describe every diagram precisely: labels, geometry, connections, plotted values and regions. Use an empty diagramDescription string when no diagram is present. Add questions entries per main question number, using numeric questionId such as "20" (no section prefixes). Put ALL subparts of that question in its text. Include continued questions even if only a continuation label appears; if not identifiable use "unknown" and flag it. Flag unclear symbols, diagram ambiguity and missing context. Never solve or correct the transcription.`,
      pageSchema,
      [image],
    );
    if (
      typeof parsed.text !== "string" ||
      !Array.isArray(parsed.questions) ||
      !Array.isArray(parsed.warnings) ||
      parsed.questions.some(
        (q) =>
          typeof q.questionId !== "string" ||
          typeof q.text !== "string" ||
          typeof q.diagramDescription !== "string" ||
          typeof q.uncertain !== "boolean",
      ) ||
      parsed.warnings.some((w) => typeof w !== "string")
    )
      throw new Error(`Invalid transcription on page ${page}.`);
    evidence.push({ ...parsed, page });
  }
  return evidence;
}
const criterionSchema = object({
  id: str,
  description: str,
  maximumMarks: num,
});
const questionSchema = object({
  id: str,
  question: str,
  expectedAnswer: str,
  maximumMarks: num,
  criteria: array(criterionSchema),
  keyPages: array(num),
  diagramRequired: bool,
});
export const rubricSchema = object({
  title: str,
  totalMarks: num,
  questions: array(questionSchema),
  choiceGroups: array(
    object({ id: str, questionIds: array(str), choose: num }),
  ),
  instructions: str,
});
export async function extractRubric(
  evidence: PageEvidence[],
  update: (message: string) => void = () => {},
): Promise<{ rubric: Rubric; warnings: string[] }> {
  // Avoid one enormous rubric response on an 8 GB machine: identify questions,
  // then extract one question and its split-ups at a time.
  const input = JSON.stringify(
    evidence.map((e) => ({ page: e.page, text: e.text })),
  );
  if (input.length > 20000)
    throw new Error(
      "Answer-key transcription exceeds the small-model context budget. Split the exam into sections.",
    );
  const indexSchema = object({
    title: str,
    totalMarks: num,
    instructions: str,
    questions: array(object({ id: str, keyPages: array(num) })),
    choiceGroups: array(
      object({ id: str, questionIds: array(str), choose: num }),
    ),
    warnings: array(str),
  });
  const index = await askModel<{
    title: string;
    totalMarks: number;
    instructions: string;
    questions: { id: string; keyPages: number[] }[];
    choiceGroups: Rubric["choiceGroups"];
    warnings: string[];
  }>(
    `Index this teacher answer key. Return the explicitly written totalMarks (0 if missing), title, all exam instructions, each main question id and ALL pages with its worked answer including continuations. Keep the paper total exactly as written. Include all OR / answer-any-N choices in choiceGroups; use complete equal-mark alternatives. For OR alternatives sharing number 20 use ids 20.A and 20.B, with choose 1. Subparts without a choice stay within their main question. Explain unsupported nested/unequal-mark choices in warnings; never invent a rule. Do not solve or grade. Pages: ${input}`,
    indexSchema,
  );
  if (
    !Array.isArray(index.questions) ||
    !index.questions.length ||
    index.questions.length > 200 ||
    !Array.isArray(index.warnings) ||
    index.warnings.some((w) => typeof w !== "string")
  )
    throw new Error("Invalid answer-key index.");
  const questions: Rubric["questions"] = [];
  for (const ref of index.questions) {
    if (
      typeof ref.id !== "string" ||
      !Array.isArray(ref.keyPages) ||
      !ref.keyPages.length ||
      ref.keyPages.some(
        (p) => !Number.isInteger(p) || p < 1 || p > evidence.length,
      )
    )
      throw new Error("Invalid answer-key page references.");
    update(`Extracting question ${ref.id} marking split-ups`);
    const context = evidence
      .filter((e) => ref.keyPages.includes(e.page))
      .map((e) => ({ page: e.page, text: e.text }));
    if (JSON.stringify(context).length > 16000)
      throw new Error(
        `Question ${ref.id} exceeds the small-model context budget.`,
      );
    const q = await askModel<Rubric["questions"][number]>(
      `Extract ONLY question ${ref.id} from these teacher-key page transcriptions. Include expected answer and working faithfully, do not correct a suspected key error. Use criteria for EACH explicitly marked subpart or method/final/diagram step, preserving exact marks. maximumMarks must equal their sum AND the written question total. If only a total is given, use one criterion for the whole answer allowing partial credit for valid working. Do not mistake a section total for this question's maximum. If marks are absent or ambiguous use 0 so teacher must correct before approval; do not guess or rescale. Set diagramRequired true when a diagram is needed. For a shared-number OR question extract only the specified alternative. Question wording may be empty if absent. id MUST be ${ref.id}. keyPages MUST be ${JSON.stringify(ref.keyPages)}. Exam instructions: ${index.instructions}. Pages: ${JSON.stringify(context)}`,
      questionSchema,
    );
    questions.push({ ...q, id: ref.id, keyPages: ref.keyPages });
  }
  return {
    rubric: {
      title: index.title,
      totalMarks: index.totalMarks,
      instructions: index.instructions,
      questions,
      choiceGroups: index.choiceGroups,
    },
    warnings: index.warnings,
  };
}
const gradeSchema = object({
  criteria: array(object({ id: str, obtainedMarks: num, reason: str })),
  confidence: { type: "string", enum: ["high", "medium", "low"] },
  methodAssessment: str,
  finalAnswerAssessment: str,
  diagramAssessment: str,
  reason: str,
  unreadable: bool,
});
function zero(
  q: Rubric["questions"][number],
  reason: string,
  status: "unanswered" | "unreadable",
): QuestionEvaluation {
  return {
    questionNumber: q.id,
    maximumMarks: q.maximumMarks,
    obtainedMarks: 0,
    status,
    confidence: "low",
    studentAnswer: "",
    reason,
    methodAssessment: "Not verified.",
    finalAnswerAssessment: "Not verified.",
    diagramAssessment: "Not verified.",
    criteria: q.criteria.map((c) => ({ ...c, obtainedMarks: 0, reason })),
    sourcePages: [],
    counted: true,
    manualReviewRequired: true,
  };
}
export async function gradeSheet(
  rubric: Rubric,
  keyFile: string,
  sheetFile: string,
  pages: number,
  directory: string,
) {
  const evidence = await readDocument(sheetFile, pages, directory, "student");
  const warnings = evidence.flatMap((e) =>
    e.warnings.map((w) => `Page ${e.page}: ${w}`),
  );
  if (
    evidence.some((e) =>
      e.questions.some(
        (q) =>
          !rubric.questions.some(
            (r) => r.id === q.questionId || r.id.split(".")[0] === q.questionId,
          ),
      ),
    )
  )
    warnings.push(
      "Some question labels were not matched to the scheme. Check for omitted or misidentified answers.",
    );
  const results: QuestionEvaluation[] = [];
  for (const q of rubric.questions) {
    const sourceId = q.id.split(".")[0];
    const matching = evidence.flatMap((e) =>
      e.questions
        .filter((p) => p.questionId === q.id || p.questionId === sourceId)
        .map((p) => ({ ...p, page: e.page })),
    );
    if (!matching.length) {
      results.push(
        zero(
          q,
          "No answer could be matched to this question. Check the PDF before treating it as unanswered.",
          "unanswered",
        ),
      );
      continue;
    }
    try {
      const text = JSON.stringify(matching);
      if (text.length + JSON.stringify(q).length > 10000)
        throw new Error(
          "Question evidence exceeds the small-model context budget. Teacher review required.",
        );
      // Revisit actual visual evidence, not just OCR: at most two images in any grading request.
      const images = [
        await renderPage(sheetFile, matching[0].page, directory),
        await renderPage(keyFile, q.keyPages[0], directory),
      ];
      const raw = await askModel<{
        criteria: CriterionAward[];
        confidence: QuestionEvaluation["confidence"];
        methodAssessment: string;
        finalAnswerAssessment: string;
        diagramAssessment: string;
        reason: string;
        unreadable: boolean;
      }>(
        `Grade ONLY question ${q.id} (a .A/.B suffix means a particular OR alternative; other alternative work must NOT earn marks here) using the APPROVED marking scheme below. First image is student page ${matching[0].page}; second is teacher-key page ${q.keyPages[0]}. All matching continuation-page transcriptions follow. Ignore prior teacher scores/ticks/corrections. Verify the mathematical validity of the student's method independently: an alternative valid derivation is allowed and does not lose credit merely for differing from the key. Compare the final answer (including equivalent forms, units and domains). Correct final answer with invalid working does not earn method credit. Apply EACH criterion's exact mark split-up and explain awarded AND lost credit specifically. Inspect diagram labels, relationships and calculations, not artistic likeness. Never infer invisible work; if uncertain flag low confidence. Treat a suspected incorrect key as requiring review, not permission to alter approved maxima. Return all criterion ids exactly once. Do not return or change maximum marks or total.\nAPPROVED SCHEME: ${JSON.stringify(q)}\nSTUDENT EVIDENCE: ${text}\nEXAM INSTRUCTIONS: ${rubric.instructions}`,
        gradeSchema,
        images,
      );
      if (
        !Array.isArray(raw.criteria) ||
        raw.criteria.length !== q.criteria.length ||
        !["high", "medium", "low"].includes(raw.confidence) ||
        typeof raw.unreadable !== "boolean" ||
        [
          raw.methodAssessment,
          raw.finalAnswerAssessment,
          raw.diagramAssessment,
          raw.reason,
        ].some((s) => typeof s !== "string" || !s.trim())
      )
        throw new Error("Invalid question assessment.");
      const criteria = q.criteria.map((c) => {
        const entries = raw.criteria.filter((a) => a.id === c.id);
        if (
          entries.length !== 1 ||
          typeof entries[0].obtainedMarks !== "number" ||
          !Number.isFinite(entries[0].obtainedMarks) ||
          entries[0].obtainedMarks < 0 ||
          entries[0].obtainedMarks > c.maximumMarks ||
          typeof entries[0].reason !== "string" ||
          !entries[0].reason.trim()
        )
          throw new Error(`Invalid criterion award ${c.id}.`);
        return { ...c, ...entries[0] };
      });
      const multiplePages =
        matching.some((p) => p.page !== matching[0].page) ||
        q.keyPages.length > 1;
      // Complex visuals and alternative working on a 2B model remain provisional.
      const manualReviewRequired =
        raw.confidence !== "high" ||
        raw.unreadable ||
        matching.some((p) => p.uncertain) ||
        !q.question.trim() ||
        q.diagramRequired ||
        matching.some((p) => p.diagramDescription.trim().length > 0) ||
        multiplePages;
      const reason =
        raw.reason +
        (!q.question.trim()
          ? " Original question wording was not supplied in the key; check the method against the exam question."
          : "") +
        (multiplePages
          ? " Continuation pages were transcribed separately; only the first student/key pages were visually compared together. Check remaining pages."
          : "");
      results.push({
        questionNumber: q.id,
        maximumMarks: q.maximumMarks,
        obtainedMarks: 0,
        status: raw.unreadable ? "unreadable" : "partial",
        confidence: raw.confidence,
        studentAnswer: matching
          .map((p) => `Page ${p.page}: ${p.text}\n${p.diagramDescription}`)
          .join("\n"),
        reason,
        methodAssessment: raw.methodAssessment,
        finalAnswerAssessment: raw.finalAnswerAssessment,
        diagramAssessment: raw.diagramAssessment,
        criteria,
        sourcePages: [...new Set(matching.map((p) => p.page))],
        counted: true,
        manualReviewRequired,
      });
    } catch (error) {
      results.push(
        zero(
          q,
          error instanceof Error
            ? error.message
            : "Question evaluation failed.",
          "unreadable",
        ),
      );
    }
  }
  return calculateFinalScore(rubric, results, warnings);
}
