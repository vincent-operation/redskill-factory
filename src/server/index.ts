#!/usr/bin/env node
/**
 * RedSkill Factory Web Server
 *
 * 为 Web UI 提供 REST API 后端
 */
import * as express from "express";
import { createApp } from "./app.js";
import { loadConfig, checkRequiredKeys } from "../shared/config.js";
import { registerPackager } from "../packager/registry.js";
import { ClaudeCodePackager } from "../packager/claude-code.js";
import { GenericPackager } from "../packager/generic.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// 注册内置打包器
registerPackager(new ClaudeCodePackager());
registerPackager(new GenericPackager());

const app = createApp();
const port = parseInt(process.env.RFS_SERVER_PORT ?? "3001", 10);

// 生产模式：托管 Vite 构建产物
if (process.env.NODE_ENV === "production") {
  const distPath = resolve(process.cwd(), "web", "dist");
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(resolve(distPath, "index.html"));
    });
    console.log(`Serving static files from ${distPath}`);
  }
}

// 启动前检查 API Key
const missingKeys = checkRequiredKeys();
if (missingKeys.length > 0) {
  console.warn("⚠️  Missing API keys:", missingKeys.join(", "));
  console.warn("   LLM features (test, build) will fail until configured in .env");
  console.warn("   See .env.example or set environment variables\n");
}

app.listen(port, () => {
  const config = loadConfig();
  console.log("");
  console.log("  🏭  RedSkill Factory Server");
  console.log(`  🌐  http://localhost:${port}`);
  console.log(`  📡  API: http://localhost:${port}/api/v1`);
  console.log(`  💡  LLM: ${config.deepseek.apiKey ? "DeepSeek ✓" : "DeepSeek ✗"} / ${config.anthropic.authToken ? "Claude ✓" : "Claude ✗"}`);
  console.log("");
});
