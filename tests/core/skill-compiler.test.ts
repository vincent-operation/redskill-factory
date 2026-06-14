/**
 * 测试: Skill Compiler
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadSkill } from "../../src/core/skill-loader.js";
import { resolveSkill } from "../../src/core/skill-resolver.js";
import { compileToMessages, compileReadme } from "../../src/core/skill-compiler.js";

const FIXTURES_DIR = resolve(import.meta.dirname ?? __dirname, "../fixtures");

describe("compileToMessages", () => {
  it("应生成包含 system prompt 的消息", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success && result.skill);
    const resolved = resolveSkill(result.skill);
    const messages = compileToMessages(resolved);
    assert.ok(messages.length > 0);
    assert.equal(messages[0]?.role, "system");
  });

  it("应包含 few-shot examples", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success && result.skill);
    const resolved = resolveSkill(result.skill);
    const messages = compileToMessages(resolved);
    const userExamples = messages.filter((m) => m.role === "user");
    const assistantExamples = messages.filter((m) => m.role === "assistant");
    assert.ok(userExamples.length > 0);
    assert.ok(assistantExamples.length > 0);
  });

  it("用户消息应追加到末尾", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success && result.skill);
    const resolved = resolveSkill(result.skill);
    const messages = compileToMessages(resolved, "Hello test");
    const lastMessage = messages[messages.length - 1];
    assert.ok(lastMessage);
    assert.equal(lastMessage.role, "user");
    assert.ok(lastMessage.content.includes("Hello test"));
  });
});

describe("compileReadme", () => {
  it("应生成包含技能名称的 README", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success && result.skill);
    const readme = compileReadme(result.skill);
    assert.ok(readme.includes("测试技能"));
    assert.ok(readme.includes("test-skill"));
  });

  it("应包含变量说明", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success && result.skill);
    const readme = compileReadme(result.skill);
    assert.ok(readme.includes("level"));
  });
});
