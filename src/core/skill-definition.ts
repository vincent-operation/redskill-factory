/**
 * Skill 定义的 Zod Schema
 *
 * 运行时校验 skill.yml 的结构合法性。
 * 与 ../types/skill.ts 中的 TypeScript 接口保持同步。
 */
import { z } from "zod";

// ─── 元信息 ───────────────────────────────────────

const skillCategorySchema = z.enum([
  "education", "productivity", "creative", "lifestyle",
  "business", "health", "tech", "other",
]);

const skillPriceSchema = z.object({
  amount: z.number().min(0),
  currency: z.enum(["CNY", "USD"]),
  trialDays: z.number().int().min(0).optional(),
});

const skillMetaSchema = z.object({
  name: z.string()
    .min(2, "技能名至少 2 个字符")
    .max(64, "技能名最长 64 个字符")
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "技能名须为 kebab-case 格式 (如 ai-english-tutor)"),
  title: z.string().min(1, "标题不能为空").max(50, "标题最长 50 个字符"),
  version: z.string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, "版本号须为 semver 格式 (如 1.0.0)"),
  category: skillCategorySchema,
  description: z.string().min(1, "描述不能为空").max(200, "描述最长 200 个字符"),
  author: z.string().min(1, "作者不能为空"),
  price: skillPriceSchema.optional(),
  tags: z.array(z.string()).min(1, "至少需要一个标签").max(10, "最多 10 个标签"),
  icon: z.string().optional(),
  cover: z.string().optional(),
});

// ─── Prompt 定义 ──────────────────────────────────

const promptExampleSchema = z.object({
  user: z.string(),
  assistant: z.string(),
});

const skillPromptsSchema = z.object({
  system: z.string().min(1, "系统提示词不能为空"),
  user: z.string().optional(),
  examples: z.array(promptExampleSchema).max(10, "最多 10 个示例").optional(),
  greeting: z.string().optional(),
});

// ─── 变量 ────────────────────────────────────────

const variableTypeSchema = z.enum([
  "string", "number", "boolean", "select", "multiselect", "textarea",
]);

const skillVariableSchema = z.object({
  name: z.string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "变量名须为合法标识符"),
  label: z.string().min(1, "变量标签不能为空"),
  type: variableTypeSchema,
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z.array(z.string()).optional(),
  help: z.string().optional(),
  required: z.boolean().optional(),
});

// ─── 约束 ────────────────────────────────────────

const skillConstraintsSchema = z.object({
  preferredModel: z.string().optional(),
  maxTokens: z.number().int().positive().max(128000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTurns: z.number().int().positive().max(100).optional(),
  knowledgeCutoff: z.string().optional(),
});

// ─── 评测 ────────────────────────────────────────

const evalExpectSchema = z.object({
  contains: z.array(z.string()).optional(),
  matches: z.string().optional(),
});

const evalTestCaseSchema = z.object({
  description: z.string().optional(),
  input: z.record(z.unknown()),
  expect: evalExpectSchema.optional(),
  forbid: z.array(z.string()).optional(),
});

const skillEvaluationSchema = z.object({
  tests: z.array(evalTestCaseSchema).min(1, "至少需要一个评测用例"),
});

// ─── 分发 ────────────────────────────────────────

const distributionTargetSchema = z.enum([
  "claude-code", "openai-gpt", "hermes", "openclaw", "generic",
]);

const skillDistributionSchema = z.object({
  targets: z.array(distributionTargetSchema).min(1, "至少需要一个分发目标"),
  assets: z.array(z.string()).optional(),
  readme: z.string().optional(),
});

// ─── 完整 Schema ─────────────────────────────────

export const skillDefinitionSchema = z.object({
  meta: skillMetaSchema,
  prompts: skillPromptsSchema,
  variables: z.array(skillVariableSchema).max(20, "最多 20 个变量"),
  constraints: skillConstraintsSchema.optional(),
  evaluation: skillEvaluationSchema.optional(),
  distribution: skillDistributionSchema,
});

/** 严格模式 Schema — 需要 evaluation 和约束对象 */
export const strictSkillDefinitionSchema = skillDefinitionSchema.extend({
  constraints: z.object({
    preferredModel: z.string().optional(),
    maxTokens: z.number().int().positive().max(128000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTurns: z.number().int().positive().max(100).optional(),
    knowledgeCutoff: z.string().optional(),
  }),
  evaluation: skillEvaluationSchema,
});

export type ValidatedSkillDefinition = z.infer<typeof skillDefinitionSchema>;
