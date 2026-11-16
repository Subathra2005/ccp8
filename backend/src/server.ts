import "dotenv/config";
import express from "express";
import cors from "cors";
import evaluationRoutes from "./routes/evaluationRoutes";
const app = express();
app.use(
  cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }),
);
app.use(express.json({ limit: "512kb" }));
app.get("/api/health", (_req, res) =>
  res.json({
    success: true,
    message: "Automated Evaluation API is running",
    provider: "gemini",
    model: "gemini-4-hydrogen",
  }),
);
app.use("/api", evaluationRoutes);
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  },
);
app.listen(process.env.PORT || 5001, () =>
  console.log(`API running on port ${process.env.PORT || 5001}`),
);
