/**
 * 对话会话管理
 *
 * 管理多轮对话的上下文和消息历史。
 */
import type { ChatMessage } from "../core/skill-compiler.js";
import type { ResolvedSkill } from "../types/skill.js";

export class Session {
  private history: ChatMessage[] = [];
  private resolved: ResolvedSkill;

  constructor(resolved: ResolvedSkill) {
    this.resolved = resolved;
    this.history.push({ role: "system", content: resolved.renderedSystemPrompt });
  }

  /** 添加用户消息 */
  addUser(content: string): void {
    this.history.push({ role: "user", content });
  }

  /** 添加助手消息 */
  addAssistant(content: string): void {
    this.history.push({ role: "assistant", content });
  }

  /** 获取完整消息历史 */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  /** 获取最后 N 轮对话 */
  getRecentTurns(n: number): ChatMessage[] {
    // System prompt 始终在最前
    const systemMessages = this.history.filter((m) => m.role === "system");
    const conversation = this.history.filter((m) => m.role !== "system");
    const recent = conversation.slice(-(n * 2)); // 每轮 = user + assistant
    return [...systemMessages, ...recent];
  }

  /** 清空对话 (保留 system prompt) */
  reset(): void {
    this.history = this.history.filter((m) => m.role === "system");
  }

  /** 对话轮数 */
  get turnCount(): number {
    return Math.floor(
      this.history.filter((m) => m.role === "user").length,
    );
  }
}
