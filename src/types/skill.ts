/**
 * 核心类型定义 — RedSkill Factory
 *
 * 定义了 Skill 的完整数据结构，从 YAML 配置到运行时 artifact。
 * 所有类型与 Zod schema (../core/skill-definition.ts) 保持同步。
 */

// ─── 元信息 ───────────────────────────────────────

export interface SkillMeta {
  /** 技能唯一标识 (kebab-case), 如 "ai-english-tutor" */
  name: string;
  /** 展示名称, 如 "AI 英语外教" */
  title: string;
  /** 语义化版本 */
  version: string;
  /** 分类 */
  category: SkillCategory;
  /** 简短描述 (1-2 句话, 用于列表展示) */
  description: string;
  /** 作者标识 (小红书昵称或 ID) */
  author: string;
  /** 定价信息 */
  price?: SkillPrice;
  /** 标签 (用于搜索和分类) */
  tags: string[];
  /** 图标路径 (相对路径) */
  icon?: string;
  /** 封面图路径 (相对路径, 用于 RedSkill 商店展示) */
  cover?: string;
}

export type SkillCategory =
  | "education"
  | "productivity"
  | "creative"
  | "lifestyle"
  | "business"
  | "health"
  | "tech"
  | "other";

export interface SkillPrice {
  amount: number;
  currency: "CNY" | "USD";
  /** 免费试用天数, 0 表示无试用 */
  trialDays?: number;
}

// ─── Prompt 定义 ──────────────────────────────────

export interface SkillPrompts {
  /** 系统提示词 (设定角色、规则、约束) */
  system: string;
  /** 用户消息模板 (可包含 Mustache 变量) */
  user?: string;
  /** Few-shot 示例 */
  examples?: PromptExample[];
  /** 对话开场白 */
  greeting?: string;
}

export interface PromptExample {
  user: string;
  assistant: string;
}

// ─── 变量定义 ────────────────────────────────────

export interface SkillVariable {
  /** 变量名 (在 Mustache 模板中引用) */
  name: string;
  /** 中文标签 */
  label: string;
  /** 控件类型 */
  type: VariableType;
  /** 默认值 */
  default?: string | number | boolean;
  /** 选项列表 (type=select 时使用) */
  options?: string[];
  /** 帮助文本 */
  help?: string;
  /** 是否必填 */
  required?: boolean;
}

export type VariableType = "string" | "number" | "boolean" | "select" | "multiselect" | "textarea";

// ─── 约束配置 ────────────────────────────────────

export interface SkillConstraints {
  /** 推荐模型 */
  preferredModel?: string;
  /** 最大 Token 数 */
  maxTokens?: number;
  /** 温度 (0-2) */
  temperature?: number;
  /** 允许的最大对话轮次 */
  maxTurns?: number;
  /** 知识截止日期 */
  knowledgeCutoff?: string;
}

// ─── 评测配置 ────────────────────────────────────

export interface SkillEvaluation {
  tests: EvalTestCase[];
}

export interface EvalTestCase {
  /** 描述 */
  description?: string;
  /** 输入变量 */
  input: Record<string, unknown>;
  /** 期望包含的文本 */
  expect?: {
    contains?: string[];
    matches?: string;
  };
  /** 禁止出现的文本 */
  forbid?: string[];
}

// ─── 分发配置 ────────────────────────────────────

export interface SkillDistribution {
  /** 目标 Agent 框架 */
  targets: DistributionTarget[];
  /** 附加资源文件 */
  assets?: string[];
  /** README 文件路径 */
  readme?: string;
}

export type DistributionTarget =
  | "claude-code"
  | "openai-gpt"
  | "hermes"
  | "openclaw"
  | "generic";

// ─── 完整 Skill 定义 ─────────────────────────────

export interface SkillDefinition {
  meta: SkillMeta;
  prompts: SkillPrompts;
  variables: SkillVariable[];
  constraints?: SkillConstraints;
  evaluation?: SkillEvaluation;
  distribution: SkillDistribution;
}

// ─── 运行时 Skill (编译后) ────────────────────────

export interface ResolvedSkill extends SkillDefinition {
  /** 已解析变量值 */
  resolvedVariables: Record<string, unknown>;
  /** 已渲染的 system prompt */
  renderedSystemPrompt: string;
  /** 已渲染的 user prompt (如有) */
  renderedUserPrompt?: string;
}

// ─── 打包产物 ────────────────────────────────────

export interface SkillPackage {
  /** 技能名 */
  name: string;
  /** 目标框架 */
  target: DistributionTarget;
  /** 输出文件路径 */
  outputPath: string;
  /** 文件列表 */
  files: PackageFile[];
  /** 打包时间 */
  builtAt: string;
}

export interface PackageFile {
  /** 相对路径 */
  path: string;
  /** 文件内容 */
  content: string;
}

// ─── CLI 选项 ────────────────────────────────────

export interface GlobalOptions {
  verbose: boolean;
  config?: string;
}
