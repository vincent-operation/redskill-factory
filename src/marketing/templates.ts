/**
 * 笔记模板库 — 小红书推广文案模板
 *
 * 每种模板针对不同的 Skill 类型优化。
 */
import type { SkillDefinition } from "../types/skill.js";

export interface NoteTemplate {
  name: string;
  description: string;
  generate(skill: SkillDefinition): string;
}

/** 种草型笔记模板 — 适合实用工具类 Skill */
export const reviewTemplate: NoteTemplate = {
  name: "种草测评型",
  description: "以真实使用体验分享的角度推荐 Skill",
  generate(skill: SkillDefinition): string {
    const title = `${skill.meta.title}到底值不值？用了 30 天说真话💬`;
    return `# ${title}

姐妹们！！前段时间发现了一个 ${skill.meta.category === "education" ? "学习" : "效率"}神器
就是【${skill.meta.title}】

用了快一个月了，来给你们说真话👇

## ✨ 它是干嘛的
${skill.meta.description}

## 💰 价格
${skill.meta.price ? `¥${skill.meta.price.amount}` : "免费"}

## 📝 真实使用感受
[这里写你的使用体验，越真实越好！]

## 👍 适合谁
${skill.meta.tags.map((t) => `- ${t}`).join("\n")}

## ⭐ 推荐指数
⭐⭐⭐⭐⭐ (5/5)

#RedSkill #AI工具 #${skill.meta.category}

---
*由 RedSkill Factory 生成 | 作者: ${skill.meta.author}*
`;
  },
};

/** 教程型笔记模板 — 适合教育/效率 Skill */
export const tutorialTemplate: NoteTemplate = {
  name: "教程攻略型",
  description: "以教程形式展示 Skill 的使用方法和效果",
  generate(skill: SkillDefinition): string {
    return `# 保姆级教程！手把手教你用 ${skill.meta.title} 🔥

好多姐妹问我【${skill.meta.title}】怎么用
今天一篇笔记教会你！建议收藏✨

## 📥 怎么获取
[RedSkill 商店搜索 "${skill.meta.name}"]

## 🎯 能做什么
${skill.meta.description}

## 📖 使用步骤
1. 下载安装后打开
2. 设置你的偏好参数
3. 开始使用！

## 💡 进阶玩法
[分享你的独门技巧，让读者觉得超值]

## 🎁 小贴士
[附加价值让读者更想买]

有用的话记得 ❤️ + ⭐ + 💬 三连！

#RedSkill教程 #${skill.meta.category} ${skill.meta.tags.map((t) => `#${t}`).join(" ")}

---
*由 RedSkill Factory 生成 | 作者: ${skill.meta.author}*
`;
  },
};

/** 对比型笔记模板 — 适合有多款 Skill 对比的场景 */
export const comparisonTemplate: NoteTemplate = {
  name: "对比评测型",
  description: "通过对比突出 Skill 的独特价值",
  generate(skill: SkillDefinition): string {
    return `# 红Skill内测一个月，我整理了这份避坑指南 🎯

RedSkill 商店上线后试了 N 个 ${skill.meta.category === "education" ? "学习" : "效率"}类 Skill
最后留下了【${skill.meta.title}】🏆

## 🔍 我试过的 Skill

| Skill | 价格 | 推荐度 |
|-------|------|--------|
| ${skill.meta.title} | ${skill.meta.price ? `¥${skill.meta.price.amount}` : "免费"} | ⭐⭐⭐⭐⭐ |
| [竞品1] | [价格] | ⭐⭐⭐ |
| [竞品2] | [价格] | ⭐⭐ |

## 🏆 为什么留下这个
1. ${skill.meta.tags[0] ?? "功能强"} — [展开说]
2. ${skill.meta.tags[1] ?? "体验好"} — [展开说]

## ⚠️ 避雷提示
[指出竞品的缺点，但要客观]

总之，${skill.meta.description.slice(0, 30)}... 真的可以冲！

#RedSkill测评 #避坑指南 ${skill.meta.tags.map((t) => `#${t}`).join(" ")}

---
*由 RedSkill Factory 生成 | 作者: ${skill.meta.author}*
`;
  },
};

/** 所有模板 */
export const noteTemplates: NoteTemplate[] = [
  reviewTemplate,
  tutorialTemplate,
  comparisonTemplate,
];
