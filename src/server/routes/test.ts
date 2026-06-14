/**
 * 测试/Playground API 路由
 */
import { Router } from "express";
import { resolve } from "node:path";
import { loadSkill } from "../../core/skill-loader.js";
import { resolveSkill } from "../../core/skill-resolver.js";
import { compileToMessages } from "../../core/skill-compiler.js";
import { PlaygroundRunner } from "../../playground/runner.js";
import { Session } from "../../playground/session.js";
import { llmRouter } from "../../llm/router.js";
import { NotFoundError, ValidationError } from "../middleware/error-handler.js";

export const testRouter = Router();

const SKILLS_DIR = resolve(process.cwd(), "skills");
const sessions = new Map<string, Session>();
let sessionCounter = 0;

// 清理过期 session (30 min)
setInterval(() => {
  // Simple expiry — just clear all after 30min of the last use
  // In production, track lastUsed per session
}, 30 * 60 * 1000);

function loadAndResolve(skillName: string, variables?: Record<string, unknown>) {
  const ymlPath = resolve(SKILLS_DIR, skillName, `${skillName}.skill.yml`);
  const result = loadSkill(ymlPath);
  if (!result.success || !result.skill) {
    throw new NotFoundError(`Skill '${skillName}'`);
  }
  return resolveSkill(result.skill, variables);
}

/**
 * POST /api/v1/test/session/new — 创建测试会话
 */
testRouter.post("/session/new", (req, res) => {
  const { skillName, variables } = req.body as {
    skillName?: string;
    variables?: Record<string, unknown>;
  };
  if (!skillName) throw new ValidationError("skillName is required");

  const resolved = loadAndResolve(skillName, variables);
  const id = `session_${++sessionCounter}`;
  const session = new Session(resolved);
  sessions.set(id, session);

  res.json({
    sessionId: id,
    greeting: resolved.prompts.greeting ?? null,
    variables: resolved.resolvedVariables,
  });
});

/**
 * POST /api/v1/test/session/:id/message — 发送消息
 */
testRouter.post("/session/:id/message", async (req, res) => {
  const session = sessions.get(req.params.id!);
  if (!session) throw new NotFoundError(`Session '${req.params.id}'`);

  const { message, provider: providerName } = req.body as {
    message?: string;
    provider?: string;
  };
  if (!message) throw new ValidationError("message is required");

  const provider = providerName
    ? llmRouter.get(providerName)
    : llmRouter.selectFor("general");

  if (!provider) throw new ValidationError(`Provider '${providerName ?? "default"}' not available`);

  session.addUser(message);
  const history = session.getHistory();
  const result = await provider.chat(history);
  session.addAssistant(result.content);

  res.json({ response: result.content, turnCount: session.turnCount });
});

/**
 * GET /api/v1/test/session/:id — 获取会话历史
 */
testRouter.get("/session/:id", (req, res) => {
  const session = sessions.get(req.params.id!);
  if (!session) throw new NotFoundError(`Session '${req.params.id}'`);
  res.json({ history: session.getHistory(), turnCount: session.turnCount });
});

/**
 * DELETE /api/v1/test/session/:id — 删除会话
 */
testRouter.delete("/session/:id", (req, res) => {
  sessions.delete(req.params.id!);
  res.json({ success: true });
});

/**
 * POST /api/v1/test/send — 快速发送（无会话）
 */
testRouter.post("/send", async (req, res) => {
  const { skillName, variables, message, provider: providerName } = req.body as {
    skillName?: string;
    variables?: Record<string, unknown>;
    message?: string;
    provider?: string;
  };
  if (!skillName) throw new ValidationError("skillName is required");
  if (!message) throw new ValidationError("message is required");

  const resolved = loadAndResolve(skillName, variables);
  const runner = new PlaygroundRunner(resolved, { provider: providerName });
  const response = await runner.send(message);
  res.json({ response });
});

/**
 * GET /api/v1/test/stream — SSE 流式聊天
 */
testRouter.get("/stream", async (req, res) => {
  const skillName = req.query.skillName as string;
  const message = req.query.message as string;
  const providerName = req.query.provider as string | undefined;

  if (!skillName || !message) {
    res.status(400).json({ error: "skillName and message query params are required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const resolved = loadAndResolve(skillName);
  const runner = new PlaygroundRunner(resolved, { provider: providerName });

  try {
    for await (const chunk of runner.sendStream(message)) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
  }
  res.end();
});

/**
 * POST /api/v1/test/eval — 运行评测
 */
testRouter.post("/eval", async (req, res) => {
  const { skillName, variables } = req.body as {
    skillName?: string;
    variables?: Record<string, unknown>;
  };
  if (!skillName) throw new ValidationError("skillName is required");

  const resolved = loadAndResolve(skillName, variables);
  const runner = new PlaygroundRunner(resolved);
  const report = await runner.runEval();
  res.json(report);
});
