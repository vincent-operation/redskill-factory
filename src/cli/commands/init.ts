/**
 * rfs init — 脚手架新技能
 *
 * 从内置模板或自然语言描述创建新的 skill.yml
 */
import { Command } from "commander";
import { resolve, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { logger } from "../../shared/logger.js";
import { ensureDir, writeFileSafe } from "../../shared/fs.js";
import { generateSkillFromDescription } from "../../llm/skill-generator.js";
import { parse as parseYaml } from "yaml";

// 内置模板目录 (相对于项目根)
const TEMPLATES_DIR = resolve(process.cwd(), "templates");

export function createInitCommand(): Command {
  const cmd = new Command("init")
    .description("从模板创建新的 RedSkill")
    .argument("[name]", "技能名称 (如 english-tutor)")
    .option("-c, --category <category>", "技能分类: education|productivity|creative|lifestyle")
    .option("-t, --template <template>", "指定模板名 (如 english-tutor)")
    .option("-f, --from <description>", "从自然语言描述生成 skill.yml")
    .option("-o, --output <dir>", "输出目录", "./skills")
    .option("-y, --yes", "跳过确认")
    .action(async (name, options) => {
      const category = options.category ?? "other";
      const templateName = options.template ?? name;

      // 尝试加载模板
      let templateYaml: string | null = loadTemplate(templateName, category);

      if (!templateYaml && options.from) {
        logger.info("🤖 正在用 AI 从描述生成 skill.yml...");
        try {
          templateYaml = await generateSkillFromDescription(options.from, category);
          logger.success("AI 生成成功！");
        } catch (err) {
          logger.error(`AI 生成失败: ${(err as Error).message}`);
          logger.info("将使用最小化骨架作为替代");
          templateYaml = generateMinimalYaml(name ?? "new-skill", category, options.from);
        }
      }

      if (!templateYaml) {
        templateYaml = generateMinimalYaml(name ?? "new-skill", category, options.from);
        if (templateName) {
          logger.warn(`模板 "${templateName}" 不存在，已生成最小化骨架`);
        }
      }

      // 从生成的 YAML 推断名称 (如果尚未指定)
      if (!name) {
        const parsed = parseYaml(templateYaml);
        if (parsed && typeof parsed === "object" && "meta" in parsed) {
          name = (parsed as Record<string, unknown>).meta && typeof (parsed as Record<string, unknown>).meta === "object"
            ? ((parsed as Record<string, { name?: string }>).meta as Record<string, string>).name
            : undefined;
        }
        if (!name) {
          name = options.from
            ? options.from.replace(/[^\w\s-]/g, "").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 50)
            : "new-skill";
        }
      }

      const outputDir = resolve(options.output, name);
      logger.title(`初始化技能: ${name}`);

      // 检查是否已存在
      if (existsSync(outputDir) && !options.yes) {
        logger.warn(`目录已存在: ${outputDir}`);
        logger.info("使用 -y 跳过确认或指定不同的名称");
        return;
      }

      // 写入文件
      ensureDir(outputDir);
      const yamlPath = join(outputDir, `${name}.skill.yml`);
      writeFileSafe(yamlPath, templateYaml);

      logger.success(`技能已创建: ${yamlPath}`);
      logger.info("下一步:");
      logger.info(`  1. 编辑 ${yamlPath} 定制提示词和变量`);
      logger.info(`  2. rfs validate ${outputDir}/ 校验合法性`);
      logger.info(`  3. rfs test ${outputDir}/ 本地测试`);
    });

  return cmd;
}

/** 从内置模板目录加载模板 */
function loadTemplate(name: string, category: string): string | null {
  // 先尝试精确路径
  const exactPath = resolve(TEMPLATES_DIR, category, `${name}.skill.yml`);
  if (existsSync(exactPath)) {
    return readFileSync(exactPath, "utf-8");
  }

  // 再搜索所有分类目录
  const categories = ["education", "productivity", "creative", "lifestyle"];
  for (const cat of categories) {
    const path = resolve(TEMPLATES_DIR, cat, `${name}.skill.yml`);
    if (existsSync(path)) {
      return readFileSync(path, "utf-8");
    }
  }

  return null;
}

/** 生成最小化 YAML 骨架 */
function generateMinimalYaml(name: string, category: string, description?: string): string {
  return `# ${name} — RedSkill 定义
# 编辑此文件来定制你的 AI 技能

meta:
  name: "${name}"
  title: "${name.replace(/-/g, " ")}"
  version: "0.1.0"
  category: "${category}"
  description: "${description ?? "在此写下技能的一句话描述"}"
  author: "@你的小红书昵称"
  tags: ["AI", "工具"]

prompts:
  system: |
    你是一位专业的 AI 助手。
    ${description ? `你的任务是: ${description}` : ""}

  examples:
    - user: "你好，帮帮我"
      assistant: "你好！请告诉我你需要什么帮助？"

variables:
  - name: style
    label: "回复风格"
    type: select
    default: "友好"
    options: ["友好", "专业", "幽默", "简洁"]

distribution:
  targets:
    - claude-code
    - generic
`;
}
