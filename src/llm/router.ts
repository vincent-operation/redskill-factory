/**
 * LLM Router — 根据任务类型自动选择最佳模型
 *
 * 路由策略:
 * - creative (创意/文案) → Claude (更好的创意写作)
 * - reasoning (推理/分析) → DeepSeek Reasoner
 * - general (通用) → DeepSeek Chat (性价比最高)
 * - coding (代码) → Claude
 */
import type { LlmProvider, LlmMessage, LlmCallOptions, LlmResult } from "./provider.js";
import { DeepSeekProvider } from "./deepseek.js";
import { ClaudeProvider } from "./claude.js";
import { logger } from "../shared/logger.js";

export type TaskType = "creative" | "reasoning" | "general" | "coding";

export class LlmRouter {
  private providers: Map<string, LlmProvider> = new Map();
  private defaultProvider: string = "deepseek";

  constructor() {
    this.register(new DeepSeekProvider());
    this.register(new ClaudeProvider());
  }

  register(provider: LlmProvider): void {
    this.providers.set(provider.name, provider);
    logger.debug(`注册 Provider: ${provider.name} (可用: ${provider.isAvailable()})`);
  }

  /** 获取指定名称的 Provider */
  get(name: string): LlmProvider | undefined {
    return this.providers.get(name);
  }

  /** 根据任务类型选择 Provider */
  selectFor(task: TaskType): LlmProvider {
    switch (task) {
      case "creative":
        if (this.providers.get("claude")?.isAvailable()) {
          return this.providers.get("claude")!;
        }
        break;
      case "reasoning":
        // DeepSeek 有专门的推理模型
        return this.providers.get("deepseek")!;
      case "coding":
        if (this.providers.get("claude")?.isAvailable()) {
          return this.providers.get("claude")!;
        }
        break;
      case "general":
      default:
        break;
    }
    return this.providers.get(this.defaultProvider)!;
  }

  /** 便捷调用: 根据任务类型自动选择 Provider 和模型 */
  async route(
    messages: LlmMessage[],
    taskType: TaskType = "general",
    options?: LlmCallOptions,
  ): Promise<LlmResult> {
    const provider = this.selectFor(taskType);

    const modelOptions = { ...options };
    if (!modelOptions.model) {
      // 根据任务类型选择默认模型
      switch (taskType) {
        case "creative":
          modelOptions.model = "claude-sonnet-4-6";
          break;
        case "reasoning":
          modelOptions.model = "deepseek-reasoner";
          break;
        case "coding":
          modelOptions.model = "claude-sonnet-4-6";
          break;
        default:
          modelOptions.model = "deepseek-chat";
      }
    }

    logger.debug(`路由: ${taskType} → ${provider.name}/${modelOptions.model}`);
    return provider.chat(messages, modelOptions);
  }

  /** 列出所有可用的 Provider */
  listAvailable(): string[] {
    return [...this.providers.entries()]
      .filter(([, p]) => p.isAvailable())
      .map(([name]) => name);
  }
}

/** 全局单例 */
export const llmRouter = new LlmRouter();
