/**
 * 环境配置加载
 */
import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";

// 加载 .env 文件
dotenvConfig({ path: resolve(process.cwd(), ".env") });

export interface AppConfig {
  deepseek: {
    apiKey: string;
    baseUrl: string;
  };
  anthropic: {
    authToken: string;
    baseUrl: string;
  };
}

export function loadConfig(): AppConfig {
  return {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
    },
    anthropic: {
      authToken: process.env.ANTHROPIC_AUTH_TOKEN ?? "",
      baseUrl: process.env.ANTHROPIC_BASE_URL ?? "https://api.deepseek.com/anthropic",
    },
  };
}

/** 检查必需的 API Key 是否已配置 */
export function checkRequiredKeys(): string[] {
  const missing: string[] = [];
  const config = loadConfig();

  if (!config.deepseek.apiKey) {
    missing.push("DEEPSEEK_API_KEY");
  }
  // Anthropic token 是可选的（可以只用 DeepSeek）

  return missing;
}
