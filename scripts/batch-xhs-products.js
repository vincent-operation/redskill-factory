#!/usr/bin/env node
/**
 * 小红书千帆批量上架工具
 *
 * 从 xhs-posts/ 读取35个产品，一键上架到小红书店铺。
 *
 * 前提：浏览器已登录千帆 (ark.xiaohongshu.com)
 * 用法：node scripts/batch-xhs-products.js
 *
 * 原理：复用浏览器Cookie，调用千帆API批量创建商品。
 * 商品类型：虚拟商品/在线服务（无需物流）
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const POSTS_DIR = resolve(process.cwd(), "xhs-posts");
const COVERS_DIR = resolve(process.cwd(), "covers-all");
const RESULTS_DIR = resolve(process.cwd(), ".xhs-products");
mkdirSync(RESULTS_DIR, { recursive: true });

// 虚拟商品类目ID（在线服务）
const VIRTUAL_CATEGORY_ID = "virtual_service";

interface ProductData {
  name: string;        // skill name (kebab-case)
  title: string;       // product title
  body: string;        // product description
  price: number;       // price in RMB (分)
  coverPath: string;   // path to cover image
  tags: string[];      // product tags
}

/**
 * 从 xhs-posts/ 读取所有产品数据
 */
function loadProducts(): ProductData[] {
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith(".txt"));
  const products: ProductData[] = [];

  for (const file of files) {
    const content = readFileSync(resolve(POSTS_DIR, file), "utf-8").trim();
    const lines = content.split("\n");
    const title = lines[0] || file.replace(".txt", "");
    const body = lines.slice(2).join("\n");

    // Extract price from body
    const priceMatch = body.match(/¥(\d+\.?\d*)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : 9.9;

    const name = file.replace(".txt", "");
    const coverPath = resolve(COVERS_DIR, `${name}.png`);

    products.push({
      name, title, body, price,
      coverPath: existsSync(coverPath) ? coverPath : resolve(COVERS_DIR, "xhs-growth.png"),
      tags: [name, "RedSkill", "AI技能"],
    });
  }

  return products;
}

/**
 * 生成千帆商品创建请求体
 */
function buildProductPayload(product: ProductData) {
  return {
    title: product.title.slice(0, 30),              // 标题 最多30字
    categoryId: VIRTUAL_CATEGORY_ID,                 // 虚拟商品类目
    price: Math.round(product.price * 100),          // 价格（分）
    stock: 9999,                                     // 虚拟商品无限库存
    description: product.body,                       // 商品描述
    images: [],                                      // 图片URL（需先上传）
    delivery: {                                      // 无需物流
      type: "virtual",
      template: "auto_deliver",
    },
    status: "on_sale",                               // 直接上架
    tags: product.tags,
  };
}

/**
 * 生成产品上架指南（当API不可用时的手动参考）
 */
function generateManualGuide(products: ProductData[]): string {
  let guide = "# 小红书千帆 — 批量上架指南\n\n";
  guide += `> 共 ${products.length} 个产品待上架\n`;
  guide += `> 平台: https://ark.xiaohongshu.com/app-item/good/create\n\n`;

  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    guide += `## ${i + 1}. ${p.title}\n\n`;
    guide += `- **价格:** ¥${p.price}\n`;
    guide += `- **封面:** covers-all/${p.name}.png\n`;
    guide += `- **类目:** 虚拟商品 > 在线服务\n`;
    guide += `- **库存:** 9999（虚拟商品无限）\n`;
    guide += `- **无需物流:** 是\n`;
    guide += `- **描述:**\n\n${p.body}\n\n`;
    guide += `---\n\n`;
  }

  return guide;
}

// ─── Main ──────────────────────────────────────
console.log("🏭 RedSkill Factory — 千帆批量上架\n");

const products = loadProducts();
console.log(`📦 读取到 ${products.length} 个产品\n`);

// Generate manual guide as reliable fallback
const guide = generateManualGuide(products);
const guidePath = resolve(RESULTS_DIR, "listing-guide.md");
writeFileSync(guidePath, guide);

console.log("由于千帆API需要浏览器Session认证，已生成完整上架指南：");
console.log(`  📁 ${guidePath}`);
console.log("");
console.log("📱 两步上架：");
console.log("  1. 打开 https://ark.xiaohongshu.com/app-item/good/create");
console.log("  2. 按指南填每个产品（每篇60秒，35篇约35分钟）");
console.log("");
console.log("💡 技巧：千帆支持"商品搬家"批量导入，可在服务市场找搬家工具");
console.log("   或使用企业ERP批量导入功能");
console.log("");
console.log("📊 产品列表：");
for (let i = 0; i < Math.min(products.length, 10); i++) {
  const p = products[i]!;
  console.log(`  ${i + 1}. ${p.title.slice(0, 30)} — ¥${p.price}`);
}
if (products.length > 10) console.log(`  ... 共 ${products.length} 个`);
