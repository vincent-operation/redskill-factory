/**
 * rfs market — 生成小红书推广物料
 */
import { Command } from "commander";
import { resolve } from "node:path";
import { loadSkill } from "../../core/skill-loader.js";
import { generateMarketingContent } from "../../marketing/note-generator.js";
import { noteTemplates } from "../../marketing/templates.js";
import { logger } from "../../shared/logger.js";
import { findSkillFiles } from "../../shared/fs.js";
import { statSync } from "node:fs";
import chalk from "chalk";

export function createMarketCommand(): Command {
  return new Command("market")
    .description("生成小红书推广物料 (笔记/封面/标题)")
    .argument("<path>", "skill.yml 文件路径或技能目录")
    .option("-t, --type <type>", "物料类型: note|cover|title", "note")
    .option("-n, --count <number>", "生成数量", "3")
    .option("-T, --template <name>", "笔记模板: 种草测评型|教程攻略型|对比评测型")
    .action(async (targetPath: string, options) => {
      const absPath = resolve(targetPath);

      // 支持目录 → 找第一个 .skill.yml
      let ymlPath = absPath;
      try {
        const st = statSync(absPath);
        if (st.isDirectory()) {
          const files = findSkillFiles(absPath);
          if (files.length === 0) {
            logger.error("目录中未找到 .skill.yml 文件: " + absPath);
            process.exit(1);
          }
          ymlPath = files[0]!;
        }
      } catch {
        logger.error("路径不存在: " + absPath);
        process.exit(1);
      }

      logger.title("📱 生成推广物料");

      // 加载技能
      const result = loadSkill(ymlPath);
      if (!result.success || !result.skill) {
        logger.error("技能加载失败");
        process.exit(1);
      }

      const skill = result.skill;

      // 显示可用模板
      if (options.type === "note" && !options.template) {
        console.log(chalk.bold("\n📋 可用模板:"));
        for (const t of noteTemplates) {
          console.log(`  ${chalk.cyan(t.name)} — ${t.description}`);
        }
        console.log(`\n使用 --template 选择模板 (默认: ${noteTemplates[0]?.name})\n`);
      }

      // 生成
      const results = generateMarketingContent(skill, {
        type: options.type,
        count: parseInt(options.count, 10),
        template: options.template,
      });

      // 输出
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r) continue;

        console.log(chalk.bold(`\n${"─".repeat(50)}`));
        console.log(chalk.bold(`  ${options.type === "note" ? "笔记" : options.type} #${i + 1}`));
        console.log(chalk.bold("─".repeat(50)));
        console.log(r.content);
      }

      console.log("");
      logger.success(`已生成 ${results.length} 个推广物料`);
      logger.info("提示: 可以直接复制到小红书发布!");
    });
}
