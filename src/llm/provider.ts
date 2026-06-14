/**
 * LLM Provider 抽象接口
 *
 * 所有 LLM Provider 必须实现此接口。
 * 支持 OpenAI 兼容协议和 Anthropic 协议。
 */

/** LLM 消息 */
export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** LLM 调用选项 */
export interface LlmCallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  signal?: AbortSignal;
}

/** LLM 调用结果 */
export interface LlmResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  model: string;
}

/** LLM Provider 接口 */
export interface LlmProvider {
  readonly name: string;
  /** 调用 LLM 完成对话 */
  chat(messages: LlmMessage[], options?: LlmCallOptions): Promise<LlmResult>;
  /** 流式调用 */
  chatStream(messages: LlmMessage[], options?: LlmCallOptions): AsyncIterable<string>;
  /** 检查 Provider 是否可用 (API Key 已配置) */
  isAvailable(): boolean;
}
