/**
 * rfs build — 打包技能为可分发格式
 */
import { Command } from "commander";
import { resolve } from "node:path";
import { loadSkill } from "../../core/skill-loader.js";
import { resolveSkill } from "../../core/skill-resolver.js";
import { compileForPackager } from "../../core/skill-compiler.js";
import { packageSkill, registerPackager } from "../../packager/registry.js";
import { ClaudeCodePackager } from "../../packager/claude-code.js";
import { GenericPackager } from "../../packager/generic.js";
import { OpenAiGptPackager } from "../../packager/openai-gpt.js";
import { writeFileSafe, ensureDir, findSkillFiles } from "../../shared/fs.js";
import { logger } from "../../shared/logger.js";
import { statSync } from "node:fs";
import type { DistributionTarget } from "../../types/skill.js";

// 注册内置打包器
registerPackager(new ClaudeCodePackager());
registerPackager(new GenericPackager());
registerPackager(new OpenAiGptPackager());

export function createBuildCommand(): Command {
  return new Command("build")
    .description("打包技能为可分发格式")
    .argument("<path>", "skill.yml 文件路径或技能目录")
    .option("-t, --target <target>", "目标格式: claude-code|generic|all", "all")
    .option("-o, --output <dir>", "输出目录", "./dist")
    .action(async (targetPath: string, options) => {
      const absPath = resolve(targetPath);

      logger.title("📦 打包: " + absPath);

      // 支持目录输入 → 找第一个 .skill.yml
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

      // 加载
      const result = loadSkill(ymlPath);
      if (!result.success || !result.skill) {
        logger.error("技能加载失败");
        for (const err of result.errors) {
          console.log(`  → ${err.path}: ${err.message}`);
        }
        process.exit(1);
      }

      const skill = result.skill;
      const skillDir = resolve(absPath, "..");
      const resolved = resolveSkill(skill);

      logger.info(`技能: ${skill.meta.title} v${skill.meta.version}`);

      // 确定目标
      const targets: DistributionTarget[] = options.target === "all"
        ? (skill.distribution.targets.length > 0 ? skill.distribution.targets : ["claude-code", "generic"])
        : [options.target as DistributionTarget];

      // 编译为 Packager 输入
      const packagerInput = compileForPackager(skill, resolved, skillDir);

      // 打包
      const outputs = await packageSkill(packagerInput, targets);

      // 写入磁盘
      const outputDir = resolve(options.output);
      ensureDir(outputDir);

      for (const output of outputs) {
        const dir = `${outputDir}/${output.directoryName}`;
        ensureDir(dir);

        for (const file of output.files) {
          const filePath = `${dir}/${file.path}`;
          writeFileSafe(filePath, file.content);
          logger.info(`  → ${filePath}`);
        }
      }

      console.log("");
      logger.success(`打包完成! 输出: ${outputDir}`);
      logger.info("你可以将输出文件上传到 RedSkill 商店或直接分发给用户");
    });
}
