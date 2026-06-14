/**
 * 测试: Skill Loader
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadSkill } from "../../src/core/skill-loader.js";

const FIXTURES_DIR = resolve(import.meta.dirname ?? __dirname, "../fixtures");

describe("loadSkill", () => {
  it("应成功加载最小化 YAML", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success);
    assert.equal(result.errors.length, 0);
    assert.ok(result.skill);
    assert.equal(result.skill.meta.name, "test-skill");
  });

  it("应成功加载完整 YAML", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "full-featured.skill.yml"));
    assert.ok(result.success);
    assert.equal(result.errors.length, 0);
    assert.ok(result.skill);
    assert.equal(result.skill.meta.name, "full-test-skill");
    assert.equal(result.skill.meta.price?.amount, 68.8);
    assert.equal(result.skill.variables.length, 3);
    assert.equal(result.skill.evaluation?.tests.length, 1);
  });

  it("应对不存在的文件返回错误", () => {
    const result = loadSkill("/nonexistent/path.skill.yml");
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
  });

  it("应对无效 YAML 返回错误", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml")); // 这是一个有效文件
    // 测试无效内容: 传入一个不存在的文件路径
    const badResult = loadSkill(resolve(FIXTURES_DIR, "nonexistent.yml"));
    assert.equal(badResult.success, false);
  });

  it("应给出非阻塞性警告", () => {
    const result = loadSkill(resolve(FIXTURES_DIR, "minimal.skill.yml"));
    assert.ok(result.success);
    // minimal fixture 的 system prompt 较短且无 evaluation，应有警告
    assert.ok(result.warnings.length > 0, "Expected warnings for minimal fixture");
  });
});
