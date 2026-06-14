/**
 * rfs validate — 校验 skill.yml 合法性
 */
import { Command } from "commander";
import { resolve } from "node:path";
import { loadSkill } from "../../core/skill-loader.js";
import { logger } from "../../shared/logger.js";
import { findSkillFiles } from "../../shared/fs.js";
import { printValidationResult } from "../utils.js";

export function createValidateCommand(): Command {
  return new Command("validate")
    .description("校验 skill.yml 结构合法性")
    .argument("<path>", "skill.yml 文件路径或包含 .skill.yml 的目录")
    .option("-s, --strict", "严格模式 (需要完整 evaluation + constraints)")
    .option("-w, --warnings", "仅显示警告")
    .action(async (targetPath: string, options) => {
      const absPath = resolve(targetPath);

      logger.title(`校验: ${absPath}`);

      // 判断是文件还是目录
      const { statSync } = await import("node:fs");
      let files: string[];

      try {
        const stat = statSync(absPath);
        if (stat.isDirectory()) {
          files = findSkillFiles(absPath);
          if (files.length === 0) {
            logger.warn(`目录中未找到 .skill.yml 文件: ${absPath}`);
            return;
          }
        } else {
          files = [absPath];
        }
      } catch {
        logger.error(`路径不存在: ${absPath}`);
        process.exit(1);
      }

      let passCount = 0;
      let failCount = 0;

      for (const file of files) {
        const result = loadSkill(file, options.strict);
        printValidationResult(result, file);
        if (result.success) passCount++;
        else failCount++;
      }

      console.log("");
      if (failCount === 0) {
        logger.success(`全部通过: ${passCount} 个技能`);
      } else {
        logger.error(`${failCount} 个失败, ${passCount} 个通过`);
        process.exit(1);
      }
    });
}
