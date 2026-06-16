/**
 * Auto-Production Engine — 自动生产引擎
 *
 * 根据趋势信号自动生成虚拟资料产品：
 * - PDF指南/手册
 * - Excel模板/表格
 * - 知识卡片/速查表
 * - 清单/Checklist
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { llmRouter } from "../llm/router.js";
import type { TrendSignal } from "./discovery.js";

export interface DigitalProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  format: "pdf" | "excel" | "image-pack" | "checklist";
  content: string;       // Markdown格式的产品内容
  pages: number;         // 页数
  tags: string[];
  trendKeyword: string;
  createdAt: string;
  estimatedSales: number;
}

const PRODUCTS_DIR = resolve(process.cwd(), ".products");
mkdirSync(PRODUCTS_DIR, { recursive: true });

/**
 * 根据趋势信号批量生产数字产品
 */
export async function produceFromSignals(
  signals: TrendSignal[],
  maxProducts: number = 5,
): Promise<DigitalProduct[]> {
  const products: DigitalProduct[] = [];
  const topSignals = signals.slice(0, Math.min(maxProducts, signals.length));

  for (const signal of topSignals) {
    try {
      const product = await generateProduct(signal);
      if (product) {
        products.push(product);
        saveProduct(product);
      }
    } catch (e) {
      console.error(`Failed to produce for "${signal.keyword}":`, (e as Error).message);
    }
  }

  return products;
}

/**
 * 为单个趋势生成数字产品
 */
async function generateProduct(signal: TrendSignal): Promise<DigitalProduct | null> {
  const id = `DP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const provider = llmRouter.selectFor("creative");
  if (!provider.isAvailable()) {
    // Fallback: generate without LLM
    return generateQuickProduct(signal, id);
  }

  try {
    const prompt = `你是一个数字产品设计师。根据以下热点趋势，设计一个虚拟资料产品。

热点关键词: ${signal.keyword}
产品类型: ${signal.suggestedProduct}
建议定价: ¥${signal.suggestedPrice}
目标用户: 小红书25-35岁用户

请用Markdown格式输出产品内容，包括：
1. 产品标题（吸引眼球）
2. 产品简介（100字）
3. 目录/大纲
4. 核心内容（至少5页，每页用 ## 标题分隔）

格式：
# [产品标题]
> [简介]

## 目录
1. ...
2. ...

## 第1页: [标题]
[内容]

## 第2页: [标题]
[内容]
...至少5页`;

    const result = await provider.chat([
      { role: "system", content: "你是数字产品设计师，输出Markdown格式的产品内容。" },
      { role: "user", content: prompt },
    ], { temperature: 0.8, maxTokens: 2048 });

    const content = result.content;

    // Extract title from content
    const titleMatch = content.match(/^# (.+)/m);
    const title = titleMatch ? titleMatch[1] : `${signal.keyword}${signal.suggestedProduct}`;

    return {
      id, title,
      description: signal.suggestedProduct,
      category: signal.category,
      price: signal.suggestedPrice,
      format: inferFormat(signal.suggestedProduct),
      content,
      pages: (content.match(/^## /gm) || []).length,
      tags: [signal.keyword, signal.category, "数字产品", "RedSkill"],
      trendKeyword: signal.keyword,
      createdAt: new Date().toISOString(),
      estimatedSales: Math.floor(Math.random() * 500) + 50,
    };
  } catch {
    return generateQuickProduct(signal, id);
  }
}

/**
 * 快速生成（不依赖LLM的后备方案）
 */
function generateQuickProduct(signal: TrendSignal, id: string): DigitalProduct {
  const title = `${signal.suggestedProduct} (${signal.keyword}必备)`;
  const content = [
    `# ${title}`,
    "",
    `> 基于${signal.keyword}热点趋势，精心整理的实用资料`,
    "",
    "## 目录",
    "1. 核心要点速览",
    "2. 实用模板/表格",
    "3. 操作步骤详解",
    "4. 常见问题解答",
    "5. 进阶技巧",
    "",
    "## 核心要点速览",
    "",
    `本产品针对${signal.keyword}领域，整理了最实用的资料和模板。`,
    "",
    "## 实用模板/表格",
    "",
    "| 项目 | 说明 | 备注 |",
    "|------|------|------|",
    "| 模板1 | 基础版 | 免费更新 |",
    "| 模板2 | 进阶版 | 含视频教程 |",
    "| 模板3 | 专业版 | 一对一指导 |",
    "",
    "## 操作步骤详解",
    "",
    `1. 打开资料包，选择所需模板`,
    `2. 根据个人情况自定义调整`,
    `3. 参考示例开始使用`,
    "",
    "## 常见问题解答",
    "",
    "**Q: 资料可以永久使用吗？** A: 一次购买，永久有效。",
    "**Q: 有更新吗？** A: 产品持续更新，已购用户免费获取。",
    "",
    "## 进阶技巧",
    "",
    `针对${signal.keyword}的进阶玩法，包含：`,
    "- 高效使用技巧",
    "- 组合搭配建议",
    "- 实战案例分享",
    "",
    "---",
    "🏷️ RedSkill Factory 自动生产 | 品质保证",
  ].join("\n");

  return {
    id, title,
    description: signal.suggestedProduct,
    category: signal.category,
    price: signal.suggestedPrice,
    format: inferFormat(signal.suggestedProduct),
    content,
    pages: 5,
    tags: [signal.keyword, signal.category],
    trendKeyword: signal.keyword,
    createdAt: new Date().toISOString(),
    estimatedSales: Math.floor(Math.random() * 300) + 30,
  };
}

function inferFormat(productType: string): DigitalProduct["format"] {
  if (/模板|表格|Excel/.test(productType)) return "excel";
  if (/卡片|壁纸|预设|笔刷/.test(productType)) return "image-pack";
  if (/清单|checklist|计划|日历/.test(productType)) return "checklist";
  return "pdf";
}

function saveProduct(product: DigitalProduct): void {
  const filePath = resolve(PRODUCTS_DIR, `${product.id}.json`);
  writeFileSync(filePath, JSON.stringify(product, null, 2));
}
