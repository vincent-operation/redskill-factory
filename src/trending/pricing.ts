/**
 * Auto-Pricing & Optimizer — 自动定价 + 内容优化引擎
 *
 * 根据市场信号动态调整价格，A/B测试不同内容策略。
 */
import type { TrendSignal } from "./discovery.js";
import type { DigitalProduct } from "./production.js";

export interface PricingDecision {
  productId: string;
  basePrice: number;
  adjustedPrice: number;
  reason: string;
  discount?: { type: "limited" | "bundle" | "early"; amount: number; message: string };
}

export interface ContentStrategy {
  productId: string;
  angles: string[];       // 不同推广角度
  bestPerforming?: string; // 表现最好的角度
  suggestedHashtags: string[];
  suggestedPostingTime: string;
}

/**
 * 智能定价决策
 */
export function decidePricing(
  product: DigitalProduct,
  signal: TrendSignal,
  existingSales: number,
): PricingDecision {
  let adjustedPrice = product.price;

  // 高需求 + 低竞争 → 提价
  if (signal.heatScore > 70 && signal.competitors < 40) {
    adjustedPrice = Math.round(product.price * 1.3);
    return {
      productId: product.id, basePrice: product.price, adjustedPrice,
      reason: `热搜+低竞争(热度${signal.heatScore},竞争${signal.competitors})→溢价30%`,
    };
  }

  // 高竞争 → 降价 + 限时优惠
  if (signal.competitors > 65) {
    adjustedPrice = Math.round(product.price * 0.8);
    return {
      productId: product.id, basePrice: product.price, adjustedPrice,
      reason: `高竞争(${signal.competitors})→降价20%`,
      discount: { type: "limited", amount: Math.round(product.price * 0.3),
        message: `限时优惠！前100名仅需¥${adjustedPrice}` },
    };
  }

  // 新趋势 + 零销售 → 首发价
  if (existingSales === 0 && signal.heatScore > 50) {
    adjustedPrice = Math.round(product.price * 0.7);
    return {
      productId: product.id, basePrice: product.price, adjustedPrice,
      reason: "新品首发→7折促销",
      discount: { type: "early", amount: Math.round(product.price * 0.3),
        message: `新品首发！限时¥${adjustedPrice}` },
    };
  }

  // 捆绑建议（同品类多买折扣）
  return {
    productId: product.id, basePrice: product.price, adjustedPrice,
    reason: "标准定价",
    discount: { type: "bundle", amount: Math.round(product.price * 0.15),
      message: `同品类买2件享85折` },
  };
}

/**
 * 内容优化策略
 */
export function optimizeContent(product: DigitalProduct, signal: TrendSignal): ContentStrategy {
  const angles = generateAngles(signal.keyword, product.title);
  const hashtags = generateHashtags(signal.keyword, signal.category);

  // 小红书最佳发布时间
  const hour = new Date().getHours();
  const postingTimes: Record<string, string> = {
    morning: "07:30-08:30 (通勤时间)",
    noon: "12:00-13:00 (午休时间)",
    evening: "18:00-19:00 (下班通勤)",
    night: "21:00-22:00 (睡前刷手机)",
  };

  let bestTime = postingTimes.night;
  if (signal.category.includes("职场") || signal.category.includes("教育")) {
    bestTime = postingTimes.noon + " 或 " + postingTimes.evening;
  } else if (signal.category.includes("生活") || signal.category.includes("美")) {
    bestTime = postingTimes.night;
  }

  return {
    productId: product.id,
    angles,
    suggestedHashtags: hashtags.slice(0, 10),
    suggestedPostingTime: bestTime,
  };
}

function generateAngles(keyword: string, title: string): string[] {
  return [
    `${keyword}必看！这个资料包帮你省了XX元`,
    `做了${keyword}攻略，分享给大家`,
    `${keyword}新手避坑指南`,
    `限时分享 | ${title}`,
    `被问爆了的${keyword}资料`,
  ];
}

function generateHashtags(keyword: string, category: string): string[] {
  const base = ["#RedSkill", "#好物分享", "#实用资料"];
  const kw = [`#${keyword}`, `#${keyword}攻略`, `#${keyword}必备`];
  const cat: Record<string, string[]> = {
    "职场教育": ["#职场", "#学习", "#考试"],
    "美容健康": ["#健康", "#变美", "#护肤"],
    "创意生活": ["#创意", "#手作", "#日常"],
    "效率工具": ["#效率", "#工具", "#办公"],
    "商业理财": ["#理财", "#副业", "#搞钱"],
    "家居生活": ["#装修", "#家居", "#搬家"],
    "亲子教育": ["#育儿", "#亲子", "#宝宝"],
  };
  return [...kw, ...(cat[category] || []), ...base];
}
