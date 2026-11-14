import { Router } from "express";
import multer from "multer";

import {
  evaluateController
} from "../controllers/evaluationController";

const router = Router();

const upload = multer({
  dest: "uploads/",

  limits: {
    fileSize: 20 * 1024 * 1024
  },

  fileFilter: (
    req,
    file,
    callback
  ) => {

    if (
      file.mimetype ===
      "application/pdf"
    ) {
      callback(null, true);
    } else {
      callback(
        new Error(
          "Only PDF files are allowed."
        )
      );
    }
  }
});

router.post(
  "/evaluate",
  upload.single("answerSheet"),
  evaluateController
);

export default router;