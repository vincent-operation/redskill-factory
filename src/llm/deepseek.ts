/**
 * DeepSeek LLM Provider
 *
 * 使用 OpenAI 兼容协议调用 DeepSeek API。
 * 模型: deepseek-chat (通用), deepseek-reasoner (推理)
 */
import type { LlmProvider, LlmMessage, LlmCallOptions, LlmResult } from "./provider.js";
import { loadConfig } from "../shared/config.js";

export class DeepSeekProvider implements LlmProvider {
  readonly name = "deepseek";
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const config = loadConfig();
    this.apiKey = config.deepseek.apiKey;
    this.baseUrl = config.deepseek.baseUrl;
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async chat(messages: LlmMessage[], options: LlmCallOptions = {}): Promise<LlmResult> {
    const model = options.model ?? "deepseek-chat";

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
        stop: options.stop,
        stream: false,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
      model: data.model,
    };
  }

  async *chatStream(messages: LlmMessage[], options: LlmCallOptions = {}): AsyncIterable<string> {
    const model = options.model ?? "deepseek-chat";

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
        stop: options.stop,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法获取响应流");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") return;

          try {
            const parsed = JSON.parse(jsonStr) as {
              choices: Array<{ delta: { content?: string } }>;
            };
            const content = parsed.choices[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
