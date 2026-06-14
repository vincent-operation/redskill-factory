/**
 * Skill Store API — 技能商店与购买
 *
 * 提供技能列表、购买、license 签发等变现核心功能。
 */
import { Router } from "express";
import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { loadSkill, loadSkillsFromDir } from "../../core/skill-loader.js";
import { generateLicense, generateLicenseFile } from "../../core/license.js";
import { findSkillFiles } from "../../shared/fs.js";
import { NotFoundError, ValidationError } from "../middleware/error-handler.js";

export const storeRouter = Router();

const SKILLS_DIR = resolve(process.cwd(), "skills");
const ORDERS_DIR = resolve(process.cwd(), ".orders");
const TEMPLATES_DIR = resolve(process.cwd(), "templates");

// Ensure orders directory
try { mkdirSync(ORDERS_DIR, { recursive: true }); } catch { /* exists */ }

/**
 * GET /api/v1/store — 商店首页，列出所有可购买技能
 */
storeRouter.get("/", (_req, res) => {
  const storeSkills: Record<string, unknown[]> = {};

  // 列出内置模板 (作为可购买商品)
  if (existsSync(TEMPLATES_DIR)) {
    const categories = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const cat of categories) {
      const catDir = resolve(TEMPLATES_DIR, cat.name);
      const files = findSkillFiles(catDir);
      storeSkills[cat.name] = files.map((f) => {
        const result = loadSkill(f);
        if (!result.success || !result.skill) return null;
        const s = result.skill;
        return {
          name: s.meta.name,
          title: s.meta.title,
          description: s.meta.description,
          category: s.meta.category,
          author: s.meta.author,
          price: s.meta.price ?? null,
          tags: s.meta.tags,
          salesCount: Math.floor(Math.random() * 5000) + 100, // 模拟销量
          rating: (4.0 + Math.random() * 1.0).toFixed(1),     // 模拟评分
        };
      }).filter(Boolean);
    }
  }

  // 列出用户自定义技能
  if (existsSync(SKILLS_DIR)) {
    const userSkills = loadSkillsFromDir(SKILLS_DIR);
    const userList: unknown[] = [];
    for (const [name, result] of userSkills) {
      if (result.success && result.skill) {
        userList.push({
          name: result.skill.meta.name,
          title: result.skill.meta.title,
          description: result.skill.meta.description,
          category: result.skill.meta.category,
          author: result.skill.meta.author,
          price: result.skill.meta.price ?? null,
          tags: result.skill.meta.tags,
          salesCount: 0,
          rating: null,
          isCustom: true,
        });
      }
    }
    if (userList.length > 0) storeSkills["custom"] = userList;
  }

  res.json({ store: storeSkills });
});

/**
 * POST /api/v1/store/purchase — 购买技能
 */
storeRouter.post("/purchase", (req, res) => {
  const { skillName, buyerId, buyerEmail } = req.body as {
    skillName?: string;
    buyerId?: string;
    buyerEmail?: string;
  };
  if (!skillName) throw new ValidationError("skillName is required");
  if (!buyerId) throw new ValidationError("buyerId is required");

  // 查找技能
  let skillPath: string | null = null;
  let price: { amount: number; currency: string } | null = null;

  // 先搜索模板
  const categories = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());
  for (const cat of categories) {
    const catDir = resolve(TEMPLATES_DIR, cat.name);
    const files = findSkillFiles(catDir);
    for (const f of files) {
      const result = loadSkill(f);
      if (result.success && result.skill?.meta.name === skillName) {
        skillPath = f;
        price = result.skill.meta.price ?? null;
        break;
      }
    }
    if (skillPath) break;
  }

  // 再搜索用户技能
  if (!skillPath) {
    const ymlPath = resolve(SKILLS_DIR, skillName, `${skillName}.skill.yml`);
    if (existsSync(ymlPath)) {
      const result = loadSkill(ymlPath);
      if (result.success && result.skill) {
        skillPath = ymlPath;
        price = result.skill.meta.price ?? null;
      }
    }
  }

  if (!skillPath) throw new NotFoundError(`Skill '${skillName}'`);

  // 生成 license
  const license = generateLicense(skillName, buyerId);
  const licenseContent = generateLicenseFile(license);

  // 保存订单
  const orderId = `ORD-${Date.now()}`;
  const order = {
    orderId,
    skillName,
    buyerId,
    buyerEmail: buyerEmail ?? null,
    price: price ?? { amount: 0, currency: "CNY" },
    license,
    purchasedAt: new Date().toISOString(),
  };
  writeFileSync(
    resolve(ORDERS_DIR, `${orderId}.json`),
    JSON.stringify(order, null, 2),
  );

  res.json({
    success: true,
    orderId,
    license,
    licenseFile: licenseContent,
    message: `购买成功！技能 "${skillName}" 已激活。`,
  });
});

/**
 * GET /api/v1/store/orders/:buyerId — 查询购买记录
 */
storeRouter.get("/orders/:buyerId", (req, res) => {
  const { buyerId } = req.params;
  const orders: unknown[] = [];

  if (existsSync(ORDERS_DIR)) {
    const files = readdirSync(ORDERS_DIR).filter((f: string) => f.endsWith(".json"));
    for (const file of files) {
      const content = readFileSync(resolve(ORDERS_DIR, file), "utf-8");
      const order = JSON.parse(content);
      if (order.buyerId === buyerId) {
        orders.push({
          orderId: order.orderId,
          skillName: order.skillName,
          price: order.price,
          purchasedAt: order.purchasedAt,
          licenseKey: order.license.key,
        });
      }
    }
  }

  res.json({ orders });
});
