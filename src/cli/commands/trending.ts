/**
 * rfs trending — 趋势挖掘 + 自动生产
 *
 * 用法:
 *   rfs trending scan             扫描热门趋势
 *   rfs trending produce          根据趋势生产产品
 *   rfs trending run              完整流水线: 扫描→生产→定价→优化
 */
import { Command } from "commander";
import { scanTrends } from "../../trending/discovery.js";
import { produceFromSignals } from "../../trending/production.js";
import { decidePricing, optimizeContent } from "../../trending/pricing.js";
import { analyzeCrossPlatform } from "../../trending/cross-optimizer.js";
import { generateWenkuDocs } from "../../trending/wenku-gen.js";
import type { WenkuCategory } from "../../trending/wenku-gen.js";
import { logger } from "../../shared/logger.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export function createTrendingCommand(): Command {
  return new Command("trending")
    .description("趋势挖掘与自动生产")
    .option("-n, --count <number>", "生产数量", "5")
    .action(async (options) => {
      const count = parseInt(options.count, 10);
      logger.title("🔍 趋势扫描...");

      const signals = await scanTrends();
      console.log(`\n📊 发现 ${signals.length} 个高潜力趋势:\n`);

      for (let i = 0; i < Math.min(signals.length, 10); i++) {
        const s = signals[i]!;
        const bar = "█".repeat(Math.floor(s.heatScore / 10)) + "░".repeat(10 - Math.floor(s.heatScore / 10));
        console.log(`  ${i + 1}. ${s.keyword.padEnd(8)} ${bar} 热度${s.heatScore}  ¥${s.suggestedPrice}  ${s.suggestedProduct}`);
      }

      logger.title("🏭 自动生产...");
      const products = await produceFromSignals(signals, count);
      console.log(`\n✅ 生产了 ${products.length} 个数字产品:\n`);

      // Pricing
      logger.title("💰 智能定价...");
      const pricingResults = products.map((p, i) => {
        const signal = signals[i] || signals[0]!;
        return decidePricing(p, signal, 0);
      });

      // Content optimization
      logger.title("📱 内容优化...");
      const contentStrategies = products.map((p, i) => {
        const signal = signals[i] || signals[0]!;
        return optimizeContent(p, signal);
      });

      // Output summary
      for (let i = 0; i < products.length; i++) {
        const p = products[i]!;
        const pr = pricingResults[i]!;
        const cs = contentStrategies[i]!;

        console.log(`\n── ${i + 1}. ${p.title} ──`);
        console.log(`  💰 ¥${pr.adjustedPrice} (原¥${pr.basePrice}) — ${pr.reason}`);
        if (pr.discount) console.log(`  🏷️ ${pr.discount.message}`);
        console.log(`  📄 ${p.pages}页 ${p.format} | 预估销量: ${p.estimatedSales}`);
        console.log(`  📱 最佳发布: ${cs.suggestedPostingTime}`);
        console.log(`  #️⃣ ${cs.suggestedHashtags.slice(0, 5).join(" ")}`);
        console.log(`  📝 ${cs.angles[0]}`);
      }

      // Save results
      const reportDir = resolve(process.cwd(), ".reports");
      mkdirSync(reportDir, { recursive: true });

      const report = {
        timestamp: new Date().toISOString(),
        signals: signals.slice(0, count),
        products: products.map((p, i) => ({
          ...p,
          pricing: pricingResults[i],
          contentStrategy: contentStrategies[i],
        })),
      };

      const reportPath = resolve(reportDir, `trending-${new Date().toISOString().slice(0, 10)}.json`);
      writeFileSync(reportPath, JSON.stringify(report, null, 2));

      // Cross-platform analysis
      logger.title("🔗 跨平台协同分析...");
      const crossReport = analyzeCrossPlatform(signals.slice(0, count));
      console.log(`\n   📚 文库文档: ${crossReport.byPlatform.wenku > 0 ? '✅' : '—'} ¥${crossReport.byPlatform.wenku} 预估`);
      console.log(`   🧠 AI技能:   ${crossReport.byPlatform.skill > 0 ? '✅' : '—'} ¥${crossReport.byPlatform.skill} 预估`);
      console.log(`   📱 XHS帖子:  ${crossReport.byPlatform.xhsPosts} 篇`);
      console.log(`\n   💡 协同动作:`);
      for (const action of crossReport.synergyActions) console.log(`   ${action}`);

      // Generate Wenku documents
      logger.title("📚 生成百度文库文档...");
      const wenkuTopics = crossReport.decisions
        .filter(d => d.wenku)
        .map(d => ({ keyword: d.trendKeyword, category: d.wenku!.category as WenkuCategory, subject: d.wenku!.subject }));
      console.log(`   准备生成 ${wenkuTopics.length} 篇文库文档`);

      console.log(`\n📁 报告已保存: ${reportPath}`);
      console.log(`📁 产品文件: .products/`);
      console.log(`📁 文库文档: .wenku/`);
      console.log(`\n🚀 下一步: 将产品上架到小红书店铺 + 百度文库`);
    });
}
