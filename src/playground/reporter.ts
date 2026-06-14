/**
 * Reporter — 测试结果输出
 */
import type { EvalReport } from "./runner.js";
import chalk from "chalk";
import { logger } from "../shared/logger.js";

export function printEvalReport(report: EvalReport): void {
  if (report.total === 0) {
    logger.warn("无测试用例");
    return;
  }

  console.log("");
  console.log(chalk.bold("─".repeat(50)));
  console.log(chalk.bold("  Evaluation 测试报告"));
  console.log(chalk.bold("─".repeat(50)));

  for (const detail of report.details) {
    const icon = detail.passed ? chalk.green("✓") : chalk.red("✗");
    console.log(`  ${icon} ${detail.description}`);

    if (!detail.passed && detail.error) {
      console.log(`    ${chalk.red("错误:")} ${detail.error}`);
    }

    for (const check of detail.checks) {
      const cIcon = check.passed ? chalk.green("  ✓") : chalk.red("  ✗");
      console.log(`    ${cIcon} ${check.type}: "${check.expected}"`);
    }
  }

  console.log(chalk.bold("─".repeat(50)));
  const rate = ((report.pass / report.total) * 100).toFixed(0);
  console.log(`  通过率: ${chalk.green(`${rate}%`)} (${report.pass}/${report.total})`);
  console.log(chalk.bold("─".repeat(50)));
  console.log("");
}
