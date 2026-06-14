/**
 * Playground Runner — 本地技能交互测试
 *
 * 在本地运行 Skill，进行对话测试和 evaluation 验证。
 */
import type { ChatMessage } from "../core/skill-compiler.js";
import type { ResolvedSkill } from "../types/skill.js";
import type { LlmProvider } from "../llm/provider.js";
import { llmRouter } from "../llm/router.js";
import { compileToMessages } from "../core/skill-compiler.js";
import { logger } from "../shared/logger.js";
import chalk from "chalk";

export interface PlaygroundOptions {
  provider?: string;
  model?: string;
  verbose?: boolean;
}

export class PlaygroundRunner {
  private resolved: ResolvedSkill;
  private provider: LlmProvider;
  private options: PlaygroundOptions;

  constructor(resolved: ResolvedSkill, options: PlaygroundOptions = {}) {
    this.resolved = resolved;
    this.options = options;

    if (options.provider) {
      const p = llmRouter.get(options.provider);
      if (!p) throw new Error(`Provider 不可用: ${options.provider}`);
      this.provider = p;
    } else {
      this.provider = llmRouter.selectFor("general");
    }
  }

  /** 发送单条消息并获取回复 */
  async send(userMessage: string): Promise<string> {
    const messages = compileToMessages(this.resolved, userMessage);

    if (this.options.verbose) {
      logger.debug(`发送 ${messages.length} 条消息到 ${this.provider.name}`);
    }

    const result = await this.provider.chat(messages, {
      model: this.options.model ?? this.resolved.constraints?.preferredModel,
      maxTokens: this.resolved.constraints?.maxTokens,
      temperature: this.resolved.constraints?.temperature,
    });

    return result.content;
  }

  /** 流式发送消息 */
  async *sendStream(userMessage: string): AsyncIterable<string> {
    const messages = compileToMessages(this.resolved, userMessage);

    for await (const chunk of this.provider.chatStream(messages, {
      model: this.options.model ?? this.resolved.constraints?.preferredModel,
      maxTokens: this.resolved.constraints?.maxTokens,
      temperature: this.resolved.constraints?.temperature,
    })) {
      yield chunk;
    }
  }

  /** 运行 evaluation 测试用例 */
  async runEval(): Promise<EvalReport> {
    if (!this.resolved.evaluation?.tests?.length) {
      return { total: 0, pass: 0, fail: 0, details: [] };
    }

    logger.title("🧪 运行 Evaluation 测试");

    const results: EvalDetail[] = [];
    const tests = this.resolved.evaluation.tests;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]!;
      logger.step(i + 1, tests.length, test.description ?? `测试 ${i + 1}`);

      try {
        // 构建测试消息 (使用测试的 input 变量)
        const testResolved = {
          ...this.resolved,
          resolvedVariables: { ...this.resolved.resolvedVariables, ...test.input },
          renderedSystemPrompt: this.resolved.renderedSystemPrompt,
        };

        const playerInput = typeof test.input === "object"
          ? (Object.values(test.input).filter((v) => typeof v === "string").join(" ") ?? "test")
          : String(test.input);

        const response = await this.provider.chat(
          compileToMessages(testResolved, playerInput),
          { maxTokens: 512, temperature: 0.1 },
        );

        const checks: EvalCheck[] = [];

        // 检查 contains
        if (test.expect?.contains) {
          for (const expected of test.expect.contains) {
            checks.push({
              type: "contains",
              expected,
              passed: response.content.includes(expected),
            });
          }
        }

        // 检查 forbid
        if (test.forbid) {
          for (const forbidden of test.forbid) {
            checks.push({
              type: "forbid",
              expected: forbidden,
              passed: !response.content.includes(forbidden),
            });
          }
        }

        const allPassed = checks.every((c) => c.passed);
        results.push({
          description: test.description ?? `测试 ${i + 1}`,
          passed: allPassed,
          checks,
          response: response.content.slice(0, 200),
        });

        if (allPassed) {
          logger.success("通过");
        } else {
          logger.error("失败");
          for (const check of checks.filter((c) => !c.passed)) {
            console.log(`    ${chalk.red("✗")} ${check.type}: "${check.expected}"`);
          }
        }
      } catch (err) {
        results.push({
          description: test.description ?? `测试 ${i + 1}`,
          passed: false,
          checks: [],
          error: (err as Error).message,
        });
        logger.error(`错误: ${(err as Error).message}`);
      }
    }

    const pass = results.filter((r) => r.passed).length;
    const fail = results.length - pass;

    console.log("");
    if (fail === 0) {
      logger.success(`全部通过: ${pass}/${results.length}`);
    } else {
      logger.error(`${fail} 个失败, ${pass} 个通过`);
    }

    return { total: results.length, pass, fail, details: results };
  }
}

export interface EvalReport {
  total: number;
  pass: number;
  fail: number;
  details: EvalDetail[];
}

export interface EvalDetail {
  description: string;
  passed: boolean;
  checks: EvalCheck[];
  response?: string;
  error?: string;
}

export interface EvalCheck {
  type: "contains" | "forbid";
  expected: string;
  passed: boolean;
}
