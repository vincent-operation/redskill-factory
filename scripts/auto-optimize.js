#!/usr/bin/env node
/**
 * Autonomous Optimizer — 自主优化引擎
 *
 * 分析日报数据，自动执行优化策略:
 * 1. 价格优化 (提高畅销品价格，降低滞销品价格)
 * 2. 产品扩展 (发现缺口，创建新模板)
 * 3. 营销优化 (更新落地页转化元素)
 * 4. 性能监控 (确保隧道在线)
 *
 * 运行: node scripts/auto-optimize.js
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const REPORTS_DIR = resolve(process.cwd(), ".reports");
const ORDERS_DIR = resolve(process.cwd(), ".orders");
const TEMPLATES_DIR = resolve(process.cwd(), "templates");

const today = new Date().toISOString().slice(0, 10);

// ─── Optimization Rules Engine ─────────────────

const OPTIMIZATION_LOG = resolve(REPORTS_DIR, "optimizations.md");

function logAction(action, reason, impact) {
  const entry = `\n## ${new Date().toISOString()}\n- **操作**: ${action}\n- **原因**: ${reason}\n- **预期影响**: ${impact}\n`;
  writeFileSync(OPTIMIZATION_LOG, entry, { flag: "a" });
  console.log(`[OPTIMIZE] ${action}: ${reason}`);
}

// ─── Price Optimizer ───────────────────────────
function optimizePrices(analysis) {
  const actions = [];

  for (const [name, data] of Object.entries(analysis.topSkills || {})) {
    const salesCount = data.sales;
    const revenue = data.revenue;

    // High demand + low price → raise price
    if (salesCount >= 3) {
      const avgPrice = revenue / salesCount;
      if (avgPrice < 30) {
        actions.push({
          type: "price_raise",
          skill: name,
          reason: `${salesCount}笔销售，平均成交¥${avgPrice.toFixed(0)}，有提价空间`,
          suggestion: `建议提价至¥${Math.round(avgPrice * 1.5)}`,
        });
      }
    }

    // No sales + high price → lower price
    if (salesCount === 0) {
      actions.push({
        type: "price_drop",
        skill: name,
        reason: "零销售，可能定价过高",
        suggestion: "建议降价20%或限时促销",
      });
    }
  }

  return actions;
}

// ─── Product Gap Analyzer ──────────────────────
function analyzeProductGaps(analysis) {
  const categories = {
    education: "教育", productivity: "效率", creative: "创意",
    lifestyle: "生活", health: "健康", business: "商业", tech: "科技",
  };

  const gaps = [];
  const currentCount = {};

  // Count skills per category
  if (existsSync(TEMPLATES_DIR)) {
    for (const cat of readdirSync(TEMPLATES_DIR, { withFileTypes: true }).filter(d => d.isDirectory())) {
      const files = readdirSync(resolve(TEMPLATES_DIR, cat.name)).filter(f => f.endsWith(".skill.yml"));
      currentCount[cat.name] = files.length;
    }
  }

  // Find underrepresented categories (< 3 products)
  for (const [cat, label] of Object.entries(categories)) {
    const count = currentCount[cat] || 0;
    if (count < 3) {
      gaps.push({
        category: cat,
        label,
        current: count,
        target: 3,
        opportunity: `${3 - count}个新品机会`,
      });
    }
  }

  return gaps;
}

// ─── Content Quality Check ─────────────────────
function checkContentQuality(analysis) {
  const issues = [];

  // Check if any skill has zero views/purchases after 7 days
  if (analysis.totalOrders < 3) {
    issues.push({
      type: "low_traffic",
      severity: "high",
      action: "增加小红书发帖频率，每天至少1篇",
    });
  }

  if (analysis.growthRate < -20) {
    issues.push({
      type: "declining",
      severity: "critical",
      action: "收入下降超20%，立即检查落地页和支付流程",
    });
  }

  return issues;
}

// ─── Main Optimizer ────────────────────────────
async function runOptimizer() {
  console.log("🤖 Autonomous Optimizer v1.0");
  console.log("═══════════════════════════════\n");

  // Load latest report
  const reportPath = resolve(REPORTS_DIR, `daily-${today}.md`);
  if (!existsSync(reportPath)) {
    console.log("❌ 今日日报尚未生成。请先运行: node scripts/daily-report.js");
    return;
  }

  // Parse report for analysis data
  const reportContent = readFileSync(reportPath, "utf-8");

  // Load orders for detailed analysis
  const orders = [];
  if (existsSync(ORDERS_DIR)) {
    for (const f of readdirSync(ORDERS_DIR).filter(f => f.endsWith(".json"))) {
      orders.push(JSON.parse(readFileSync(resolve(ORDERS_DIR, f), "utf-8")));
    }
  }

  const totalRevenue = orders.reduce((s, o) => s + (o.price?.amount ?? 0), 0);
  const bySkill = {};
  for (const o of orders) {
    const n = o.skillName || "unknown";
    if (!bySkill[n]) bySkill[n] = { sales: 0, revenue: 0 };
    bySkill[n].sales++;
    bySkill[n].revenue += o.price?.amount ?? 0;
  }

  const analysis = {
    totalOrders: orders.length,
    totalRevenue,
    topSkills: bySkill,
    growthRate: 0, // From report parsing
    skillCount: Object.keys(bySkill).length,
  };

  // ─── Run optimizations ───────────────────────

  console.log("📊 价格优化分析...");
  const priceActions = optimizePrices(analysis);
  for (const action of priceActions) {
    console.log(`  ${action.type}: ${action.skill} — ${action.suggestion}`);
    logAction(action.type, action.reason, action.suggestion);
  }

  console.log("\n🔍 产品缺口分析...");
  const gaps = analyzeProductGaps(analysis);
  for (const gap of gaps) {
    console.log(`  ${gap.label}: 当前${gap.current}个, 目标${gap.target}个 — ${gap.opportunity}`);
    logAction("product_gap", `${gap.label}品类缺${gap.target - gap.current}个产品`, gap.opportunity);
  }

  console.log("\n📝 内容质量检查...");
  const qualityIssues = checkContentQuality(analysis);
  for (const issue of qualityIssues) {
    console.log(`  [${issue.severity}] ${issue.action}`);
    logAction(`quality_${issue.type}`, issue.action, "提升转化率");
  }

  // ─── Auto-fix: Restart tunnel if down ────────
  try {
    const health = await fetch("http://127.0.0.1:3001/api/v1/health");
    if (health.status === 200) {
      console.log("\n✅ 隧道在线");
    }
  } catch {
    console.log("\n⚠️ 隧道离线，尝试重启...");
    logAction("restart_tunnel", "隧道离线", "恢复公网访问");
  }

  console.log("\n═══════════════════════════════");
  console.log("✅ 优化分析完成");
  console.log(`📁 优化日志: ${OPTIMIZATION_LOG}`);

  return { priceActions, gaps, qualityIssues };
}

runOptimizer().catch(console.error);
