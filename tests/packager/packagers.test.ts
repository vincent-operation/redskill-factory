/**
 * 测试: Packagers (Claude Code + Generic)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ClaudeCodePackager } from "../../src/packager/claude-code.js";
import { GenericPackager } from "../../src/packager/generic.js";
import type { PackagerInput } from "../../src/types/package.js";

const sampleInput: PackagerInput = {
  meta: {
    name: "test-skill",
    title: "测试技能",
    version: "0.1.0",
    category: "education",
    description: "一个用于测试的示例技能",
    author: "@tester",
    price: { amount: 29.9, currency: "CNY" },
    tags: ["AI", "测试", "教育"],
  },
  renderedSystemPrompt: "你是一个测试助手。",
  renderedUserPrompt: "请回答: {{question}}",
  greeting: "你好！我是测试助手。",
  variables: { style: "友好", length: "short" },
  assets: [],
};

describe("ClaudeCodePackager", () => {
  const packager = new ClaudeCodePackager();

  it("应生成正确的 target", () => {
    assert.equal(packager.target, "claude-code");
  });

  it("应生成 2 个文件 (skill.md + README.md)", async () => {
    const output = await packager.package(sampleInput);
    assert.equal(output.files.length, 2);
    const paths = output.files.map((f) => f.path);
    assert.ok(paths.some((p) => p.endsWith(".md") && !p.includes("README")));
    assert.ok(paths.includes("README.md"));
  });

  it("应包含 frontmatter 元数据", async () => {
    const output = await packager.package(sampleInput);
    const skillFile = output.files.find((f) => !f.path.includes("README"))!;
    assert.ok(skillFile.content.startsWith("---"));
    assert.ok(skillFile.content.includes("name: test-skill"));
    assert.ok(skillFile.content.includes("description: 一个用于测试的示例技能"));
  });

  it("应包含系统提示词", async () => {
    const output = await packager.package(sampleInput);
    const skillFile = output.files.find((f) => !f.path.includes("README"))!;
    assert.ok(skillFile.content.includes("你是一个测试助手。"));
  });

  it("应生成正确的目录名", async () => {
    const output = await packager.package(sampleInput);
    assert.equal(output.directoryName, "test-skill-claude-code");
  });
});

describe("GenericPackager", () => {
  const packager = new GenericPackager();

  it("应生成正确的 target", () => {
    assert.equal(packager.target, "generic");
  });

  it("应生成 skill.json + system.txt + README.md", async () => {
    const output = await packager.package(sampleInput);
    const paths = output.files.map((f) => f.path);
    assert.ok(paths.includes("skill.json"));
    assert.ok(paths.includes("prompts/system.txt"));
    assert.ok(paths.includes("README.md"));
  });

  it("skill.json 应包含完整结构化数据", async () => {
    const output = await packager.package(sampleInput);
    const jsonFile = output.files.find((f) => f.path === "skill.json")!;
    const parsed = JSON.parse(jsonFile.content);
    assert.equal(parsed.name, "test-skill");
    assert.equal(parsed.title, "测试技能");
    assert.equal(parsed.price.amount, 29.9);
    assert.equal(parsed.prompts.system, "你是一个测试助手。");
    assert.ok(Array.isArray(parsed.tags));
  });

  it("应生成正确的目录名", async () => {
    const output = await packager.package(sampleInput);
    assert.equal(output.directoryName, "test-skill-generic");
  });

  it("无 user prompt 时不应生成 user.txt", async () => {
    const inputNoUser = { ...sampleInput, renderedUserPrompt: undefined };
    const output = await packager.package(inputNoUser);
    const hasUserTxt = output.files.some((f) => f.path === "prompts/user.txt");
    assert.equal(hasUserTxt, false);
  });
});
