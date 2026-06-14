/**
 * Claude Code Skill 打包器
 *
 * 将 Skill 编译为 Claude Code 可导入的 Skill 文件 (.md 格式)。
 * Claude Code Skill 格式: Markdown 文件 + YAML frontmatter 元数据。
 *
 * 参考: Claude Code Skills 格式规范
 */
import type { Packager, PackagerInput, PackagerOutput, OutputFile } from "../types/package.js";
import type { DistributionTarget } from "../types/skill.js";
import { writeFileSafe, ensureDir } from "../shared/fs.js";

export class ClaudeCodePackager implements Packager {
  readonly name = "Claude Code Skill";
  readonly target: DistributionTarget = "claude-code";

  async package(input: PackagerInput): Promise<PackagerOutput> {
    const files: OutputFile[] = [];
    const dirName = `${input.meta.name}-claude-code`;

    // 生成 Skill 主文件 (Markdown)
    const skillMd = this.generateSkillMarkdown(input);
    files.push({ path: `${input.meta.name}.md`, content: skillMd });

    // 生成 README
    const readme = this.generateReadme(input);
    files.push({ path: "README.md", content: readme });

    return {
      target: "claude-code",
      files,
      directoryName: dirName,
    };
  }

  private generateSkillMarkdown(input: PackagerInput): string {
    const lines: string[] = [
      "---",
      `name: ${input.meta.name}`,
      `description: ${input.meta.description}`,
      `version: ${input.meta.version}`,
      `author: ${input.meta.author}`,
      `tags: [${input.meta.tags.join(", ")}]`,
    ];

    if (input.meta.price) {
      lines.push(`price: ${input.meta.price.amount} ${input.meta.price.currency}`);
    }

    lines.push(
      "---",
      "",
      "# " + input.meta.title,
      "",
      "> " + input.meta.description,
      "",
      "## 系统提示词",
      "",
      input.renderedSystemPrompt,
      "",
    );

    if (input.renderedUserPrompt) {
      lines.push(
        "## 用户提示词模板",
        "",
        "```",
        input.renderedUserPrompt,
        "```",
        "",
      );
    }

    if (input.greeting) {
      lines.push(
        "## 开场白",
        "",
        input.greeting,
        "",
      );
    }

    // 变量说明
    if (input.variables && Object.keys(input.variables).length > 0) {
      lines.push(
        "## 可调参数",
        "",
        ...Object.entries(input.variables).map(([key, value]) =>
          `- **${key}**: ${JSON.stringify(value)}`
        ),
        "",
      );
    }

    lines.push(
      "---",
      "",
      `*由 [RedSkill Factory](https://github.com) 生成 · ${new Date().toISOString().split("T")[0]}*`,
    );

    return lines.join("\n");
  }

  private generateReadme(input: PackagerInput): string {
    return [
      `# ${input.meta.title}`,
      "",
      input.meta.description,
      "",
      "## 安装与使用",
      "",
      "将此 `.md` 文件放入你的 Claude Code skills 目录:",
      "",
      "```bash",
      `cp ${input.meta.name}.md ~/.claude/skills/`,
      "```",
      "",
      "然后在 Claude Code 中使用:",
      "",
      "```bash",
      `claude --skill ${input.meta.name}`,
      "```",
      "",
      "## 作者",
      "",
      input.meta.author,
      "",
      ...(input.meta.price
        ? [`## 购买`, "", `此 Skill 售价 ¥${input.meta.price.amount}。请在 RedSkill 商店搜索 "${input.meta.name}" 购买。`]
        : []),
    ].join("\n");
  }

  /** 将打包结果写入磁盘 */
  writeToDisk(output: PackagerOutput, outputDir: string): void {
    const dir = `${outputDir}/${output.directoryName}`;
    ensureDir(dir);

    for (const file of output.files) {
      writeFileSafe(`${dir}/${file.path}`, file.content);
    }
  }
}
