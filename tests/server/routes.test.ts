/**
 * 测试: Server API Routes
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createApp, mountRoutes } from "../../src/server/app.js";
import { registerPackager } from "../../src/packager/registry.js";
import { ClaudeCodePackager } from "../../src/packager/claude-code.js";
import { GenericPackager } from "../../src/packager/generic.js";
import { OpenAiGptPackager } from "../../src/packager/openai-gpt.js";

let server: Server;
let baseUrl: string;

// Generate valid skill YAML for testing
const VALID_YAML = `
meta:
  name: api-test-skill
  title: "API Test"
  version: "0.1.0"
  category: education
  description: "Test skill"
  author: "@test"
  tags: [test]
prompts:
  system: "You are a test assistant."
  examples:
    - user: "hi"
      assistant: "Hello!"
variables:
  - name: mode
    label: "Mode"
    type: select
    default: "a"
    options: [a, b]
distribution:
  targets: [claude-code]
`.trim();

before(async () => {
  // Register packagers (done in server/index.ts but we're testing app.ts directly)
  registerPackager(new ClaudeCodePackager());
  registerPackager(new GenericPackager());
  registerPackager(new OpenAiGptPackager());

  const app = createApp();
  mountRoutes(app);
  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

after(() => {
  server.closeAllConnections?.();
  server.close();
});

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

describe("Health", () => {
  it("GET /api/v1/health → 200 ok", async () => {
    const { status, data } = await request("GET", "/api/v1/health");
    assert.equal(status, 200);
    assert.equal(data.status, "ok");
  });
});

describe("Build", () => {
  it("GET /api/v1/build/formats → 返回格式数组", async () => {
    const { status, data } = await request("GET", "/api/v1/build/formats");
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.formats));
    assert.ok(data.formats.length >= 2);
    assert.ok(data.formats.some((f: string) => f.includes("claude-code")));
  });
});

describe("Skills Validate", () => {
  it("POST /api/v1/skills/validate → 接受有效 YAML", async () => {
    const { status, data } = await request("POST", "/api/v1/skills/validate", { yaml: VALID_YAML });
    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.deepEqual(data.errors, []);
  });

  it("POST /api/v1/skills/validate → 拒绝无效 YAML", async () => {
    const { status, data } = await request("POST", "/api/v1/skills/validate", { yaml: "this: [[[invalid" });
    assert.equal(status, 200);
    assert.equal(data.success, false);
    assert.ok(data.errors.length > 0);
  });

  it("POST /api/v1/skills/validate → 400 无 yaml 字段", async () => {
    const { status } = await request("POST", "/api/v1/skills/validate", {});
    assert.equal(status, 400);
  });

  it("POST /api/v1/skills/validate → 拒绝违反 Zod 的 YAML", async () => {
    const badYaml = `meta:\n  name: bad name\n  title: x\n  version: x\n  category: x\n  description: x\n  author: x\n  tags: []\nprompts:\n  system: x\n  examples: []\nvariables: []\ndistribution:\n  targets: [claude-code]\n`;
    const { status, data } = await request("POST", "/api/v1/skills/validate", { yaml: badYaml });
    assert.equal(status, 200);
    assert.equal(data.success, false);
    assert.ok(data.errors.length > 0);
  });
});

describe("Skills CRUD", () => {
  it("POST /api/v1/skills → 400 空 body", async () => {
    const { status } = await request("POST", "/api/v1/skills", {});
    assert.equal(status, 400);
  });

  it("GET /api/v1/skills/:name → 400 非 kebab-case", async () => {
    const { status, data } = await request("GET", "/api/v1/skills/BAD_NAME");
    assert.equal(status, 400);
    assert.ok(data.error.message.includes("Invalid skill name"));
  });

  // Note: Express normalizes ../ in URLs before routing (e.g. /api/v1/skills/../etc → /api/v1/etc).
  // This provides an additional layer of defense against path traversal.
});

describe("Templates", () => {
  it("GET /api/v1/templates → 返回 templates 对象", async () => {
    const { status, data } = await request("GET", "/api/v1/templates");
    assert.equal(status, 200);
    assert.ok(typeof data.templates === "object");
    assert.ok(data.templates !== null);
  });
});
