/**
 * CLI 工具函数
 */
import chalk from "chalk";
import { logger } from "../shared/logger.js";
import type { LoadResult } from "../core/skill-loader.js";

/** 打印校验结果 */
export function printValidationResult(result: LoadResult, filePath: string): void {
  if (result.success) {
    logger.success(`校验通过: ${filePath}`);
  } else {
    logger.error(`校验失败: ${filePath}`);
    for (const err of result.errors) {
      console.log(`  ${chalk.red("→")} ${err.path}: ${err.message}`);
    }
  }

  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      logger.warn(w);
    }
  }
}

/** 技能分类的中文映射 */
export const CATEGORY_LABELS: Record<string, string> = {
  education: "教育学习",
  productivity: "效率工具",
  creative: "创意内容",
  lifestyle: "生活方式",
  business: "商业办公",
  health: "健康养生",
  tech: "技术开发",
  other: "其他",
};

/** 分类对应 emoji */
export const CATEGORY_EMOJI: Record<string, string> = {
  education: "📚",
  productivity: "⚡",
  creative: "🎨",
  lifestyle: "🌟",
  business: "💼",
  health: "💪",
  tech: "🔧",
  other: "📦",
};
