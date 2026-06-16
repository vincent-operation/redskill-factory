/**
 * Cross-Platform Optimizer — 跨平台协同优化器
 *
 * 核心策略引擎，协调三大平台：
 * - RedSkill Factory (AI技能)
 * - 小红书店铺 (流量+成交)
 * - 百度文库 (文档变现)
 *
 * 协同逻辑：
 * 1. 发现趋势 → 判断适合哪个平台
 * 2. 热门关键词 → 文库文档 + XHS帖子同步
 * 3. 文库下载数据 → 反馈到Skill产品设计
 * 4. XHS转化数据 → 反馈到定价和内容优化
 * 5. 两个平台互相导流（文库描述放XHS链接，XHS帖子推荐文库文档）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TrendSignal } from "./discovery.js";
import type { WenkuDocument, WenkuCategory } from "./wenku-gen.js";

const OPT_DIR = resolve(process.cwd(), ".reports");
mkdirSync(OPT_DIR, { recursive: true });

export interface PlatformDecision {
  trendKeyword: string;
  strategy: "skill" | "wenku" | "xhs-only" | "all";
  reasoning: string;
  wenku?: { category: WenkuCategory; subject?: string; estimatedRevenue: number };
  skill?: { template: string; estimatedRevenue: number };
  xhsPost?: { angle: string; hashtags: string[] };
}

export interface CrossPlatformReport {
  timestamp: string;
  trends: TrendSignal[];
  decisions: PlatformDecision[];
  totalEstimatedRevenue: number;
  byPlatform: { wenku: number; skill: number; xhsPosts: number };
  synergyActions: string[];
}

/**
 * 分析趋势并决定跨平台策略
 */
export function analyzeCrossPlatform(trends: TrendSignal[]): CrossPlatformReport {
  const decisions: PlatformDecision[] = [];
  let wenkuRev = 0, skillRev = 0, xhsPosts = 0;

  for (const trend of trends) {
    const decision = decidePlatform(trend);
    decisions.push(decision);

    if (decision.wenku) wenkuRev += decision.wenku.estimatedRevenue;
    if (decision.skill) skillRev += decision.skill.estimatedRevenue;
    xhsPosts++;
  }

  const synergyActions = generateSynergyActions(decisions);

  const report: CrossPlatformReport = {
    timestamp: new Date().toISOString(),
    trends,
    decisions,
    totalEstimatedRevenue: wenkuRev + skillRev,
    byPlatform: { wenku: wenkuRev, skill: skillRev, xhsPosts },
    synergyActions,
  };

  // Save report
  const reportPath = resolve(OPT_DIR, `cross-platform-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

function decidePlatform(trend: TrendSignal): PlatformDecision {
  const kw = trend.keyword;

  // Exam/education → Wenku (highest demand)
  if (/考研|考公|考证|教资|法考|CPA|PMP|四六级|雅思|托福/.test(kw)) {
    return {
      trendKeyword: kw,
      strategy: "all",
      reasoning: "教育类→文库主力+Skill辅助+XHS引流",
      wenku: mapToWenku(kw, { category: "exam-postgrad", subject: kw }),
      skill: { template: kw.includes("考研") || kw.includes("考公") ? "study-planner" : "exam-coach", estimatedRevenue: Math.floor(trend.heatScore * 3) },
      xhsPost: { angle: `${kw}必过资料，文库搜"${kw}精编版"`, hashtags: [`#${kw}`, "#考试", "#学习资料"] },
    };
  }

  // K-12 tutoring → Wenku
  if (/小学|初中|高中|中考|高考|课辅|语文|数学|英语/.test(kw)) {
    return {
      trendKeyword: kw,
      strategy: "wenku",
      reasoning: "K-12课辅→文库主力",
      wenku: mapToWenku(kw, { category: "k12-tutoring", subject: kw }),
      xhsPost: { angle: `家长必备！${kw}课辅资料`, hashtags: [`#${kw}`, "#育儿", "#学习"] },
    };
  }

  // Recipes / Lifestyle → XHS + Wenku
  if (/菜谱|食谱|美食|烹饪|烘焙/.test(kw)) {
    return {
      trendKeyword: kw,
      strategy: "wenku",
      reasoning: "菜谱→文库+XHS",
      wenku: mapToWenku(kw, { category: "recipe" }),
      xhsPost: { angle: `${kw}合集！手把手教你`, hashtags: [`#${kw}`, "#美食", "#厨房"] },
    };
  }

  // Professional / Career → Wenku + Skill
  if (/PPT|Excel|简历|面试|职场|跳槽|工作总结/.test(kw)) {
    return {
      trendKeyword: kw,
      strategy: "all",
      reasoning: "职场类→文库+Skill+XHS",
      wenku: mapToWenku(kw, { category: "professional" }),
      skill: { template: kw.includes("PPT") ? "ppt-generator" : "resume-pro", estimatedRevenue: Math.floor(trend.heatScore * 5) },
      xhsPost: { angle: `${kw}必备模板`, hashtags: [`#${kw}`, "#职场", "#效率"] },
    };
  }

  // Ebooks / Manuals → Wenku
  if (/电子书|说明书|指南|手册|教程/.test(kw)) {
    return {
      trendKeyword: kw,
      strategy: "wenku",
      reasoning: "文档类→文库",
      wenku: mapToWenku(kw, { category: "ebook" }),
      xhsPost: { angle: `超全${kw}，建议收藏`, hashtags: [`#${kw}`, "#干货", "#收藏"] },
    };
  }

  // Default → Skill + XHS
  return {
    trendKeyword: kw,
    strategy: "skill",
    reasoning: "通用话题→Skill+XHS",
    skill: { template: kw, estimatedRevenue: Math.floor(trend.heatScore * 2) },
    xhsPost: { angle: `${kw}神器推荐`, hashtags: [`#${kw}`, "#RedSkill"] },
  };
}

function mapToWenku(kw: string, opts: { category?: WenkuCategory; subject?: string }) {
  const cat = opts.category || "ebook";
  const subject = opts.subject || kw;
  const basePrice = { "exam-postgrad": 19.9, "exam-civil": 19.9, "exam-cert": 14.9, "k12-tutoring": 9.9, professional: 14.9, report: 9.9, recipe: 6.9, lifestyle: 6.9, ebook: 19.9, manual: 14.9 }[cat] || 9.9;
  return { category: cat, subject, estimatedRevenue: Math.floor(Math.random() * 500) + 50 };
}

/**
 * 生成跨平台协同动作
 */
function generateSynergyActions(decisions: PlatformDecision[]): string[] {
  const actions: string[] = [];

  const wenkuCount = decisions.filter(d => d.wenku).length;
  const skillCount = decisions.filter(d => d.skill).length;

  if (wenkuCount > 0 && skillCount > 0) {
    actions.push(`📚 文库文档描述中嵌入XHS帖子链接 → ${wenkuCount}个文档互相导流`);
  }

  if (skillCount > 0) {
    actions.push(`🛍️ XHS店铺商品描述推荐文库资料 → 交叉销售`);
  }

  const topTrends = decisions.slice(0, 3).map(d => d.trendKeyword);
  actions.push(`🎯 优先投放: ${topTrends.join("、")}`);
  actions.push(`📊 每周运行 rfs trending 更新趋势和产品`);
  actions.push(`🔗 文库文档底部统一放: "更多资料→小红书搜RedSkill"`);

  return actions;
}

/**
 * 获取文库表现数据反馈（从历史下载数据中学习）
 */
export function getWenkuPerformance(): Record<string, { downloads: number; revenue: number }> {
  const wenkuDir = resolve(process.cwd(), ".wenku");
  if (!existsSync(wenkuDir)) return {};

  const result: Record<string, { downloads: number; revenue: number }> = {};
  // Simulated - in production this reads real download data
  return result;
}
