/**
 * Generic 打包器 — 通用格式
 *
 * 生成与框架无关的 skill 包：skill.json + prompts/ 目录
 */
import type { Packager, PackagerInput, PackagerOutput, OutputFile } from "../types/package.js";
import type { DistributionTarget } from "../types/skill.js";

export class GenericPackager implements Packager {
  readonly name = "Generic Bundle";
  readonly target: DistributionTarget = "generic";

  async package(input: PackagerInput): Promise<PackagerOutput> {
    const files: OutputFile[] = [];
    const dirName = `${input.meta.name}-generic`;

    // skill.json — 结构化的技能定义
    const skillJson = JSON.stringify(
      {
        name: input.meta.name,
        title: input.meta.title,
        version: input.meta.version,
        description: input.meta.description,
        author: input.meta.author,
        price: input.meta.price,
        tags: input.meta.tags,
        prompts: {
          system: input.renderedSystemPrompt,
          user: input.renderedUserPrompt ?? null,
          greeting: input.greeting ?? null,
        },
        variables: input.variables,
      },
      null,
      2,
    );
    files.push({ path: "skill.json", content: skillJson });

    // system.txt — 纯文本系统提示词
    files.push({ path: "prompts/system.txt", content: input.renderedSystemPrompt });

    if (input.renderedUserPrompt) {
      files.push({ path: "prompts/user.txt", content: input.renderedUserPrompt });
    }

    // README
    files.push({
      path: "README.md",
      content: [
        `# ${input.meta.title}`,
        "",
        input.meta.description,
        "",
        "## 文件说明",
        "",
        "- `skill.json` — 结构化技能定义",
        "- `prompts/system.txt` — 系统提示词",
        "- `prompts/user.txt` — 用户消息模板",
        "",
        `作者: ${input.meta.author}`,
      ].join("\n"),
    });

    return {
      target: "generic",
      files,
      directoryName: dirName,
    };
  }
}
