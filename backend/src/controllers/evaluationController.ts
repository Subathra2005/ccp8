import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";

import {
  evaluateAnswerSheet
} from "../services/geminiService";

import {
  calculateFinalScore
} from "../utils/scoreCalculator";

export async function evaluateController(
  req: Request,
  res: Response
) {

  let uploadedFilePath: string | undefined;

  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF answer sheet."
      });
    }

    uploadedFilePath = req.file.path;

    // Only accept PDF
    if (
      req.file.mimetype !==
      "application/pdf"
    ) {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed."
      });
    }

    // Read answer key
    const answerKeyPath =
      path.join(
        process.cwd(),
        "answer_key.txt"
      );

    const answerKey =
      await fs.readFile(
        answerKeyPath,
        "utf-8"
      );

    if (!answerKey.trim()) {
      return res.status(500).json({
        success: false,
        message: "Answer key is empty."
      });
    }

    console.log(
      "Starting Gemini evaluation..."
    );

    // Send PDF + answer key to Gemini
    const geminiResult =
      await evaluateAnswerSheet(
        uploadedFilePath,
        answerKey
      );

    console.log(
      "Gemini evaluation completed."
    );

    // Calculate score ourselves
    const finalResult =
      calculateFinalScore(
        geminiResult
      );

    return res.status(200).json({
      success: true,
      message: "Answer sheet evaluated successfully.",
      data: finalResult
    });

  } catch (error) {

    console.error(
      "Evaluation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong during evaluation."
    });

  } finally {

    // Always delete uploaded PDF
    if (uploadedFilePath) {
      try {
        await fs.unlink(
          uploadedFilePath
        );

        console.log(
          "Temporary PDF deleted."
        );

      } catch (deleteError) {

        console.error(
          "Could not delete uploaded PDF:",
          deleteError
        );
      }
    }
  }
}