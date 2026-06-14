/**
 * 测试: CLI Commands (validate, init, list, build)
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadSkill } from "../../src/core/skill-loader.js";
import { findSkillFiles } from "../../src/shared/fs.js";
import { registerPackager, packageSkill } from "../../src/packager/registry.js";
import { ClaudeCodePackager } from "../../src/packager/claude-code.js";
import { GenericPackager } from "../../src/packager/generic.js";
import { resolveSkill } from "../../src/core/skill-resolver.js";
import { compileForPackager } from "../../src/core/skill-compiler.js";

const FIXTURES_DIR = resolve(import.meta.dirname ?? __dirname, "../fixtures");

describe("CLI: validate", () => {
  it("应通过有效的 skill.yml (minimal)", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success);
    assert.ok(result.skill);
  });

  it("应通过完整的 skill.yml (full-featured)", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "full-featured.skill.yml"));
    assert.ok(result.success);
    assert.ok(result.skill);
    assert.equal(result.skill.meta.name, "full-test-skill");
  });

  it("应拒绝无效的 YAML 文件", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "invalid.skill.yml"));
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0]!.message.includes("YAML 解析失败"));
  });

  it("应拒绝不存在的文件", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "nonexistent.skill.yml"));
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0]!.message.includes("文件不存在"));
  });

  it("strict 模式应拒绝缺少 evaluation 的技能", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"), true);
    assert.equal(result.success, false);
  });
});

describe("CLI: init (template structure)", () => {
  it("最小化 fixture 应包含必要的 meta 字段", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success && result.skill);
    const meta = result.skill.meta;
    assert.ok(meta.name.length > 0);
    assert.ok(meta.title.length > 0);
    assert.ok(meta.version.length > 0);
    assert.ok(Array.isArray(meta.tags));
  });

  it("完整 fixture 应包含 prompts, variables, evaluation", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "full-featured.skill.yml"));
    assert.ok(result.success && result.skill);
    const skill = result.skill;
    assert.ok(skill.prompts.system.length > 0);
    assert.ok(skill.prompts.examples.length > 0);
    assert.ok(skill.variables.length > 0);
    assert.ok(skill.evaluation && skill.evaluation.tests.length > 0);
  });
});

describe("CLI: build (packaging pipeline)", () => {
  before(() => {
    registerPackager(new ClaudeCodePackager());
    registerPackager(new GenericPackager());
  });

  it("应将 minimal skill 打包为 claude-code 格式", async () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success && result.skill);
    const resolved = resolveSkill(result.skill);
    const input = compileForPackager(result.skill, resolved, FIXTURES_DIR);
    const outputs = await packageSkill(input, ["claude-code"]);

    assert.equal(outputs.length, 1);
    assert.equal(outputs[0]!.target, "claude-code");
    assert.ok(outputs[0]!.files.length >= 2);
  });

  it("应将 full-featured skill 打包为 generic 格式", async () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "full-featured.skill.yml"));
    assert.ok(result.success && result.skill);
    const resolved = resolveSkill(result.skill);
    const input = compileForPackager(result.skill, resolved, FIXTURES_DIR);
    const outputs = await packageSkill(input, ["generic"]);

    assert.equal(outputs.length, 1);
    assert.equal(outputs[0]!.target, "generic");
    assert.ok(outputs[0]!.files.some((f) => f.path === "skill.json"));
  });

  it("应支持同时打包多个 target", async () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "full-featured.skill.yml"));
    assert.ok(result.success && result.skill);
    const resolved = resolveSkill(result.skill);
    const input = compileForPackager(result.skill, resolved, FIXTURES_DIR);
    const outputs = await packageSkill(input, ["claude-code", "generic"]);

    assert.equal(outputs.length, 2);
  });

  it("应拒绝无效 skill", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "invalid.skill.yml"));
    assert.equal(result.success, false);
  });
});

describe("CLI: list (template discovery)", () => {
  it("应能找到内置模板目录", () => {
    const templatesDir = resolve(process.cwd(), "templates");
    assert.ok(existsSync(templatesDir));
  });

  it("应能找到 education 分类模板", () => {
    const educationDir = resolve(process.cwd(), "templates", "education");
    const files = findSkillFiles(educationDir);
    assert.ok(files.length > 0);
  });

  it("所有内置模板都应通过校验", () => {
    const categories = ["education", "productivity", "creative", "lifestyle"];
    for (const cat of categories) {
      const catDir = resolve(process.cwd(), "templates", cat);
      if (!existsSync(catDir)) continue;
      const files = findSkillFiles(catDir);
      for (const file of files) {
        const result = loadSkill(file);
        assert.ok(
          result.success,
          `Template ${file} should be valid: ${result.errors.map((e) => e.message).join("; ")}`,
        );
      }
    }
  });
});
