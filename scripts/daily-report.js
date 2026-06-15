#!/usr/bin/env node
/**
 * 每日运营日报 — RedSkill Factory Autonomous Ops
 *
 * 自动采集收入、订单、技能表现、隧道状态，生成日报。
 * 运行: node scripts/daily-report.js
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const REPORTS_DIR = resolve(process.cwd(), ".reports");
const ORDERS_DIR = resolve(process.cwd(), ".orders");
const SELLERS_DIR = resolve(process.cwd(), ".sellers");
const TEMPLATES_DIR = resolve(process.cwd(), "templates");
const SKILLS_DIR = resolve(process.cwd(), "skills");

mkdirSync(REPORTS_DIR, { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

// ─── Data Collection ───────────────────────────

function loadOrders() {
  if (!existsSync(ORDERS_DIR)) return [];
  return readdirSync(ORDERS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(readFileSync(resolve(ORDERS_DIR, f), "utf-8")));
}

function loadSellers() {
  if (!existsSync(SELLERS_DIR)) return [];
  return readdirSync(SELLERS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(readFileSync(resolve(SELLERS_DIR, f), "utf-8")));
}

function countSkills() {
  let count = 0;
  if (existsSync(TEMPLATES_DIR)) {
    for (const cat of readdirSync(TEMPLATES_DIR, { withFileTypes: true }).filter(d => d.isDirectory())) {
      const files = readdirSync(resolve(TEMPLATES_DIR, cat.name)).filter(f => f.endsWith(".skill.yml"));
      count += files.length;
    }
  }
  if (existsSync(SKILLS_DIR)) {
    for (const d of readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory())) {
      if (existsSync(resolve(SKILLS_DIR, d.name, `${d.name}.skill.yml`))) count++;
    }
  }
  return count;
}

// ─── Analysis ──────────────────────────────────

function analyze(orders) {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.price?.amount ?? 0), 0);
  const todayOrders = orders.filter(o => (o.purchasedAt || "").startsWith(today));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.price?.amount ?? 0), 0);
  const yesterdayOrders = orders.filter(o => (o.purchasedAt || "").startsWith(yesterday));
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.price?.amount ?? 0), 0);

  // Revenue by skill
  const bySkill = {};
  for (const o of orders) {
    const name = o.skillName || "unknown";
    if (!bySkill[name]) bySkill[name] = { sales: 0, revenue: 0 };
    bySkill[name].sales++;
    bySkill[name].revenue += o.price?.amount ?? 0;
  }

  // Top performers
  const topSkills = Object.entries(bySkill)
    .sort(([,a], [,b]) => b.revenue - a.revenue)
    .slice(0, 5);

  // Revenue trend (last 7 days)
  const dailyRev = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dailyRev[d] = orders
      .filter(o => (o.purchasedAt || "").startsWith(d))
      .reduce((sum, o) => sum + (o.price?.amount ?? 0), 0);
  }

  const totalOrders = orders.length;
  const uniqueBuyers = new Set(orders.map(o => o.buyerId)).size;
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders * 100) / 100 : 0;

  // Growth rate
  const prevWeekRev = orders
    .filter(o => {
      const d = new Date(o.purchasedAt || 0);
      const weekAgo = Date.now() - 14 * 86400000;
      const dayAgo = Date.now() - 7 * 86400000;
      return d.getTime() > weekAgo && d.getTime() < dayAgo;
    })
    .reduce((sum, o) => sum + (o.price?.amount ?? 0), 0);

  const thisWeekRev = orders
    .filter(o => new Date(o.purchasedAt || 0).getTime() > Date.now() - 7 * 86400000)
    .reduce((sum, o) => sum + (o.price?.amount ?? 0), 0);

  const growthRate = prevWeekRev > 0
    ? Math.round((thisWeekRev - prevWeekRev) / prevWeekRev * 10000) / 100
    : thisWeekRev > 0 ? 100 : 0;

  return {
    totalRevenue, totalOrders, uniqueBuyers, aov,
    todayRevenue, todayOrders: todayOrders.length,
    yesterdayRevenue, yesterdayOrders: yesterdayOrders.length,
    topSkills, dailyRev, growthRate,
    skillCount: countSkills(),
    sellerCount: loadSellers().length,
  };
}

// ─── Tunnel Status ─────────────────────────────

async function checkTunnel() {
  try {
    const res = await fetch("http://127.0.0.1:3001/api/v1/health");
    if (res.status === 200) {
      const data = await res.json();
      return { online: true, uptime: data.uptime, llm: data.llmProviders };
    }
  } catch {}
  return { online: false };
}

// ─── Report Generation ─────────────────────────

async function generateReport() {
  const orders = loadOrders();
  const analysis = analyze(orders);
  const tunnel = await checkTunnel();
  const sellers = loadSellers();

  const tokenCost = 0.01; // USD per report (estimated)
  const usdToCny = 7.2;
  const tokenCostCny = tokenCost * usdToCny;
  const roiX = tokenCostCny > 0 ? Math.round(analysis.todayRevenue / tokenCostCny) : 0;
  const roiTarget = tokenCostCny * 10000;

  const report = [
    `═══════════════════════════════════════════`,
    `  📊 RedSkill Factory 日报`,
    `  📅 ${today}`,
    `═══════════════════════════════════════════`,
    ``,
    `## 💰 收入概览`,
    ``,
    `  今日收入:    ¥${analysis.todayRevenue.toLocaleString()}`,
    `  昨日收入:    ¥${analysis.yesterdayRevenue.toLocaleString()}`,
    `  本周收入:    ¥${analysis.todayRevenue.toLocaleString()}`,
    `  累计收入:    ¥${analysis.totalRevenue.toLocaleString()}`,
    `  总订单:      ${analysis.totalOrders}`,
    `  唯一买家:    ${analysis.uniqueBuyers}`,
    `  平均客单价:  ¥${analysis.aov}`,
    `  周增长率:    ${analysis.growthRate}%`,
    ``,
    `## 🏆 畅销排行`,
    ``,
    ...analysis.topSkills.map(([name, data], i) =>
      `  ${i+1}. ${name.padEnd(20)} ${String(data.sales).padStart(3)}单  ¥${data.revenue}`
    ),
    ``,
    `## 📈 7日收入趋势`,
    ``,
    ...Object.entries(analysis.dailyRev).map(([day, rev]) =>
      `  ${day}: ${'█'.repeat(Math.round(rev / 10))} ¥${rev}`
    ),
    ``,
    `## 🔧 系统状态`,
    ``,
    `  服务器:      ${tunnel.online ? '✅ 在线' : '❌ 离线'}`,
    `  LLM:         ${tunnel.llm?.join(', ') || 'N/A'}`,
    `  在线技能:    ${analysis.skillCount}`,
    `  注册卖家:    ${analysis.sellerCount}`,
    ``,
    `## 🎯 ROI 指标`,
    ``,
    `  Token成本:   ¥${tokenCostCny.toFixed(2)}`,
    `  今日ROI:     ${roiX}x`,
    `  目标ROI:     ${roiTarget.toLocaleString()}x (10,000x)`,
    `  达成率:      ${(roiX / 10000 * 100).toFixed(2)}%`,
    ``,
    `## 🤖 自主优化建议`,
    ``,
    ...generateRecommendations(analysis, orders),
    ``,
    `═══════════════════════════════════════════`,
    `  生成时间: ${new Date().toLocaleString("zh-CN")}`,
    `═══════════════════════════════════════════`,
  ].join("\n");

  // Save daily report
  const reportPath = resolve(REPORTS_DIR, `daily-${today}.md`);
  writeFileSync(reportPath, report);

  // Append to master log
  const logPath = resolve(REPORTS_DIR, "master-log.md");
  const logEntry = `\n## ${today}\n- 收入: ¥${analysis.todayRevenue} | 订单: ${analysis.todayOrders.length} | 增长率: ${analysis.growthRate}%\n`;
  writeFileSync(logPath, logEntry, { flag: "a" });

  console.log(report);
  console.log(`\n📁 报告已保存: ${reportPath}`);
  return { analysis, report, reportPath };
}

function generateRecommendations(analysis, orders) {
  const recs = [];

  if (analysis.todayRevenue === 0) {
    recs.push("  ⚠️ 今日无收入。建议：");
    recs.push("    1. 检查隧道是否在线");
    recs.push("    2. 在小红书发布更多帖子引流");
    recs.push("    3. 降低热门技能价格促销");
  }

  if (analysis.growthRate < 0) {
    recs.push("  📉 收入下降。需要分析原因并调整策略");
  }

  if (analysis.topSkills.length > 0 && analysis.topSkills[0][1].revenue === 0) {
    recs.push("  💡 尚无销售数据。建议优先推广低价技能(¥9.9-19.9)降低购买门槛");
  }

  if (analysis.skillCount < 20) {
    recs.push(`  📦 产品线(${analysis.skillCount}个)。建议扩展到20+个`);
  }

  // Check for stale skills
  const activeSkills = new Set(orders.map(o => o.skillName));
  if (activeSkills.size < analysis.skillCount * 0.3) {
    recs.push("  🔄 70%技能无销售。考虑淘汰或重新包装");
  }

  if (recs.length === 0) {
    recs.push("  ✅ 系统运行正常，继续保持！");
  }

  return recs;
}

// ─── Main ──────────────────────────────────────
generateReport().catch(console.error);
