/**
 * rfs list — 列出可用模板和本地技能
 */
import { Command } from "commander";
import { resolve } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import chalk from "chalk";
import { logger } from "../../shared/logger.js";
import { findSkillFiles } from "../../shared/fs.js";
import { loadSkill } from "../../core/skill-loader.js";
import { CATEGORY_LABELS, CATEGORY_EMOJI } from "../utils.js";

const TEMPLATES_DIR = resolve(process.cwd(), "templates");
const SKILLS_DIR = resolve(process.cwd(), "skills");

export function createListCommand(): Command {
  return new Command("list")
    .description("列出可用模板和本地技能")
    .option("-t, --templates", "仅显示模板")
    .option("-l, --local", "仅显示本地技能")
    .action(async (options) => {
      const showTemplates = !options.local;
      const showLocal = !options.templates;

      if (showTemplates) {
        listTemplates();
      }

      if (showLocal) {
        listLocalSkills();
      }

      console.log("");
      logger.info("使用 rfs init <template> <name> 从模板创建新技能");
    });
}

function listTemplates(): void {
  logger.title("📦 内置模板");

  if (!existsSync(TEMPLATES_DIR)) {
    logger.warn("模板目录不存在");
    return;
  }

  const categories = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const cat of categories) {
    const emoji = CATEGORY_EMOJI[cat.name] ?? "📦";
    const label = CATEGORY_LABELS[cat.name] ?? cat.name;
    console.log(`\n  ${emoji} ${chalk.bold(label)}`);

    const catDir = resolve(TEMPLATES_DIR, cat.name);
    const files = findSkillFiles(catDir);

    if (files.length === 0) {
      console.log(`    ${chalk.gray("(无模板)")}`);
      continue;
    }

    for (const file of files) {
      const result = loadSkill(file);
      if (result.success && result.skill) {
        const s = result.skill;
        const priceStr = s.meta.price
          ? chalk.yellow(" ¥" + String(s.meta.price.amount))
          : chalk.gray(" 免费");
        console.log(`    ${chalk.cyan(s.meta.name)} — ${s.meta.title}${priceStr}`);
        console.log(`      ${chalk.gray(s.meta.description)}`);
      } else {
        console.log("    " + chalk.red(file) + " " + chalk.gray("(无效)"));
      }
    }
  }
}

function listLocalSkills(): void {
  logger.title("\n📁 本地技能");

  if (!existsSync(SKILLS_DIR)) {
    logger.warn("skills/ 目录为空");
    return;
  }

  const files = findSkillFiles(SKILLS_DIR);

  if (files.length === 0) {
    console.log(`  ${chalk.gray("(无本地技能)")}`);
    return;
  }

  for (const file of files) {
    const result = loadSkill(file);
    if (result.success && result.skill) {
      const s = result.skill;
      const emoji = CATEGORY_EMOJI[s.meta.category] ?? "📦";
      console.log(`  ${emoji} ${chalk.cyan(s.meta.name)} — ${s.meta.title} ${chalk.gray("v" + s.meta.version)}`);
      console.log(`    ${s.meta.description}`);
    } else {
      console.log(`  ${chalk.red(file)} (校验失败)`);
    }
  }
}
