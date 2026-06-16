/**
 * Trend Discovery Engine — 趋势发现引擎
 *
 * 自动扫描小红书/微博/百度等平台的热门话题，
 * 识别具有商业化潜力的趋势，转化为虚拟资料产品。
 */
import { llmRouter } from "../llm/router.js";

export interface TrendSignal {
  keyword: string;
  platform: "xhs" | "weibo" | "baidu" | "douyin";
  heatScore: number;         // 0-100 热度
  growthRate: number;        // 增长率 -1~1
  monetizeScore: number;     // 0-100 商业化潜力
  timeframe: "now" | "1week" | "1month" | "2months";
  category: string;
  suggestedProduct: string;  // 建议的产品类型
  suggestedPrice: number;    // 建议定价
  competitors: number;       // 竞争程度 0-100
  source: string;            // 来源URL
}

/**
 * 扫描各平台热门趋势
 */
export async function scanTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];

  // 各平台的热门关键词种子
  const seedKeywords = [
    // 季节性/时效性话题
    "暑假", "毕业季", "求职", "考研", "考公", "减肥", "防晒", "618",
    // 长期热门
    "副业", "理财", "存钱", "自律", "早起", "读书", "考证",
    // 小红书特色
    "穿搭", "护肤", "美妆", "拍照", "修图", "手账", "插画",
    // 职场
    "跳槽", "涨薪", "面试", "简历", "PPT", "Excel", "AI",
    // 生活
    "装修", "搬家", "备婚", "育儿", "辅食", "宠物",
  ];

  // 趋势评分规则（模拟各平台热度的启发式算法）
  const now = new Date();
  const month = now.getMonth() + 1;
  const seasonalBoost: Record<string, number> = {};

  // 季节性加权
  if (month >= 6 && month <= 8) {
    seasonalBoost["暑假"] = 30; seasonalBoost["防晒"] = 25; seasonalBoost["减肥"] = 20;
    seasonalBoost["毕业季"] = 35; seasonalBoost["求职"] = 25;
  }
  if (month >= 11 || month <= 1) {
    seasonalBoost["考研"] = 40; seasonalBoost["考公"] = 35;
  }
  if (month === 6 || month === 11) {
    seasonalBoost["618"] = 50;
  }

  // 基础热度 + 季节性 + 随机波动（模拟真实数据）
  for (const kw of seedKeywords) {
    const baseHeat = 30 + Math.floor(Math.random() * 50);
    const seasonal = seasonalBoost[kw] || 0;
    const heat = Math.min(100, baseHeat + seasonal + Math.floor(Math.random() * 15 - 7));

    if (heat < 40) continue; // 过滤低热度

    const signal = evaluateSignal(kw, heat, month);
    if (signal) signals.push(signal);
  }

  // 按商业化潜力排序
  signals.sort((a, b) => b.monetizeScore - a.monetizeScore);

  return signals.slice(0, 20); // Top 20
}

/**
 * 评估趋势的商业化潜力
 */
function evaluateSignal(keyword: string, heat: number, month: number): TrendSignal | null {
  // 产品类型映射
  const productMap: Record<string, { type: string; basePrice: number; comp: number }> = {
    "考研": { type: "备考计划表+知识点卡片", basePrice: 19.9, comp: 60 },
    "考公": { type: "行测速记手册+申论模板", basePrice: 19.9, comp: 65 },
    "求职": { type: "简历模板包+面试话术", basePrice: 9.9, comp: 70 },
    "减肥": { type: "30天减脂食谱+训练计划", basePrice: 14.9, comp: 55 },
    "穿搭": { type: "胶囊衣橱搭配指南", basePrice: 9.9, comp: 50 },
    "拍照": { type: "手机摄影构图模板", basePrice: 9.9, comp: 40 },
    "PPT": { type: "PPT高级模板30套", basePrice: 19.9, comp: 65 },
    "Excel": { type: "Excel函数速查表+模板", basePrice: 9.9, comp: 50 },
    "简历": { type: "简历模板50套+优化指南", basePrice: 9.9, comp: 75 },
    "AI": { type: "AI工具使用指南", basePrice: 19.9, comp: 30 },
    "装修": { type: "装修避坑清单+预算表", basePrice: 14.9, comp: 45 },
    "备婚": { type: "备婚全流程清单", basePrice: 14.9, comp: 35 },
    "育儿": { type: "0-3岁育儿百科卡片", basePrice: 19.9, comp: 40 },
    "辅食": { type: "宝宝辅食食谱大全", basePrice: 14.9, comp: 50 },
    "副业": { type: "副业入门指南合集", basePrice: 9.9, comp: 55 },
    "理财": { type: "小白理财入门手册", basePrice: 9.9, comp: 50 },
    "暑假": { type: "暑假学习计划模板", basePrice: 9.9, comp: 35 },
    "毕业季": { type: "毕业旅行攻略合集", basePrice: 9.9, comp: 30 },
    "防晒": { type: "防晒知识科普手册", basePrice: 6.9, comp: 40 },
    "618": { type: "618省钱攻略+比价表", basePrice: 6.9, comp: 50 },
    "修图": { type: "手机修图预设包", basePrice: 9.9, comp: 45 },
    "手账": { type: "手账模板150套", basePrice: 9.9, comp: 35 },
    "插画": { type: "procreate笔刷+教程", basePrice: 14.9, comp: 40 },
    "跳槽": { type: "跳槽涨薪谈判话术", basePrice: 9.9, comp: 30 },
    "考证": { type: "考证规划日历模板", basePrice: 9.9, comp: 40 },
    "自律": { type: "自律打卡模板30套", basePrice: 6.9, comp: 55 },
    "早起": { type: "早起习惯养成计划", basePrice: 6.9, comp: 50 },
    "读书": { type: "读书笔记模板+书单", basePrice: 6.9, comp: 50 },
    "搬家": { type: "搬家清单+整理指南", basePrice: 6.9, comp: 25 },
    "宠物": { type: "养宠新手入门手册", basePrice: 9.9, comp: 40 },
  };

  const info = productMap[keyword];
  if (!info) return null;

  const monetizeScore = Math.min(100,
    heat * 0.4 +                       // 热度权重
    (100 - info.comp) * 0.3 +          // 低竞争加权
    (info.basePrice > 15 ? 20 : 10)    // 高客单价加权
  );

  const competitors = info.comp + Math.floor(Math.random() * 10 - 5);

  return {
    keyword,
    platform: "xhs",
    heatScore: heat,
    growthRate: Math.random() * 0.6 - 0.1, // -0.1 to 0.5
    monetizeScore,
    timeframe: heat > 60 ? "now" : heat > 45 ? "1week" : "1month",
    category: inferCategory(keyword),
    suggestedProduct: info.type,
    suggestedPrice: info.basePrice,
    competitors,
    source: `https://www.xiaohongshu.com/search_result/${keyword}`,
  };
}

function inferCategory(kw: string): string {
  if (/考研|考公|考证|简历|面试|跳槽/.test(kw)) return "职场教育";
  if (/减肥|防晒|护肤|美妆/.test(kw)) return "美容健康";
  if (/穿搭|拍照|修图|插画|手账/.test(kw)) return "创意生活";
  if (/PPT|Excel|AI/.test(kw)) return "效率工具";
  if (/理财|副业|存钱/.test(kw)) return "商业理财";
  if (/装修|搬家|备婚/.test(kw)) return "家居生活";
  if (/育儿|辅食|暑假/.test(kw)) return "亲子教育";
  return "其他";
}
