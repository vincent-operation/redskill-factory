/**
 * Skill Compiler — 将 ResolvedSkill 编译为运行时 artifact
 *
 * 生成完整的 LLM 调用所需的 messages 数组，
 * 以及分发所需的元数据文件。
 */
import type { ResolvedSkill, SkillDefinition } from "../types/skill.js";
import type { PackagerInput } from "../types/package.js";

/** LLM Message 格式 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 编译为 LLM Messages 数组
 * @param resolved 已解析的技能
 * @param userMessage 用户当前消息 (可选)
 */
export function compileToMessages(
  resolved: ResolvedSkill,
  userMessage?: string
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // System prompt
  messages.push({ role: "system", content: resolved.renderedSystemPrompt });

  // Few-shot examples
  if (resolved.prompts.examples) {
    for (const example of resolved.prompts.examples) {
      messages.push({ role: "user", content: example.user });
      messages.push({ role: "assistant", content: example.assistant });
    }
  }

  // User input
  if (userMessage) {
    const rendered = resolved.renderedUserPrompt
      ? resolved.renderedUserPrompt.replace("{{message}}", userMessage)
      : userMessage;
    messages.push({ role: "user", content: rendered });
  } else if (resolved.prompts.greeting) {
    messages.push({ role: "assistant", content: resolved.prompts.greeting });
  }

  return messages;
}

/**
 * 生成 Packager 输入
 */
export function compileForPackager(
  skill: SkillDefinition,
  resolved: ResolvedSkill,
  skillDir: string
): PackagerInput {
  return {
    meta: skill.meta,
    renderedSystemPrompt: resolved.renderedSystemPrompt,
    renderedUserPrompt: resolved.renderedUserPrompt,
    greeting: skill.prompts.greeting,
    variables: resolved.resolvedVariables,
    assets: (skill.distribution.assets ?? []).map(
      (a) => `${skillDir}/${a}`
    ),
    readmePath: skill.distribution.readme
      ? `${skillDir}/${skill.distribution.readme}`
      : undefined,
  };
}

/**
 * 编译为 Skill 使用手册 (Markdown)
 */
export function compileReadme(skill: SkillDefinition): string {
  const lines: string[] = [
    `# ${skill.meta.title}`,
    "",
    `> **${skill.meta.description}**`,
    "",
    "## 基本信息",
    "",
    `- **技能名**: \`${skill.meta.name}\``,
    `- **作者**: ${skill.meta.author}`,
    `- **版本**: ${skill.meta.version}`,
    `- **分类**: ${skill.meta.category}`,
    `- **标签**: ${skill.meta.tags.join(", ")}`,
    ...(skill.meta.price
      ? [`- **价格**: ¥${skill.meta.price.amount} ${skill.meta.price.currency}`]
      : []),
    "",
    "## 使用方法",
    "",
    "### 可调参数",
    "",
    ...skill.variables.map((v) =>
      `- **${v.label}** (\`${v.name}\`): ${v.help ?? v.type}${v.default !== undefined ? ` (默认: ${v.default})` : ""}`
    ),
    "",
    "### 示例对话",
    "",
    ...(skill.prompts.examples ?? []).map((e) =>
      `**用户**: ${e.user}\n\n**助手**: ${e.assistant}\n`
    ),
    "",
  ];

  if (skill.evaluation) {
    lines.push(
      "## 质量保证",
      "",
      `包含 ${skill.evaluation.tests.length} 个自动化评测用例以确保输出质量。`,
      ""
    );
  }

  return lines.join("\n");
}
