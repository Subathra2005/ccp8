import { randomUUID } from 'node:crypto';
import { buildLearningReport } from '../services/learningService';
import { checkGeminiConfiguration, gradeGeminiSheet, shouldStopBatch } from '../services/geminiService';
import { parseTextKey } from '../services/textKeyService';
import { Request, Response } from "express";
import fs from "node:fs/promises";
import { inspectPdf } from "../services/pdfService";
import {
  createSession,
  enqueue,
  getSession,
  getJob,
} from "../services/jobStore";
import { validateRubric } from "../utils/rubric";
import { SheetResult } from "../types/evaluation";
export async function extractController(req: Request, res: Response) {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "Upload a structured answerKey TXT file." });
  const file = req.file;
  let session: Awaited<ReturnType<typeof createSession>> | undefined;
  try {
    const draft = parseTextKey(await fs.readFile(file.path, "utf8"));
    const pages = 0;
    session = await createSession(file.path, pages);
    const current = session;
    const jobId = enqueue("Reading teacher answer key", async (update) => {
      try {
        update("Validating TXT scheme (no model extraction)");
        const evidence: never[] = [];
        const warnings = [...draft.warnings];
        try {
          validateRubric(draft.rubric, pages);
        } catch (error) {
          warnings.push(
            error instanceof Error ? error.message : "Invalid scheme.",
          );
        }
        return { sessionId: current.id, ...draft, warnings, evidence };
      } finally {
        current.busy = false;
        current.expires = Date.now() + 2 * 60 * 60 * 1000;
      }
    });
    return res.status(202).json({ success: true, jobId });
  } catch (error) {
    if (session) {
      session.busy = false;
      session.expires = 0;
      await fs.rm(session.directory, { recursive: true, force: true });
    }
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Could not read answer key.",
    });
  } finally {
    await fs.rm(file.path, { force: true });
  }
}
export function approveController(req: Request, res: Response) {
  try {
    const session = getSession(String(req.params.id));
    if (session.busy)
      return res
        .status(409)
        .json({ success: false, message: "Session is busy." });
    if (req.body?.confirmed !== true)
      throw new Error(
        "Confirm the total, split-ups, expected answers and internal-choice policy before approval.",
      );
    if (session.rubric)
      throw new Error(
        "This scheme is already locked. Upload the key again to revise it.",
      );
    session.rubric = JSON.parse(
      JSON.stringify(validateRubric(req.body.rubric, session.pages)),
    );
    return res.json({
      success: true,
      sessionId: session.id,
      rubric: session.rubric,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Invalid marking scheme.",
    });
  }
}
export async function evaluateController(req: Request, res: Response) {
  const files = Array.isArray(req.files) ? req.files : [];
  let accepted = false;
  let releaseLock: (() => void) | undefined;
  try {
    const session = getSession(String(req.body?.sessionId || ""));
    if (!session.rubric)
      throw new Error("Review and approve the marking scheme first.");
    if (session.busy)
      throw new Error("A batch is already running for this key.");
    if (!files.length) throw new Error("Upload 1–10 answerSheets PDFs.");
    checkGeminiConfiguration();
    // Acquire before the first await so simultaneous uploads cannot share a session.
    session.busy = true;
    releaseLock = () => {
      session.busy = false;
    };
    const rubric = session.rubric;
    // Copy uploads into the session directory; retain no student file after its result.
    for (const file of files) {
      const target = `${session.directory}/sheet-${file.filename}.pdf`;
      await fs.rename(file.path, target);
      file.path = target;
    }
    session.busy = true;
    let jobId: string;
    try {
      jobId = enqueue("Evaluating answer sheets", async (update) => {
        const results: SheetResult[] = [];
        let batchStopReason: string | undefined;
        try {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            update(
              `Evaluating sheet ${i + 1} of ${files.length}: ${file.originalname}`,
            );
            try {
              if (batchStopReason) throw new Error(`Not evaluated: batch stopped. ${batchStopReason}`);
              const pages = await inspectPdf(file.path);
              const data = await gradeGeminiSheet(rubric, file.path, pages,
                message => update(`Sheet ${i + 1}/${files.length}: ${message}`));
              data.evaluationId = randomUUID();
              data.learningReport = buildLearningReport(rubric, data);
              if(Object.keys(session.evaluations).length >= 50) delete session.evaluations[Object.keys(session.evaluations)[0]];
              session.evaluations[data.evaluationId] = data;
              results.push({
                filename: file.originalname,
                success: true,
                data,
              });
            } catch (error) {
              if (shouldStopBatch(error)) batchStopReason = error instanceof Error ? error.message : "Provider unavailable.";
              results.push({
                filename: file.originalname,
                success: false,
                message:
                  error instanceof Error ? error.message : "Evaluation failed.",
              });
            } finally {
              await fs.rm(file.path, { force: true });
            }
          }
          return { results, rubric };
        } finally {
          session.busy = false;
          session.expires = Date.now() + 2 * 60 * 60 * 1000;
          await Promise.all(files.map((f) => fs.rm(f.path, { force: true })));
        }
      });
    } catch (error) {
      session.busy = false;
      throw error;
    }
    accepted = true;
    return res.status(202).json({ success: true, jobId });
  } catch (error) {
    releaseLock?.();
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Could not start evaluation.",
    });
  } finally {
    if (!accepted)
      await Promise.all(files.map((f) => fs.rm(f.path, { force: true })));
  }
}
export function jobController(req: Request, res: Response) {
  const job = getJob(String(req.params.id));
  return job
    ? res.json({ success: true, ...job })
    : res
        .status(404)
        .json({ success: false, message: "Job expired or not found." });
}
