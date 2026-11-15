import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Rubric } from "../types/evaluation";
export interface Session {
  id: string;
  directory: string;
  keyFile: string;
  pages: number;
  rubric?: Rubric;
  expires: number;
  busy: boolean;
}
interface Job {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  message: string;
  data?: unknown;
  expires: number;
}
const sessions = new Map<string, Session>();
const jobs = new Map<string, Job>();
const TTL = 2 * 60 * 60 * 1000;
let tail: Promise<void> = Promise.resolve();
let pending = 0;
export async function createSession(keyFile: string, pages: number) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ccp8-"));
  const session: Session = {
    id: randomUUID(),
    directory,
    keyFile: path.join(directory, pages === 0 ? "key.txt" : "key.pdf"),
    pages,
    expires: Date.now() + TTL,
    busy: true,
  };
  try {
    await fs.rename(keyFile, session.keyFile);
  } catch {
    await fs.rm(directory, { recursive: true, force: true });
    throw new Error("Could not retain answer key.");
  }
  sessions.set(session.id, session);
  return session;
}
export function getSession(id: string) {
  const session = sessions.get(id);
  if (!session || (!session.busy && session.expires < Date.now()))
    throw new Error("Marking session expired. Upload the key again.");
  session.expires = Date.now() + TTL;
  return session;
}
export function enqueue(
  message: string,
  run: (update: (s: string) => void) => Promise<unknown>,
): string {
  if (pending >= 5)
    throw new Error("Evaluation queue is full. Please try again later.");
  const id = randomUUID();
  const job: Job = {
    id,
    status: "queued",
    message,
    data: undefined,
    expires: Date.now() + TTL,
  };
  jobs.set(id, job);
  pending++;
  tail = tail.then(async () => {
    job.status = "running";
    try {
      job.data = await run((s) => {
        job.message = s;
      });
      job.status = "completed";
      job.message = "Completed";
    } catch (error) {
      job.status = "failed";
      job.message =
        error instanceof Error ? error.message : "Processing failed.";
    } finally {
      pending--;
      job.expires = Date.now() + TTL;
    }
  });
  return id;
}
export function getJob(id: string) {
  const job = jobs.get(id);
  if (
    !job ||
    (["completed", "failed"].includes(job.status) && job.expires < Date.now())
  )
    return undefined;
  return job;
}
setInterval(() => {
  for (const [id, s] of sessions)
    if (!s.busy && s.expires < Date.now()) {
      sessions.delete(id);
      void fs
        .rm(s.directory, { recursive: true, force: true })
        .catch(console.error);
    }
  for (const [id, j] of jobs)
    if (["completed", "failed"].includes(j.status) && j.expires < Date.now())
      jobs.delete(id);
}, 60000).unref();
