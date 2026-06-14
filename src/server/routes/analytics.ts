/**
 * Analytics API — 收入与销售数据分析
 *
 * 提供实时的技能销售数据、收入趋势和转化率，
 * 帮助创作者做出更好的定价和营销决策。
 */
import { Router } from "express";
import { resolve } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { loadSkill, loadSkillsFromDir } from "../../core/skill-loader.js";
import { findSkillFiles } from "../../shared/fs.js";

export const analyticsRouter = Router();

const ORDERS_DIR = resolve(process.cwd(), ".orders");
const TEMPLATES_DIR = resolve(process.cwd(), "templates");
const SKILLS_DIR = resolve(process.cwd(), "skills");

interface OrderRecord {
  orderId: string;
  skillName: string;
  buyerId: string;
  price: { amount: number; currency: string };
  purchasedAt: string;
}

function loadAllOrders(): OrderRecord[] {
  if (!existsSync(ORDERS_DIR)) return [];
  try {
    return readdirSync(ORDERS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(resolve(ORDERS_DIR, f), "utf-8")) as OrderRecord);
  } catch {
    return [];
  }
}

function getAllSkillNames(): Set<string> {
  const names = new Set<string>();
  // Templates
  if (existsSync(TEMPLATES_DIR)) {
    for (const cat of readdirSync(TEMPLATES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const f of findSkillFiles(resolve(TEMPLATES_DIR, cat.name))) {
        const r = loadSkill(f);
        if (r.success && r.skill) names.add(r.skill.meta.name);
      }
    }
  }
  // User skills
  if (existsSync(SKILLS_DIR)) {
    for (const f of findSkillFiles(SKILLS_DIR)) {
      const r = loadSkill(f);
      if (r.success && r.skill) names.add(r.skill.meta.name);
    }
  }
  return names;
}

/**
 * GET /api/v1/analytics/revenue — 收入概览
 */
analyticsRouter.get("/revenue", (_req, res) => {
  const orders = loadAllOrders();

  // Total revenue
  const totalRevenue = orders.reduce((sum, o) => sum + (o.price?.amount ?? 0), 0);

  // Revenue by skill
  const bySkill: Record<string, { sales: number; revenue: number }> = {};
  for (const o of orders) {
    if (!bySkill[o.skillName]) bySkill[o.skillName] = { sales: 0, revenue: 0 };
    bySkill[o.skillName]!.sales++;
    bySkill[o.skillName]!.revenue += o.price?.amount ?? 0;
  }

  // Daily revenue (last 7 days)
  const dailyRevenue: Record<string, number> = {};
  for (const o of orders) {
    const day = o.purchasedAt.slice(0, 10);
    dailyRevenue[day] = (dailyRevenue[day] ?? 0) + (o.price?.amount ?? 0);
  }

  // Top skills
  const topSkills = Object.entries(bySkill)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  // Active skills (listed in store)
  const activeSkillCount = getAllSkillNames().size;

  res.json({
    totalRevenue,
    totalOrders: orders.length,
    activeSkills: activeSkillCount,
    averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length * 100) / 100 : 0,
    topSkills,
    dailyRevenue,
  });
});

/**
 * GET /api/v1/analytics/skills/:name — 单个技能分析
 */
analyticsRouter.get("/skills/:name", (req, res) => {
  const { name } = req.params;
  const orders = loadAllOrders().filter((o) => o.skillName === name);

  if (orders.length === 0) {
    res.json({ skillName: name, totalSales: 0, totalRevenue: 0, buyers: [], message: "暂无销售数据" });
    return;
  }

  const revenue = orders.reduce((sum, o) => sum + (o.price?.amount ?? 0), 0);
  const uniqueBuyers = [...new Set(orders.map((o) => o.buyerId))];

  // Sales trend by day
  const byDay: Record<string, number> = {};
  for (const o of orders) {
    const day = o.purchasedAt.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }

  res.json({
    skillName: name,
    totalSales: orders.length,
    totalRevenue: revenue,
    uniqueBuyers: uniqueBuyers.length,
    salesByDay: byDay,
    firstSale: orders[0]?.purchasedAt ?? null,
    lastSale: orders[orders.length - 1]?.purchasedAt ?? null,
  });
});

/**
 * GET /api/v1/analytics/ranking — 畅销排行
 */
analyticsRouter.get("/ranking", (_req, res) => {
  const orders = loadAllOrders();
  const bySkill: Record<string, { sales: number; revenue: number }> = {};

  for (const o of orders) {
    if (!bySkill[o.skillName]) bySkill[o.skillName] = { sales: 0, revenue: 0 };
    bySkill[o.skillName]!.sales++;
    bySkill[o.skillName]!.revenue += o.price?.amount ?? 0;
  }

  const ranking = Object.entries(bySkill)
    .map(([name, data], i) => ({ rank: i + 1, name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // Fill in unsold skills
  const allNames = getAllSkillNames();
  for (const name of allNames) {
    if (!bySkill[name]) {
      ranking.push({ rank: ranking.length + 1, name, sales: 0, revenue: 0 });
    }
  }

  res.json({ ranking });
});
