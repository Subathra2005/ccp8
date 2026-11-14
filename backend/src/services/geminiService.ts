import fs from "fs/promises";

import {
  GeminiEvaluationResponse
} from "../types/evaluation";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ||
  "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ||
  "qwen2.5:3b";

export async function evaluateAnswerSheet(
  pdfPath: string,
  answerKey: string
): Promise<GeminiEvaluationResponse> {

  await fs.access(pdfPath).catch(() => {
    throw new Error(
      "Uploaded PDF file was not found."
    );
  });

  const prompt = `
You are an expert examination evaluator.

You are given:

1. A student's handwritten answer sheet PDF.
2. An official answer key provided as text.

Your job is to evaluate the student's answers against
the official answer key.

IMPORTANT INSTRUCTIONS:

1. Carefully interpret the PDF contents.
2. Identify every question number.
3. Compare each answer with the official answer key.
4. Evaluate based on meaning and concepts, not exact wording.
5. Give partial marks when the student demonstrates only
   part of the required knowledge.
6. Do not penalize spelling or grammar unless it changes
   the meaning.
7. Never award more than the maximum marks.
8. Never invent content that the student did not write.
9. If the answer is unreadable, mark it as "unreadable".
10. Evaluate ALL questions present in the answer key.
11. Follow the maximum marks specified in the answer key.
12. Do NOT calculate the total marks.

Return ONLY valid JSON in this exact structure:

{
  "questions": [
    {
      "questionNumber": 1,
      "maximumMarks": 2,
      "obtainedMarks": 2,
      "status": "correct",
      "confidence": "high",
      "studentAnswer": "Transcribed student answer",
      "reason": "Explanation of why these marks were awarded"
    }
  ]
}

OFFICIAL ANSWER KEY:

${answerKey}
`;

  const response = await fetch(
    `${OLLAMA_BASE_URL}/api/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        format: "json",
        stream: false
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama request failed: ${errorText}`
    );
  }

  const data = (await response.json()) as {
    response?: string;
  };

  const responseText = data.response;

  if (!responseText) {
    throw new Error(
      "Ollama returned an empty response"
    );
  }

  let parsed: GeminiEvaluationResponse;

  try {
    parsed = JSON.parse(responseText);
  } catch {
    console.error(
      "Ollama returned invalid JSON:",
      responseText
    );

    throw new Error(
      "Ollama returned invalid JSON"
    );
  }

  if (
    !parsed.questions ||
    !Array.isArray(parsed.questions)
  ) {
    throw new Error(
      "Invalid evaluation structure returned by Ollama"
    );
  }

  return parsed;
}