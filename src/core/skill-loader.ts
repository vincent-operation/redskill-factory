/**
 * Skill Loader — YAML 解析 + Zod 校验
 *
 * 从 .skill.yml 文件读取并解析为 SkillDefinition
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { skillDefinitionSchema, strictSkillDefinitionSchema } from "./skill-definition.js";
import { findSkillFiles } from "../shared/fs.js";
import type { SkillDefinition } from "../types/skill.js";
import type { ZodError } from "zod";

/** 加载结果 */
export interface LoadResult {
  success: boolean;
  skill?: SkillDefinition;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * 加载并校验 skill.yml 文件
 * @param filePath - skill.yml 文件路径
 * @param strict - 是否启用严格模式
 */
export function loadSkill(filePath: string, strict = false): LoadResult {
  const warnings: string[] = [];
  const filePathAbs = resolve(filePath);

  // 检查文件存在
  if (!existsSync(filePathAbs)) {
    return {
      success: false,
      errors: [{ path: filePath, message: `文件不存在: ${filePathAbs}` }],
      warnings: [],
    };
  }

  // 读取 YAML
  let raw: unknown;
  try {
    const content = readFileSync(filePathAbs, "utf-8");
    raw = parseYaml(content);
  } catch (err) {
    return {
      success: false,
      errors: [{ path: filePath, message: `YAML 解析失败: ${(err as Error).message}` }],
      warnings: [],
    };
  }

  // Zod 校验
  const schema = strict ? strictSkillDefinitionSchema : skillDefinitionSchema;
  const result = schema.safeParse(raw);

  if (!result.success) {
    return {
      success: false,
      errors: formatZodErrors(result.error),
      warnings,
    };
  }

  // 收集警告
  const skill = result.data as SkillDefinition;
  collectWarnings(skill, filePathAbs, warnings);

  return { success: true, skill, errors: [], warnings };
}

/**
 * 格式化 Zod 错误
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

/**
 * 收集非阻塞性警告
 */
function collectWarnings(skill: SkillDefinition, filePath: string, warnings: string[]): void {
  // 检查技能目录结构
  const skillDir = dirname(filePath);

  if (skill.prompts.system.length < 50) {
    warnings.push("系统提示词较短 (<50 字符)，建议提供更详细的角色设定以获得更好的效果");
  }

  if (!skill.prompts.examples || skill.prompts.examples.length < 2) {
    warnings.push("建议添加至少 2 个 few-shot 示例以提高输出质量");
  }

  if (!skill.evaluation || skill.evaluation.tests.length === 0) {
    warnings.push("未配置 evaluation 测试用例，建议添加以确保技能质量");
  }

  if (skill.variables.length === 0) {
    warnings.push("未定义变量，技能将缺乏自定义能力；考虑添加用户可调的参数");
  }

  // 检查 cover 文件
  if (skill.meta.cover) {
    const coverPath = resolve(skillDir, skill.meta.cover);
    if (!existsSync(coverPath)) {
      warnings.push(`封面图不存在: ${skill.meta.cover}`);
    }
  }
}

/**
 * 批量加载目录下的所有技能
 */
export function loadSkillsFromDir(dir: string): Map<string, LoadResult> {
  const files = findSkillFiles(dir);
  const results = new Map<string, LoadResult>();

  for (const file of files) {
    const name = basename(file, ".skill.yml");
    results.set(name, loadSkill(file));
  }

  return results;
}
