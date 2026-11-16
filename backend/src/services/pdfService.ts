import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
const exec = promisify(execFile);
export const MAX_PAGES = 30;
export async function inspectPdf(file: string): Promise<number> {
  const handle = await fs.open(file, "r");
  try {
    const header = Buffer.alloc(5);
    await handle.read(header, 0, 5, 0);
    if (header.toString() !== "%PDF-") throw new Error("Invalid PDF contents.");
  } finally {
    await handle.close();
  }
  try {
    const { stdout } = await exec("pdfinfo", [file], {
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    const pages = Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES)
      throw new Error(`PDF must have 1–${MAX_PAGES} pages.`);
    return pages;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error("Poppler is missing. On macOS run: brew install poppler");
    throw new Error(
      error instanceof Error ? error.message : "Could not read PDF.",
    );
  }
}
