/**
 * LLM Skill Generator — 从自然语言描述生成 skill.yml
 *
 * 使用 LLM 根据用户描述自动生成完整的 RedSkill 定义文件。
 * 包含格式约束、示例和错误重试机制。
 */
import type { LlmProvider } from "./provider.js";
import { llmRouter } from "./router.js";
import { parse as parseYaml } from "yaml";
import { skillDefinitionSchema } from "../core/skill-definition.js";
import { logger } from "../shared/logger.js";

const MAX_RETRIES = 2;

const SYSTEM_PROMPT = `你是一个 RedSkill Factory 技能定义生成器。根据用户的自然语言描述，生成完整的 skill.yml 文件。

## 输出格式规则

你必须输出有效的 YAML，格式如下：

\`\`\`yaml
meta:
  name: "kebab-case-格式的技能名"
  title: "中文技能标题"
  version: "0.1.0"
  category: "教育|效率|创意|生活"
  description: "一句话技能描述，含核心卖点"
  author: "@作者昵称"
  price: 数字价格(元)
  tags: ["标签1", "标签2"]

prompts:
  system: |
    你是一位专业的 AI 助手，擅长[领域]。
    请根据用户需求提供[核心能力]。

  greeting: "首次使用时发送的友好欢迎语"
  examples:
    - user: "示例问题1"
      assistant: "示例回答1"
    - user: "示例问题2"
      assistant: "示例回答2"

variables:
  - name: style
    label: "风格"
    type: select
    default: "友好"
    options: ["友好", "专业", "幽默"]

distribution:
  targets:
    - claude-code
    - generic
\`\`\`

## 要点

1. name 必须是 kebab-case，仅英文小写字母和连字符
2. prompts.system 用第一人称，明确技能的角色和边界
3. examples 提供 2-3 个典型对话示例
4. variables 定义 1-3 个用户可调的参数
5. price 根据技能复杂度和价值合理定价 (10-100元)
6. tags 用中文标签，3-5 个
7. 只输出 YAML，不要包含其他文字`;

/**
 * 生成 skills.yml 和免费预览版
 */
export interface GeneratedSkill {
  yaml: string;
  description: string;
}

/**
 * 从自然语言描述生成 skill.yml
 * @param description 用户的中文描述
 * @param category 技能分类
 * @returns 生成的 YAML 字符串
 */
export async function generateSkillFromDescription(
  description: string,
  category: string = "other",
): Promise<string> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `请为以下技能生成 skill.yml:\n\n描述: ${description}\n分类: ${category}\n\n请只输出 YAML，不要包含其他文字或代码块标记。`,
    },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const provider = getAvailableProvider();
      if (!provider) {
        throw new Error(
          "No LLM provider available. Set DEEPSEEK_API_KEY or ANTHROPIC_AUTH_TOKEN in .env",
        );
      }

      const result = await provider.chat(messages, {
        temperature: 0.7,
        maxTokens: 4096,
      });

      // 清理 LLM 输出 (去除可能的 markdown 代码块标记)
      const yaml = cleanYamlOutput(result.content);

      // 校验生成的 YAML
      const parsed = parseYaml(yaml);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("LLM generated invalid YAML (not an object)");
      }

      const validation = skillDefinitionSchema.safeParse(parsed);
      if (!validation.success) {
        const errors = validation.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(`Validation failed: ${errors}`);
      }

      logger.debug(`Skill generated successfully on attempt ${attempt + 1}`);
      return yaml;
    } catch (err) {
      lastError = err as Error;
      logger.warn(
        `Generation attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${lastError.message}`,
      );

      if (attempt < MAX_RETRIES) {
        // 重试时添加错误信息
        messages.push({
          role: "user" as const,
          content: `上一版本有错误: ${lastError.message}\n请修正后重新输出完整的 YAML。`,
        });
      }
    }
  }

  throw new Error(
    `Failed to generate skill after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
  );
}

function getAvailableProvider(): LlmProvider | null {
  const providers = llmRouter.listAvailable();
  if (providers.length === 0) return null;
  return llmRouter.get(providers[0]!) ?? null;
}

function cleanYamlOutput(content: string): string {
  // 移除可能的 markdown 代码块标记
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    cleaned = cleaned.slice(firstNewline + 1);
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3).trimEnd();
    }
  }
  return cleaned;
}
