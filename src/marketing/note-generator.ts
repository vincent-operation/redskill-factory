/**
 * 小红书笔记生成器
 *
 * 为 Skill 生成小红书上可用的推广笔记。
 */
import type { SkillDefinition } from "../types/skill.js";
import { noteTemplates } from "./templates.js";

export interface MarketingOptions {
  type?: "note" | "cover" | "title";
  count?: number;
  template?: string;
}

export interface MarketingResult {
  type: string;
  content: string;
  template: string;
}

/**
 * 生成小红书推广物料
 */
export function generateMarketingContent(
  skill: SkillDefinition,
  options: MarketingOptions = {},
): MarketingResult[] {
  const results: MarketingResult[] = [];
  const count = options.count ?? 1;
  const type = options.type ?? "note";

  if (type === "note") {
    // 选择模板
    const template = options.template
      ? noteTemplates.find((t) => t.name === options.template)
      : noteTemplates[0];

    if (!template) {
      throw new Error(`未知模板: ${options.template}`);
    }

    for (let i = 0; i < count; i++) {
      const content = template.generate(skill);
      results.push({ type: "note", content, template: template.name });
    }
  } else if (type === "title") {
    results.push(...generateTitles(skill, count));
  } else if (type === "cover") {
    results.push(...generateCoverSuggestions(skill, count));
  }

  return results;
}

function generateTitles(skill: SkillDefinition, count: number): MarketingResult[] {
  const baseTitles = [
    `姐妹们！这个${skill.meta.category === "education" ? "学习" : ""}神器真的绝了 🔥`,
    `用了${skill.meta.title}之后，我宣布... 💬`,
    `小Red书没有骗我！${skill.meta.title}真的太香了 ✨`,
    `如果你也用${skill.meta.title}，一定要看这篇 📝`,
    `强烈安利！${skill.meta.title}改变了我的生活 🌟`,
    `终于找到了！最好用的${skill.meta.category}类 RedSkill 🎉`,
    `${skill.meta.price ? `¥${skill.meta.price.amount}` : "免费"}！这个Skill值疯了 💰`,
    `新手必看｜${skill.meta.title}完全使用指南 📖`,
  ];

  return baseTitles.slice(0, count).map((title) => ({
    type: "title",
    content: title,
    template: "title-generator",
  }));
}

function generateCoverSuggestions(skill: SkillDefinition, count: number): MarketingResult[] {
  const suggestions = [
    [
      "构图: 居中大字标题 + Skill Logo",
      `配色: 小红书经典红 (#FF2442) + 白色`,
      `文字: "${skill.meta.title}"`,
      "元素: 手机截图 + 箭头标注",
    ].join("\n"),
    [
      "构图: Before/After 对比",
      "配色: 暖色调 (浅粉 + 奶油白)",
      `文字: "用了${skill.meta.title}之前 vs 之后"`,
      "元素: 两张对比图左右排列",
    ].join("\n"),
    [
      "构图: 大字标题 + 使用场景",
      "配色: 渐变背景 (浅紫到浅蓝)",
      `文字: "${skill.meta.title}到底有多好用？"`,
      "元素: emoji 装饰 + 对话框",
    ].join("\n"),
  ];

  return suggestions.slice(0, count).map((s) => ({
    type: "cover",
    content: s,
    template: "cover-suggestions",
  }));
}
