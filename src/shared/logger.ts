/**
 * 日志工具 — 统一的日志输出
 */
import chalk from "chalk";

export const logger = {
  info(msg: string) {
    console.log(chalk.blue("ℹ"), msg);
  },
  success(msg: string) {
    console.log(chalk.green("✔"), msg);
  },
  warn(msg: string) {
    console.log(chalk.yellow("⚠"), msg);
  },
  error(msg: string) {
    console.error(chalk.red("✖"), msg);
  },
  debug(msg: string) {
    if (process.env.RFS_DEBUG) {
      console.log(chalk.gray("🐛"), msg);
    }
  },
  step(step: number, total: number, msg: string) {
    console.log(chalk.cyan(`[${step}/${total}]`), msg);
  },
  title(msg: string) {
    console.log("\n" + chalk.bold.cyan("▶"), chalk.bold(msg));
  },
};
