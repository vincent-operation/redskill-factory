#!/usr/bin/env node
/**
 * RedSkill Factory — Production Server
 *
 * 单进程运行 API + Web UI，可直接部署到任意 Node.js 环境。
 * 用法: npm run start:prod
 */
import * as express from "express";
import { createApp, mountRoutes } from "./app.js";
import { loadConfig, checkRequiredKeys } from "../shared/config.js";
import { registerPackager } from "../packager/registry.js";
import { ClaudeCodePackager } from "../packager/claude-code.js";
import { GenericPackager } from "../packager/generic.js";
import { OpenAiGptPackager } from "../packager/openai-gpt.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Register packagers
registerPackager(new ClaudeCodePackager());
registerPackager(new GenericPackager());
registerPackager(new OpenAiGptPackager());

const app = createApp();
mountRoutes(app);

const port = parseInt(process.env.RFS_SERVER_PORT ?? process.env.PORT ?? "3001", 10);

// Production: serve Vite-built web UI
const webDist = resolve(process.cwd(), "web", "dist");
const hasWeb = existsSync(webDist);
if (hasWeb) {
  app.use(express.static(webDist));
  // SPA fallback: non-API routes serve index.html
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(resolve(webDist, "index.html"));
  });
}

// Startup check
const missingKeys = checkRequiredKeys();
if (missingKeys.length > 0) {
  console.warn("⚠️  Missing API keys:", missingKeys.join(", "));
  console.warn("   LLM features unavailable. Set keys in .env\n");
}

app.listen(port, () => {
  const config = loadConfig();
  console.log(`\n  🏭  RedSkill Factory v0.1.0`);
  console.log(`  🌐  http://localhost:${port}`);
  console.log(`  🛍️  商店: http://localhost:${port}/store`);
  console.log(`  💰 卖家: http://localhost:${port}/seller`);
  console.log(`  💡 LLM: ${config.deepseek.apiKey ? "DeepSeek ✓" : "DeepSeek ✗"} / ${config.anthropic.authToken ? "Claude ✓" : "Claude ✗"}`);
  console.log();
});
