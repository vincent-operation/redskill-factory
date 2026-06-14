/**
 * Claude LLM Provider
 *
 * 支持两种访问方式:
 * 1. DeepSeek 的 Anthropic 兼容端点 (ANTHROPIC_AUTH_TOKEN)
 * 2. 原生 Anthropic API (ANTHROPIC_API_KEY 直接调用)
 */
import type { LlmProvider, LlmMessage, LlmCallOptions, LlmResult } from "./provider.js";
import { loadConfig } from "../shared/config.js";

export class ClaudeProvider implements LlmProvider {
  readonly name = "claude";
  private authToken: string;
  private baseUrl: string;

  constructor() {
    const config = loadConfig();
    this.authToken = config.anthropic.authToken;
    this.baseUrl = config.anthropic.baseUrl;
  }

  isAvailable(): boolean {
    return this.authToken.length > 0;
  }

  async chat(messages: LlmMessage[], options: LlmCallOptions = {}): Promise<LlmResult> {
    const model = options.model ?? "claude-sonnet-4-6";

    // 提取 system 消息 (Anthropic Messages API 要求)
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.content }],
      }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: options.maxTokens ?? 2048,
      messages: chatMessages,
      temperature: options.temperature ?? 0.7,
      stream: false,
    };

    if (systemMsg) {
      body.system = [{ type: "text", text: systemMsg.content }];
    }
    if (options.stop?.length) {
      body.stop_sequences = options.stop;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.authToken,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API 错误 (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
      model: string;
    };

    const textContent = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    return {
      content: textContent,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
      },
      model: data.model,
    };
  }

  async *chatStream(messages: LlmMessage[], options: LlmCallOptions = {}): AsyncIterable<string> {
    const model = options.model ?? "claude-sonnet-4-6";

    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.content }],
      }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: options.maxTokens ?? 2048,
      messages: chatMessages,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };

    if (systemMsg) {
      body.system = [{ type: "text", text: systemMsg.content }];
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.authToken,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API 错误 (${response.status}): ${errorText}`);
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
          try {
            const parsed = JSON.parse(jsonStr) as {
              type: string;
              delta?: { type: string; text?: string };
              content_block?: { type: string; text?: string };
            };

            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          } catch {
            // 跳过
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
