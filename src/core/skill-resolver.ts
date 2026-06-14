/**
 * Skill Resolver — 变量解析和模板渲染
 *
 * 将 skill.yml 中的模板变量替换为实际值，
 * 生成运行时可直接使用的 ResolvedSkill。
 */
import Mustache from "mustache";
import type { SkillDefinition, ResolvedSkill, SkillVariable } from "../types/skill.js";

/**
 * 解析技能变量
 * @param variables 变量定义
 * @param userInput 用户提供的变量值 (可选，覆盖默认值)
 * @returns 已解析的变量键值对
 */
export function resolveVariables(
  variables: SkillVariable[],
  userInput?: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const v of variables) {
    if (userInput && v.name in userInput) {
      resolved[v.name] = userInput[v.name];
    } else if (v.default !== undefined) {
      resolved[v.name] = v.default;
    } else if (v.required) {
      throw new Error(`缺少必填变量: ${v.name} (${v.label})`);
    } else {
      resolved[v.name] = null;
    }
  }

  return resolved;
}

/**
 * 渲染 Mustache 模板
 * @param template 模板字符串
 * @param variables 变量键值对
 * @returns 渲染后的字符串
 */
export function renderTemplate(template: string, variables: Record<string, unknown>): string {
  // Mustache 默认对 HTML 转义，我们需要禁用
  return Mustache.render(template, variables, {}, { escape: (v: string) => v });
}

/**
 * 解析完整的 Skill 定义为运行时形式
 * @param skill Skill 定义
 * @param userVariables 用户提供的变量值
 * @returns 可运行的 ResolvedSkill
 */
export function resolveSkill(skill: SkillDefinition, userVariables?: Record<string, unknown>): ResolvedSkill {
  const resolvedVariables = resolveVariables(skill.variables, userVariables);

  const renderedSystemPrompt = renderTemplate(skill.prompts.system, resolvedVariables);
  const renderedUserPrompt = skill.prompts.user
    ? renderTemplate(skill.prompts.user, resolvedVariables)
    : undefined;

  return {
    ...skill,
    resolvedVariables,
    renderedSystemPrompt,
    renderedUserPrompt,
  };
}

/**
 * 提取 skill.yml 中引用的所有 Mustache 变量名
 */
export function extractTemplateVariables(template: string): string[] {
  const tokens = Mustache.parse(template);
  const vars = new Set<string>();

  function walk(node: unknown) {
    if (typeof node !== "object" || node === null) return;

    const n = node as Record<string, unknown>;
    if (n[0] === "name" && typeof n[1] === "string") {
      vars.add(n[1]);
    }
  }

  tokens.forEach(walk);
  return [...vars];
}
