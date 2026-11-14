import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import evaluationRoutes
  from "./routes/evaluationRoutes";

const app = express();

const PORT =
  process.env.PORT || 5001;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173"
  })
);

app.use(express.json());

// Health check
app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Automated Evaluation API is running"
    });
  }
);

// Routes
app.use(
  "/api",
  evaluationRoutes
);

// Global error handler
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {

    console.error(error);

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error"
    });
  }
);

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);