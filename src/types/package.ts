/**
 * 打包产物类型定义
 */

import type { DistributionTarget, SkillMeta } from "./skill.js";

/** 打包器接口 */
export interface Packager {
  /** 打包器名称 */
  readonly name: string;
  /** 支持的目标框架 */
  readonly target: DistributionTarget;
  /** 打包入口 */
  package(skill: PackagerInput): Promise<PackagerOutput>;
}

/** 打包器输入 */
export interface PackagerInput {
  meta: SkillMeta;
  renderedSystemPrompt: string;
  renderedUserPrompt?: string;
  greeting?: string;
  variables: Record<string, unknown>;
  assets: string[];
  readmePath?: string;
  /** License 信息 (购买后打包时传入) */
  license?: {
    key: string;
    buyerId: string;
    issuedAt: string;
  };
}

/** 打包器输出 */
export interface PackagerOutput {
  target: DistributionTarget;
  files: OutputFile[];
  /** 输出目录名 */
  directoryName: string;
}

export interface OutputFile {
  path: string;
  content: string;
}
