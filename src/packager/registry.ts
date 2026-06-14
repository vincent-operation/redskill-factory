/**
 * 打包器注册表 — 管理所有输出目标格式
 */
import type { Packager, PackagerInput, PackagerOutput } from "../types/package.js";
import type { DistributionTarget } from "../types/skill.js";
import { logger } from "../shared/logger.js";

/** 打包器注册表 */
const packagers = new Map<DistributionTarget, Packager>();

/** 注册打包器 */
export function registerPackager(packager: Packager): void {
  packagers.set(packager.target, packager);
  logger.debug(`注册打包器: ${packager.name} → ${packager.target}`);
}

/** 获取打包器 */
export function getPackager(target: DistributionTarget): Packager | undefined {
  return packagers.get(target);
}

/** 打包到指定目标 */
export async function packageSkill(
  input: PackagerInput,
  targets: DistributionTarget[],
): Promise<PackagerOutput[]> {
  const results: PackagerOutput[] = [];

  for (const target of targets) {
    const packager = getPackager(target);
    if (!packager) {
      logger.warn(`未找到目标格式的打包器: ${target}`);
      continue;
    }

    logger.info(`打包: ${packager.name} (${target})`);
    const output = await packager.package(input);
    results.push(output);
  }

  return results;
}

/** 列出所有已注册的打包器 */
export function listPackagers(): string[] {
  return [...packagers.values()].map((p) => `${p.name} (${p.target})`);
}
