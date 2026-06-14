/**
 * 测试: Skill Definition Zod Schema
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { skillDefinitionSchema, strictSkillDefinitionSchema } from "../../src/core/skill-definition.js";

const FIXTURES_DIR = resolve(import.meta.dirname ?? __dirname, "../fixtures");

describe("skillDefinitionSchema", () => {
  it("应通过最小化有效 YAML", () => {
    const yaml = readFileSync(resolve(FIXTURES_DIR, "minimal.skill.yml"), "utf-8");
    const parsed = parseYaml(yaml);
    const result = skillDefinitionSchema.safeParse(parsed);
    assert.ok(result.success, `Expected success but got: ${JSON.stringify(result.error?.issues)}`);
  });

  it("应通过完整 YAML", () => {
    const yaml = readFileSync(resolve(FIXTURES_DIR, "full-featured.skill.yml"), "utf-8");
    const parsed = parseYaml(yaml);
    const result = skillDefinitionSchema.safeParse(parsed);
    assert.ok(result.success, `Expected success but got: ${JSON.stringify(result.error?.issues)}`);
  });

  it("应拒绝空对象", () => {
    const result = skillDefinitionSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it("应拒绝无效技能名 (非 kebab-case)", () => {
    const result = skillDefinitionSchema.safeParse({
      meta: {
        name: "Invalid Name!",
        title: "Test",
        version: "1.0.0",
        category: "other",
        description: "test",
        author: "@test",
        tags: ["test"],
      },
      prompts: { system: "You are a test assistant." },
      variables: [],
      distribution: { targets: ["generic"] },
    });
    assert.equal(result.success, false);
    const issues = result.error?.issues ?? [];
    assert.ok(issues.some((i) => i.path.includes("name")),
      "Expected name validation error");
  });

  it("应拒绝没有分发目标的技能", () => {
    const result = skillDefinitionSchema.safeParse({
      meta: {
        name: "test-skill",
        title: "Test",
        version: "1.0.0",
        category: "other",
        description: "test",
        author: "@test",
        tags: ["test"],
      },
      prompts: { system: "You are a test assistant." },
      variables: [],
      distribution: { targets: [] },
    });
    assert.equal(result.success, false);
  });
});

describe("strictSkillDefinitionSchema", () => {
  it("应拒绝缺少 evaluation 的技能", () => {
    const yaml = readFileSync(resolve(FIXTURES_DIR, "minimal.skill.yml"), "utf-8");
    const parsed = parseYaml(yaml);
    const result = strictSkillDefinitionSchema.safeParse(parsed);
    assert.equal(result.success, false);
  });

  it("应通过包含 evaluation 的技能", () => {
    const yaml = readFileSync(resolve(FIXTURES_DIR, "full-featured.skill.yml"), "utf-8");
    const parsed = parseYaml(yaml);
    const result = strictSkillDefinitionSchema.safeParse(parsed);
    assert.ok(result.success, `Expected success but got: ${JSON.stringify(result.error?.issues)}`);
  });
});
