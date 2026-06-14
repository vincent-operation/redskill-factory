/**
 * rfs test — 本地交互测试技能
 */
import { Command } from "commander";
import { resolve } from "node:path";
import { loadSkill } from "../../core/skill-loader.js";
import { resolveSkill } from "../../core/skill-resolver.js";
import { PlaygroundRunner } from "../../playground/runner.js";
import { printEvalReport } from "../../playground/reporter.js";
import { logger } from "../../shared/logger.js";
import * as readline from "node:readline";

export function createTestCommand(): Command {
  return new Command("test")
    .description("本地交互测试技能")
    .argument("<path>", "skill.yml 文件路径或技能目录")
    .option("-e, --eval", "仅运行 evaluation 测试用例")
    .option("-v, --verbose", "显示完整 LLM 交互")
    .option("-p, --provider <provider>", "指定 LLM Provider (deepseek|claude)")
    .action(async (targetPath: string, options) => {
      const absPath = resolve(targetPath);

      // 加载技能
      const result = loadSkill(absPath);
      if (!result.success || !result.skill) {
        logger.error("技能加载失败:");
        for (const err of result.errors) {
          console.log("  -> " + err.path + ": " + err.message);
        }
        process.exit(1);
      }

      const skill = result.skill;
      const resolved = resolveSkill(skill);

      logger.success("已加载: " + skill.meta.title + " v" + skill.meta.version);

      // 创建 Runner
      const runner = new PlaygroundRunner(resolved, {
        provider: options.provider,
        verbose: options.verbose,
      });

      if (options.eval) {
        // 仅运行 evaluation
        const report = await runner.runEval();
        printEvalReport(report);
        return;
      }

      // 交互模式
      logger.title("测试模式");
      console.log("输入消息与技能对话，输入 :quit 退出，:eval 运行测试");
      console.log("");

      // 显示开场白
      if (skill.prompts.greeting) {
        console.log("[Bot] " + skill.prompts.greeting);
        console.log("");
      }

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      let running = true;

      const ask = (): Promise<void> => {
        return new Promise<void>((resolvePromise) => {
          rl.question("You: ", async (input) => {
            const trimmed = input.trim();

            if (trimmed === ":quit" || trimmed === ":q") {
              rl.close();
              running = false;
              resolvePromise();
              return;
            }

            if (trimmed === ":eval") {
              const report = await runner.runEval();
              printEvalReport(report);
              resolvePromise();
              return;
            }

            if (!trimmed) {
              resolvePromise();
              return;
            }

            try {
              const response = await runner.send(trimmed);
              console.log("Bot: " + response);
              console.log("");
            } catch (err) {
              logger.error("错误: " + (err as Error).message);
            }

            resolvePromise();
          });
        }).then(() => {
          if (running) return ask();
          return undefined;
        });
      };

      await ask();
      logger.info("测试结束");
    });
}
