/**
 * Seller Profile API — 卖家管理
 *
 * 管理卖家资料、收款二维码、已发布技能。
 * 这是变现的最后一环：让创作者能够真正收款。
 */
import { Router } from "express";
import { resolve } from "node:path";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { NotFoundError, ValidationError } from "../middleware/error-handler.js";

export const sellerRouter = Router();

const SELLERS_DIR = resolve(process.cwd(), ".sellers");
try { mkdirSync(SELLERS_DIR, { recursive: true }); } catch { /* exists */ }

interface SellerProfile {
  id: string;
  name: string;
  wechatQR?: string;    // base64 encoded QR image
  alipayQR?: string;     // base64 encoded QR image
  wechatNickname?: string;
  alipayAccount?: string;
  email?: string;
  bio?: string;
  publishedSkills: string[];
  totalRevenue: number;
  createdAt: string;
}

function loadSeller(id: string): SellerProfile | null {
  const path = resolve(SELLERS_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function saveSeller(profile: SellerProfile): void {
  writeFileSync(
    resolve(SELLERS_DIR, `${profile.id}.json`),
    JSON.stringify(profile, null, 2),
  );
}

/**
 * POST /api/v1/seller/upload-qr — 上传收款码 (base64)
 */
sellerRouter.post("/upload-qr", (req, res) => {
  const { id, method, qrData } = req.body as {
    id?: string;
    method?: "wechat" | "alipay";
    qrData?: string;
  };
  if (!id) throw new ValidationError("id is required");
  if (!method || !["wechat", "alipay"].includes(method)) throw new ValidationError("method must be 'wechat' or 'alipay'");
  if (!qrData) throw new ValidationError("qrData is required (base64 image)");

  const profile = loadSeller(id);
  if (!profile) throw new NotFoundError(`Seller '${id}'`);

  // Validate base64 format
  if (!qrData.startsWith("data:image/")) {
    throw new ValidationError("qrData must be a data URI (data:image/png;base64,...)");
  }

  if (method === "wechat") profile.wechatQR = qrData;
  else profile.alipayQR = qrData;

  saveSeller(profile);

  res.json({
    success: true,
    message: `${method === "wechat" ? "微信" : "支付宝"}收款码已上传`,
    method,
    size: qrData.length,
  });
});

/**
 * GET /api/v1/seller/payment-status — 支付配置状态
 */
sellerRouter.get("/payment-status", (_req, res) => {
  const wechatApiMode = !!(process.env.WECHAT_APP_ID && process.env.WECHAT_MCH_ID);
  const alipayApiMode = !!(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY);

  res.json({
    wechat: {
      available: true,
      mode: wechatApiMode ? "api" : "qr",
      apiConfigured: wechatApiMode,
    },
    alipay: {
      available: true,
      mode: alipayApiMode ? "api" : "qr",
      apiConfigured: alipayApiMode,
    },
    recommendation: wechatApiMode || alipayApiMode
      ? "API mode active — automatic payment verification enabled"
      : "QR mode active — configure merchant keys in .env for automatic verification",
  });
});

/**
 * GET /api/v1/seller/:id — 获取卖家公开资料
 */
sellerRouter.get("/:id", (req, res) => {
  const profile = loadSeller(req.params.id!);
  if (!profile) throw new NotFoundError(`Seller '${req.params.id}'`);

  // 公开资料 (不暴露完整二维码 base64，只显示是否有)
  res.json({
    id: profile.id,
    name: profile.name,
    hasWechatQR: !!profile.wechatQR,
    hasAlipayQR: !!profile.alipayQR,
    wechatNickname: profile.wechatNickname,
    alipayAccount: profile.alipayAccount,
    bio: profile.bio,
    publishedSkills: profile.publishedSkills,
    totalRevenue: profile.totalRevenue,
  });
});

/**
 * GET /api/v1/seller/:id/qr/:method — 获取卖家收款二维码
 */
sellerRouter.get("/:id/qr/:method", (req, res) => {
  const profile = loadSeller(req.params.id!);
  if (!profile) throw new NotFoundError(`Seller '${req.params.id}'`);

  const method = req.params.method as "wechat" | "alipay";
  const qrData = method === "wechat" ? profile.wechatQR : profile.alipayQR;

  if (!qrData) {
    throw new NotFoundError(`QR code not uploaded for ${method}`);
  }

  // 返回 base64 图片 (data URI 格式)
  res.json({
    sellerId: profile.id,
    method,
    qrCode: qrData, // data:image/png;base64,...
    account: method === "wechat" ? profile.wechatNickname : profile.alipayAccount,
  });
});

/**
 * POST /api/v1/seller/register — 注册/更新卖家
 */
sellerRouter.post("/register", (req, res) => {
  const { id, name, wechatQR, alipayQR, wechatNickname, alipayAccount, email, bio } = req.body as {
    id?: string;
    name?: string;
    wechatQR?: string;
    alipayQR?: string;
    wechatNickname?: string;
    alipayAccount?: string;
    email?: string;
    bio?: string;
  };
  if (!id) throw new ValidationError("id is required (use your RedSkill username)");
  if (!name) throw new ValidationError("name is required");

  const existing = loadSeller(id);
  const profile: SellerProfile = {
    id,
    name,
    wechatQR: wechatQR ?? existing?.wechatQR,
    alipayQR: alipayQR ?? existing?.alipayQR,
    wechatNickname: wechatNickname ?? existing?.wechatNickname,
    alipayAccount: alipayAccount ?? existing?.alipayAccount,
    email: email ?? existing?.email,
    bio: bio ?? existing?.bio,
    publishedSkills: existing?.publishedSkills ?? [],
    totalRevenue: existing?.totalRevenue ?? 0,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  saveSeller(profile);

  res.json({
    success: true,
    seller: {
      id: profile.id,
      name: profile.name,
      hasWechatQR: !!profile.wechatQR,
      hasAlipayQR: !!profile.alipayQR,
      publishedSkills: profile.publishedSkills.length,
    },
    publishUrl: `/skill/publish?id=${id}`,
  });
});

/**
 * POST /api/v1/seller/publish — 发布技能到商店
 */
sellerRouter.post("/publish", (req, res) => {
  const { sellerId, skillName } = req.body as {
    sellerId?: string;
    skillName?: string;
  };
  if (!sellerId) throw new ValidationError("sellerId is required");
  if (!skillName) throw new ValidationError("skillName is required");

  const profile = loadSeller(sellerId);
  if (!profile) throw new NotFoundError(`Seller '${sellerId}' not registered`);

  // 验证技能存在
  const skillPath = resolve(process.cwd(), "skills", skillName, `${skillName}.skill.yml`);
  const templatePath = resolve(process.cwd(), "templates");

  let found = false;
  if (existsSync(skillPath)) {
    found = true;
  } else {
    // 搜索模板
    for (const cat of readdirSync(templatePath, { withFileTypes: true }).filter(d => d.isDirectory())) {
      const catDir = resolve(templatePath, cat.name);
      if (existsSync(resolve(catDir, `${skillName}.skill.yml`))) {
        found = true;
        break;
      }
    }
  }

  if (!found) throw new NotFoundError(`Skill '${skillName}'`);

  // 添加到已发布列表
  if (!profile.publishedSkills.includes(skillName)) {
    profile.publishedSkills.push(skillName);
    saveSeller(profile);
  }

  const landingUrl = `/skill/${skillName}?ref=${sellerId}`;

  res.json({
    success: true,
    message: "技能已发布！",
    skillName,
    landingUrl,
    fullUrl: `${process.env.RFS_SERVER_URL ?? "http://localhost:3001"}${landingUrl}`,
    shareText: `🚀 我的 AI 技能【${skillName}】上线啦！\n\n点击体验：${landingUrl}\n\n#RedSkill #AI工具`,
  });
});

/**
 * GET /api/v1/seller/:id/earnings — 收入概览
 */
sellerRouter.get("/:id/earnings", (req, res) => {
  const profile = loadSeller(req.params.id!);
  if (!profile) throw new NotFoundError(`Seller '${req.params.id}'`);

  // 从订单记录中汇总
  const ordersDir = resolve(process.cwd(), ".orders");
  let totalRevenue = 0;
  let totalOrders = 0;
  const bySkill: Record<string, number> = {};

  if (existsSync(ordersDir)) {
    for (const f of readdirSync(ordersDir).filter((f: string) => f.endsWith(".json"))) {
      const order = JSON.parse(readFileSync(resolve(ordersDir, f), "utf-8"));
      if (order.license && profile.publishedSkills.includes(order.skillName)) {
        totalRevenue += order.price?.amount ?? 0;
        totalOrders++;
        bySkill[order.skillName] = (bySkill[order.skillName] ?? 0) + (order.price?.amount ?? 0);
      }
    }
  }

  profile.totalRevenue = totalRevenue;
  saveSeller(profile);

  res.json({
    sellerId: profile.id,
    totalRevenue,
    totalOrders,
    publishedSkills: profile.publishedSkills.length,
    bySkill,
  });
});
