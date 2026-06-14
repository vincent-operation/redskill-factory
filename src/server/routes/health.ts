/**
 * 健康检查 API
 */
import { Router } from "express";
import { llmRouter } from "../../llm/router.js";

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    llmProviders: llmRouter.listAvailable(),
    timestamp: new Date().toISOString(),
  });
});
