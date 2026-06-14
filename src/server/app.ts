/**
 * Express 应用配置
 */
import express from "express";
import cors from "cors";
import { skillsRouter } from "./routes/skills.js";
import { templatesRouter } from "./routes/templates.js";
import { testRouter } from "./routes/test.js";
import { buildRouter } from "./routes/build.js";
import { marketRouter } from "./routes/market.js";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/logger.js";

export function createApp(): express.Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  app.use(requestLogger);

  // API Routes
  app.use("/api/v1/skills", skillsRouter);
  app.use("/api/v1/templates", templatesRouter);
  app.use("/api/v1/test", testRouter);
  app.use("/api/v1/build", buildRouter);
  app.use("/api/v1/market", marketRouter);
  app.use("/api/v1/health", healthRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}
