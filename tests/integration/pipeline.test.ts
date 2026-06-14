/**
 * 集成测试: 完整 skill 管道 (init → validate → build → market)
 *
 * 端到端验证从 YAML 定义到可分发产物的全流程。
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadSkill } from "../../src/core/skill-loader.js";
import { resolveSkill } from "../../src/core/skill-resolver.js";
import { compileForPackager, compileToMessages } from "../../src/core/skill-compiler.js";
import { packageSkill, registerPackager, listPackagers } from "../../src/packager/registry.js";
import { ClaudeCodePackager } from "../../src/packager/claude-code.js";
import { GenericPackager } from "../../src/packager/generic.js";
import { OpenAiGptPackager } from "../../src/packager/openai-gpt.js";
import { generateMarketingContent } from "../../src/marketing/note-generator.js";

const FIXTURES_DIR = resolve(import.meta.dirname ?? __dirname, "../fixtures");

describe("完整管道: YAML → 打包产物", () => {
  before(() => {
    registerPackager(new ClaudeCodePackager());
    registerPackager(new GenericPackager());
    registerPackager(new OpenAiGptPackager());
  });

  it("minimal skill: load → resolve → compile → package", async () => {
    // 1. Load
    const loadResult = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(loadResult.success && loadResult.skill);

    // 2. Resolve
    const resolved = resolveSkill(loadResult.skill);
    assert.ok(resolved.renderedSystemPrompt.length > 0);

    // 3. Compile messages
    const messages = compileToMessages(resolved);
    assert.ok(messages.length >= 3); // system + user + assistant
    assert.equal(messages[0]!.role, "system");

    // 4. Package for all targets
    const packagerInput = compileForPackager(loadResult.skill, resolved, FIXTURES_DIR);
    const outputs = await packageSkill(packagerInput, ["claude-code", "generic"]);
    assert.equal(outputs.length, 2);

    // Verify each package has files
    for (const output of outputs) {
      assert.ok(output.files.length > 0);
      assert.ok(output.directoryName.length > 0);
      for (const file of output.files) {
        assert.ok(file.content.length > 0);
        assert.ok(file.path.length > 0);
      }
    }
  });

  it("full-featured skill: complete pipeline + marketing", async () => {
    const loadResult = loadSkill(resolve(FIXTURES_DIR, "full-featured.skill.yml"));
    assert.ok(loadResult.success && loadResult.skill);
    const skill = loadResult.skill;

    // Variable resolution
    const resolved = resolveSkill(skill, { level: "beginner" });
    assert.ok(resolved.renderedSystemPrompt.includes("beginner"));

    // Compile with few-shot examples
    const messages = compileToMessages(resolved);
    const examples = messages.filter((m) => m.role === "user" || m.role === "assistant");
    assert.ok(examples.length >= 4); // 2 examples × 2 roles

    // Marketing
    const notes = generateMarketingContent(skill, { type: "note", count: 2 });
    assert.equal(notes.length, 2);
    assert.ok(notes[0]!.content.length > 0);

    const titles = generateMarketingContent(skill, { type: "title", count: 3 });
    assert.equal(titles.length, 3);
  });

  it("完整管道应在 1 秒内完成", async () => {
    const start = performance.now();

    const loadResult = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(loadResult.success && loadResult.skill);
    const resolved = resolveSkill(loadResult.skill);
    compileToMessages(resolved);
    const input = compileForPackager(loadResult.skill, resolved, FIXTURES_DIR);
    await packageSkill(input, ["claude-code", "generic"]);

    const elapsed = performance.now() - start;
    assert.ok(elapsed < 1000, `Pipeline took ${elapsed}ms, expected < 1000ms`);
  });
});

describe("打包器注册与发现", () => {
  it("应发现所有已注册的打包器", () => {
    const packagers = listPackagers();
    assert.ok(packagers.length >= 2);
    assert.ok(packagers.some((p) => p.includes("claude-code")));
    assert.ok(packagers.some((p) => p.includes("generic")));
  });
});

describe("模板系统", () => {
  it("所有内置模板都应可加载和解析", async () => {
    const { readdirSync } = await import("node:fs");
    const templatesDir = resolve(process.cwd(), "templates");

    const categories = readdirSync(templatesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let loaded = 0;
    for (const cat of categories) {
      const catDir = resolve(templatesDir, cat);
      const entries = readdirSync(catDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.endsWith(".skill.yml")) {
          const ymlPath = resolve(catDir, entry.name);
          const result = loadSkill(ymlPath);
          assert.ok(result.success, `Template ${ymlPath}: ${result.errors.map((e) => e.message).join("; ")}`);
          loaded++;
        }
      }
    }
    assert.ok(loaded >= 4, `Expected >= 4 templates, found ${loaded}`);
  });
});

describe("编译产物验证", () => {
  it("Claude Code 产物应包含 frontmatter 和标题", async () => {
    const loadResult = loadSkill(resolve(FIXTURES_DIR, "full-featured.skill.yml"));
    assert.ok(loadResult.success && loadResult.skill);
    const resolved = resolveSkill(loadResult.skill);
    const input = compileForPackager(loadResult.skill, resolved, FIXTURES_DIR);
    const outputs = await packageSkill(input, ["claude-code"]);
    const skillMd = outputs[0]!.files.find((f) => !f.path.includes("README"))!;

    assert.ok(skillMd.content.startsWith("---"));
    assert.ok(skillMd.content.includes("name: full-test-skill"));
    assert.ok(skillMd.content.includes("# 完整功能测试技能"));
  });

  it("Generic 产物 skill.json 应可被 JSON.parse", async () => {
    const loadResult = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(loadResult.success && loadResult.skill);
    const resolved = resolveSkill(loadResult.skill);
    const input = compileForPackager(loadResult.skill, resolved, FIXTURES_DIR);
    const outputs = await packageSkill(input, ["generic"]);
    const skillJson = outputs[0]!.files.find((f) => f.path === "skill.json")!;

    const parsed = JSON.parse(skillJson.content);
    assert.equal(parsed.name, "test-skill");
    assert.ok(typeof parsed.prompts.system === "string");
    assert.ok(parsed.prompts.system.length > 0);
  });
});
