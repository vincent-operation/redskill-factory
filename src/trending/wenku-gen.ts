/**
 * 百度文库内容生成器 — Baidu Wenku Content Generator
 *
 * 专门生成适合百度文库变现的教育类文档：
 * - 考研/考公/考证资料（最高需求）
 * - K-12课辅资料
 * - 专业文档（工作总结、行业报告）
 * - 菜谱/生活技巧合集
 * - 电子书/技能说明书
 *
 * 与 RedSkill Factory 主系统协同：
 * - 热门趋势 → 自动生产对应文档
 * - 文库下载数据 → 反馈优化方向
 * - 同一内容可同时上架小红书和百度文库
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { llmRouter } from "../llm/router.js";

const WENKU_DIR = resolve(process.cwd(), ".wenku");
mkdirSync(WENKU_DIR, { recursive: true });

export interface WenkuDocument {
  id: string;
  title: string;
  category: WenkuCategory;
  format: "doc" | "pdf" | "ppt" | "xls";
  content: string;        // Markdown source
  wordCount: number;
  price: number;          // 文库定价（¥）
  tags: string[];
  keywords: string[];     // SEO关键词
  description: string;    // 文库简介
  targetPlatform: "wenku" | "xhs" | "both";
  estimatedDemand: "high" | "medium" | "low";
  createdAt: string;
}

export type WenkuCategory =
  | "exam-postgrad" | "exam-civil" | "exam-cert"     // 考研/考公/考证
  | "k12-tutoring"                                    // K-12课辅
  | "professional" | "report"                         // 专业文档/报告
  | "recipe" | "lifestyle"                            // 菜谱/生活
  | "ebook" | "manual"                                // 电子书/说明书
  ;

/**
 * 百度文库热门品类模板
 */
const CATEGORY_TEMPLATES: Record<WenkuCategory, {
  label: string;
  basePrice: number;
  demand: "high" | "medium" | "low";
  promptTemplate: string;
}> = {
  "exam-postgrad": {
    label: "考研资料", basePrice: 19.9, demand: "high",
    promptTemplate: `你是考研辅导名师。生成一份考研资料文档，包含：
1. 知识点梳理（核心考点+易错点）
2. 历年真题解析（近3年）
3. 背诵口诀/记忆技巧
4. 模拟测试题（附答案）
科目：{subject} | 目标院校：{target}`,
  },
  "exam-civil": {
    label: "考公资料", basePrice: 19.9, demand: "high",
    promptTemplate: `你是公务员考试培训专家。生成一份考公资料文档：
1. 行测高频考点速记
2. 申论写作模板（3套）
3. 时政热点分析
4. 面试真题+答题框架`,
  },
  "exam-cert": {
    label: "考证资料", basePrice: 14.9, demand: "high",
    promptTemplate: `你是职业资格考试培训师。生成一份考证资料文档：
1. 考试大纲解读
2. 章节重点梳理
3. 真题练习+解析
4. 考前冲刺计划
证书：{cert}`,
  },
  "k12-tutoring": {
    label: "课辅资料", basePrice: 9.9, demand: "high",
    promptTemplate: `你是K-12教育专家。生成一份课辅资料文档：
1. 知识点归纳（按教材章节）
2. 经典例题讲解
3. 课后练习（附答案）
4. 学习方法和技巧
年级：{grade} | 科目：{subject}`,
  },
  "professional": {
    label: "专业文档", basePrice: 14.9, demand: "medium",
    promptTemplate: `你是行业专家。生成一份专业文档：
1. 行业概述与趋势
2. 核心知识点
3. 实操指南
4. 常见问题解答`,
  },
  "report": {
    label: "工作报告", basePrice: 9.9, demand: "medium",
    promptTemplate: `你是职场写作专家。生成一份工作报告模板：
1. 工作总结框架
2. 数据展示模板
3. 问题分析与解决方案
4. 下阶段计划`,
  },
  "recipe": {
    label: "菜谱合集", basePrice: 6.9, demand: "medium",
    promptTemplate: `你是美食博主。生成一份菜谱合集：
1. 食材清单
2. 详细步骤（配图说明）
3. 小贴士和替代方案
4. 营养信息`,
  },
  "lifestyle": {
    label: "生活技巧", basePrice: 6.9, demand: "low",
    promptTemplate: `你是生活达人。生成一份生活技巧合集：
1. 分类整理（家居/出行/理财）
2. 具体操作步骤
3. 省钱/省时效果对比`,
  },
  "ebook": {
    label: "电子书", basePrice: 19.9, demand: "medium",
    promptTemplate: `你是畅销书作者。生成一份电子书：
1. 引言（为什么重要）
2. 核心方法论（3-5个）
3. 案例分析与实战
4. 总结与行动指南`,
  },
  "manual": {
    label: "技能说明书", basePrice: 14.9, demand: "medium",
    promptTemplate: `你是技术文档专家。生成一份技能说明书：
1. 概述与适用场景
2. 基础操作指南
3. 进阶技巧
4. 常见问题与解决方案`,
  },
};

/**
 * 批量生成百度文库文档
 */
export async function generateWenkuDocs(
  topics: Array<{ keyword: string; category: WenkuCategory; subject?: string }>,
  useLLM: boolean = false,
): Promise<WenkuDocument[]> {
  const docs: WenkuDocument[] = [];

  for (const topic of topics) {
    const template = CATEGORY_TEMPLATES[topic.category];
    let content: string;

    if (useLLM) {
      const provider = llmRouter.selectFor("creative");
      if (provider.isAvailable()) {
        try {
          let prompt = template.promptTemplate;
          if (topic.subject) prompt = prompt.replace("{subject}", topic.subject);
          if (topic.keyword) prompt = prompt.replace("{keyword}", topic.keyword);

          const result = await provider.chat([
            { role: "system", content: "你是专业文档作者，输出Markdown格式，字数2000-5000字。" },
            { role: "user", content: prompt },
          ], { temperature: 0.7, maxTokens: 4096 });
          content = result.content;
        } catch { content = generateFallbackContent(topic, template); }
      } else {
        content = generateFallbackContent(topic, template);
      }
    } else {
      content = generateFallbackContent(topic, template);
    }

    const doc = createDocument(topic, template, content);
    docs.push(doc);
    saveDocument(doc);
  }

  return docs;
}

function generateFallbackContent(
  topic: { keyword: string; category: WenkuCategory; subject?: string },
  template: typeof CATEGORY_TEMPLATES[WenkuCategory],
): string {
  const lines = [
    `# ${topic.keyword}${template.label}`,
    "",
    `> 精心整理的${template.label}，助你高效学习/备考`,
    "",
    "## 📋 目录",
    "1. 核心知识点梳理",
    "2. 重点难点突破",
    "3. 实战练习（附答案）",
    "4. 记忆技巧与口诀",
    "5. 常见问题解答",
    "",
    "## 📚 核心知识点梳理",
    "",
    `本章梳理${topic.keyword}的核心考点和知识框架，涵盖所有高频考点。`,
    "每个知识点标注重要程度（⭐必修 ⭐⭐重点 ⭐⭐⭐必考）。",
    "",
    "| 知识点 | 重要度 | 考察形式 | 分值占比 |",
    "|--------|--------|----------|----------|",
    "| 知识点1 | ⭐⭐⭐ | 选择题+大题 | 25% |",
    "| 知识点2 | ⭐⭐⭐ | 大题 | 20% |",
    "| 知识点3 | ⭐⭐ | 选择题 | 15% |",
    "| 知识点4 | ⭐⭐ | 论述 | 20% |",
    "| 知识点5 | ⭐ | 简答 | 20% |",
    "",
    "## 🎯 重点难点突破",
    "",
    "### 难点1：",
    "详细解析...",
    "",
    "### 难点2：",
    "详细解析...",
    "",
    "## ✍️ 实战练习",
    "",
    "**题1:** 题目内容",
    "> 答案：A。解析：...",
    "",
    "**题2:** 题目内容",
    "> 答案：B。解析：...",
    "",
    "## 🧠 记忆技巧",
    "",
    "- 口诀1: ...",
    "- 口诀2: ...",
    "- 联想记忆法: ...",
    "",
    "## ❓ 常见问题",
    "",
    "**Q: 如何高效使用本资料？**",
    "A: 建议先浏览目录了解框架，再逐章学习，每章后做练习巩固。",
    "",
    "---",
    "> 🏷️ RedSkill Factory × 百度文库 | 品质保证 | 持续更新",
  ];

  return lines.join("\n");
}

function createDocument(
  topic: { keyword: string; category: WenkuCategory },
  template: typeof CATEGORY_TEMPLATES[WenkuCategory],
  content: string,
): WenkuDocument {
  const id = `WK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id,
    title: `${topic.keyword}${template.label}（精编版）`,
    category: topic.category,
    format: "doc",
    content,
    wordCount: content.length,
    price: template.basePrice,
    tags: [topic.keyword, template.label, "RedSkill", "学习资料"],
    keywords: [topic.keyword, template.label, "考试", "复习", "资料"],
    description: `${template.label}，涵盖核心知识点、重点难点突破、实战练习和记忆技巧，助你高效备考。`,
    targetPlatform: "both",
    estimatedDemand: template.demand,
    createdAt: new Date().toISOString(),
  };
}

function saveDocument(doc: WenkuDocument): void {
  const filePath = resolve(WENKU_DIR, `${doc.id}.json`);
  writeFileSync(filePath, JSON.stringify(doc, null, 2));
}
