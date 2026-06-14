/**
 * 文件系统工具
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** ESM 环境下的 __dirname 替代 */
export function getDirname(importMeta: ImportMeta): string {
  return dirname(fileURLToPath(importMeta.url));
}

/** 递归创建目录 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/** 安全读取文件，不存在时返回 null */
export function readFileSafe(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/** 写入文件 (自动创建目录) */
export function writeFileSafe(filePath: string, content: string): void {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, "utf-8");
}

/** 查找指定目录下的所有 .skill.yml 文件 */
export function findSkillFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(fullPath));
    } else if (entry.name.endsWith(".skill.yml") || entry.name.endsWith(".skill.yaml")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** 验证路径安全性 (防止路径遍历) */
export function isSubPath(parent: string, child: string): boolean {
  const relative = resolve(parent);
  const target = resolve(child);
  return target.startsWith(relative);
}
