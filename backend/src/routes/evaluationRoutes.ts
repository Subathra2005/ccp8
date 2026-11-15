import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import multer from "multer";
import fs from "node:fs/promises";
import os from "node:os";
import {
  extractController,
  approveController,
  evaluateController,
  jobController,
} from "../controllers/evaluationController";
const router = Router();
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 20 * 1024 * 1024, files: 10, fields: 2, fieldSize: 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("Only PDF files are allowed.")),
});
const keyUpload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 1024 * 1024, files: 1, fields: 0 },
  fileFilter: (_req, file, cb) => /\.txt$/i.test(file.originalname)
    ? cb(null, true) : cb(new Error("Answer key must be a structured UTF-8 .txt file.")),
});
function cleanUpload(handler: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) =>
    handler(req, res, async (error) => {
      if (!error) return next();
      const files = [
        ...(req.file ? [req.file] : []),
        ...(Array.isArray(req.files) ? req.files : []),
      ];
      await Promise.all(files.map((f) => fs.rm(f.path, { force: true })));
      res
        .status(
          error instanceof multer.MulterError &&
            error.code === "LIMIT_FILE_SIZE"
            ? 413
            : 400,
        )
        .json({ success: false, message: error.message });
    });
}
router.post(
  "/schemes/extract",
  cleanUpload(keyUpload.single("answerKey")),
  extractController,
);
router.post("/schemes/:id/approve", approveController);
router.post(
  "/evaluate",
  cleanUpload(upload.array("answerSheets", 10)),
  evaluateController,
);
router.get("/jobs/:id", jobController);
export default router;
