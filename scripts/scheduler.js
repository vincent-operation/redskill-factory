#!/usr/bin/env node
/**
 * Autonomous Scheduler — 自主运营调度器
 *
 * 每小时检查系统健康，每天生成日报和优化建议。
 * 实现递归迭代升级：分析→优化→执行→验证→再分析
 *
 * 运行: node scripts/scheduler.js
 * 后台运行: node scripts/scheduler.js --daemon
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPORTS_DIR = resolve(process.cwd(), ".reports");
const STATE_FILE = resolve(REPORTS_DIR, "scheduler-state.json");
const DAEMON = process.argv.includes("--daemon");

mkdirSync(REPORTS_DIR, { recursive: true });

// ─── State Management ──────────────────────────

function loadState() {
  if (!existsSync(STATE_FILE)) return { startTime: new Date().toISOString(), runs: 0, lastReport: null, version: 1 };
  return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Health Check ──────────────────────────────

async function healthCheck() {
  const status = { time: new Date().toISOString(), server: false, tunnel: false };
  try {
    const res = await fetch("http://127.0.0.1:3001/api/v1/health");
    status.server = res.status === 200;
    if (status.server) {
      const d = await res.json();
      status.llm = d.llmProviders;
    }
  } catch {}
  return status;
}

// ─── Revenue Pulse ─────────────────────────────

async function revenuePulse() {
  try {
    const res = await fetch("http://127.0.0.1:3001/api/v1/seller/@redskill/earnings");
    if (res.status === 200) return await res.json();
  } catch {}
  return null;
}

// ─── Main Loop ─────────────────────────────────

async function run() {
  const state = loadState();
  state.runs++;
  saveState(state);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const hour = now.getHours();

  console.log(`\n[${now.toLocaleTimeString("zh-CN")}] 调度器运行 #${state.runs}`);

  // Health check
  const health = await healthCheck();
  console.log(`  🟢 服务器: ${health.server ? "在线" : "离线"}`);

  // Revenue pulse
  const pulse = await revenuePulse();
  if (pulse) {
    console.log(`  💰 累计收入: ¥${pulse.totalRevenue || 0} | 订单: ${pulse.totalOrders || 0}`);
  }

  // Daily report generation (at 23:00)
  if (hour === 23 && state.lastReport !== today) {
    console.log("\n📊 生成每日日报...");
    try {
      // Dynamic import the daily report module
      await import("./daily-report.js");
      state.lastReport = today;
      saveState(state);
    } catch (e) {
      console.error("日报生成失败:", e.message);
    }
  }

  // Morning optimization (at 08:00)
  if (hour === 8 && state.lastOptimize !== today) {
    console.log("\n🤖 运行自主优化...");
    try {
      await import("./auto-optimize.js");
      state.lastOptimize = today;
      state.version++;
      saveState(state);
      console.log(`  📈 系统版本升级至 v${state.version}`);
    } catch (e) {
      console.error("优化失败:", e.message);
    }
  }

  // Hourly status summary
  if (pulse && pulse.totalRevenue > 0) {
    const roi = state.runs > 0 ? Math.round(pulse.totalRevenue / (state.runs * 0.01 * 7.2)) : 0;
    console.log(`  🎯 累计ROI: ${roi}x | 目标: 10,000x | 达成: ${(roi/10000*100).toFixed(2)}%`);
  }

  return state;
}

// ─── Entry Point ───────────────────────────────

if (DAEMON) {
  console.log("🤖 RedSkill Factory 自主运营系统启动");
  console.log("═══════════════════════════════════");
  console.log("  每小时: 健康检查 + 收入脉冲");
  console.log("  每天08:00: 自主优化");
  console.log("  每天23:00: 日报生成");
  console.log("═══════════════════════════════════\n");

  // Run immediately once
  run().catch(console.error);

  // Then every hour
  setInterval(() => run().catch(console.error), 60 * 60 * 1000);
} else {
  // Single run
  run().then(state => {
    console.log(`\n✅ 调度器完成。版本 v${state.version}, 累计运行 ${state.runs} 次`);
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
