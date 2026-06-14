/**
 * OpenAI GPT 打包器
 *
 * 生成 OpenAI 自定义 GPT 可导入的配置 (JSON 格式)。
 * 参考: https://platform.openai.com/docs/assistants
 */
import type { Packager, PackagerInput, PackagerOutput } from "../types/package.js";
import type { DistributionTarget } from "../types/skill.js";

export class OpenAiGptPackager implements Packager {
  readonly name = "OpenAI GPT";
  readonly target: DistributionTarget = "openai-gpt";

  async package(input: PackagerInput): Promise<PackagerOutput> {
    const dirName = `${input.meta.name}-openai-gpt`;

    // GPT configuration JSON
    const gptConfig: Record<string, unknown> = {
      name: input.meta.title,
      description: `${input.meta.description}\n\n作者: ${input.meta.author}${input.meta.price ? `\nRedSkill 商店售价: ¥${input.meta.price.amount}` : ""}`,
      instructions: input.renderedSystemPrompt,
    };

    // 从 few-shot examples 提取 conversation starters (最多 4 个)
    if (input.meta.tags.length > 0) {
      gptConfig.tags = input.meta.tags;
    }

    const configJson = JSON.stringify(gptConfig, null, 2);

    // README with import instructions
    const readme = [
      `# ${input.meta.title} — OpenAI GPT 配置`,
      "",
      input.meta.description,
      "",
      "## 导入说明",
      "",
      "1. 打开 [OpenAI ChatGPT](https://chatgpt.com/)",
      "2. 点击左下角头像 → **My GPTs**",
      "3. 点击 **Create a GPT**",
      "4. 切换到 **Configure** 标签",
      "5. 复制 `gpt-config.json` 中的字段:",
      "   - 将 `instructions` 粘贴到 **Instructions** 框",
      "   - 将 `description` 粘贴到 **Description** 框",
      "   - 将 `name` 粘贴到 **Name** 框",
      "",
      "## 变量说明",
      "",
      ...Object.entries(input.variables).map(([key, value]) =>
        `- **${key}**: ${JSON.stringify(value)}`
      ),
      "",
      `作者: ${input.meta.author}`,
    ].join("\n");

    return {
      target: "openai-gpt",
      files: [
        { path: "gpt-config.json", content: configJson },
        { path: "README.md", content: readme },
      ],
      directoryName: dirName,
    };
  }
}
