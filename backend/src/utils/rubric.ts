import { Rubric } from "../types/evaluation";
export function validateRubric(value: unknown, pageCount?: number): Rubric {
  if (!value || typeof value !== "object")
    throw new Error("Marking scheme must be an object.");
  const r = value as Rubric;
  const text = (v: unknown) => typeof v === "string";
  const positive = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 10000;
  const close = (a: number, b: number) => Math.abs(a - b) < 0.00001;
  if (!text(r.title) || !text(r.instructions) || !positive(r.totalMarks))
    throw new Error(
      "Provide a title, instructions and a positive fixed totalMarks.",
    );
  if (
    !Array.isArray(r.questions) ||
    !r.questions.length ||
    r.questions.length > 200 ||
    !Array.isArray(r.choiceGroups)
  )
    throw new Error("Provide 1–200 questions and a choiceGroups array.");
  const optionalLabel = (v: unknown) => v === undefined || (typeof v === 'string' && v.trim().length > 0 && v.length <= 160);
  if (![r.subject,r.classLevel,r.board,r.syllabus,r.language].every(optionalLabel) ||
      (r.lessons !== undefined && (!Array.isArray(r.lessons) || r.lessons.length > 200 || !r.lessons.every(x=>typeof x==='string' && optionalLabel(x)))))
    throw new Error('Use short non-empty subject/class/board/syllabus/language labels and a lessons array.');
  const ids = new Set<string>();
  for (const q of r.questions) {
    if (!text(q.id) || !q.id.trim() || ids.has(q.id))
      throw new Error("Each question/subpart needs a unique id.");
    ids.add(q.id);
    if (![q.lesson,q.subtopic].every(optionalLabel)) throw new Error(`Invalid lesson/topic for ${q.id}.`);
    if (
      !text(q.question) ||
      !text(q.expectedAnswer) ||
      !q.expectedAnswer.trim() ||
      !positive(q.maximumMarks) ||
      typeof q.diagramRequired !== "boolean"
    )
      throw new Error(
        `Check the expected answer and maximum marks for ${q.id}.`,
      );
    if (
      !Array.isArray(q.keyPages) ||
      (pageCount !== undefined && pageCount !== 0 && !q.keyPages.length) ||
      q.keyPages.some(
        (p) =>
          !Number.isInteger(p) ||
          p < 1 ||
          (pageCount !== undefined && p > pageCount),
      )
    )
      throw new Error(`Check answer-key page references for ${q.id}.`);
    if (!Array.isArray(q.criteria) || !q.criteria.length)
      throw new Error(`Add marking criteria for ${q.id}.`);
    const criterionIds = new Set<string>();
    for (const c of q.criteria) {
      if (
        !text(c.id) ||
        !c.id.trim() ||
        criterionIds.has(c.id) ||
        !text(c.description) ||
        !c.description.trim() ||
        !positive(c.maximumMarks)
      )
        throw new Error(`Check marking split-ups for ${q.id}.`);
      criterionIds.add(c.id);
      if (![c.lesson,c.subtopic].every(optionalLabel)) throw new Error(`Invalid criterion lesson/topic for ${q.id}.`);
      const lesson=c.lesson||q.lesson;
      if(r.lessons?.length && lesson && !r.lessons.includes(lesson)) throw new Error(`Lesson ${lesson} is not in the approved lessons list.`);
    }
    if (
      !close(
        q.criteria.reduce((s, c) => s + c.maximumMarks, 0),
        q.maximumMarks,
      )
    )
      throw new Error(
        `Split-ups for ${q.id} do not add up to ${q.maximumMarks}.`,
      );
  }
  const grouped = new Set<string>();
  const groupIds = new Set<string>();
  let total = r.questions.reduce((s, q) => s + q.maximumMarks, 0);
  for (const g of r.choiceGroups) {
    if (
      !text(g.id) ||
      !g.id.trim() ||
      groupIds.has(g.id) ||
      !Array.isArray(g.questionIds) ||
      !Number.isInteger(g.choose) ||
      g.choose < 1 ||
      g.choose >= g.questionIds.length
    )
      throw new Error("Check internal-choice group ids and choose counts.");
    groupIds.add(g.id);
    const qs = g.questionIds.map((id) => {
      if (!ids.has(id) || grouped.has(id))
        throw new Error(
          "Choice groups must use known, non-overlapping question ids.",
        );
      grouped.add(id);
      return r.questions.find((q) => q.id === id)!;
    });
    if (qs.some((q) => !close(q.maximumMarks, qs[0].maximumMarks)))
      throw new Error(
        `Choice group ${g.id} has unequal marks. Group complete equal-mark alternatives, or resolve the rule before approval.`,
      );
    total -= (qs.length - g.choose) * qs[0].maximumMarks;
  }
  if (!close(total, r.totalMarks))
    throw new Error(
      `Question marks after internal choices add up to ${total}, but the key total is ${r.totalMarks}. Correct the scheme; totals are never rescaled automatically.`,
    );
  if (JSON.stringify(r).length > 100000)
    throw new Error("Marking scheme is too large.");
  return r;
}
