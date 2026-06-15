/**
 * Payment API — 支付接口
 *
 * 创建支付订单、验证支付、处理回调。
 */
import { Router } from "express";
import { paymentManager } from "../../payment/manager.js";
import { generateLicense, generateLicenseFile } from "../../core/license.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ValidationError } from "../middleware/error-handler.js";

export const paymentRouter = Router();

const ORDERS_DIR = resolve(process.cwd(), ".orders");
try { mkdirSync(ORDERS_DIR, { recursive: true }); } catch { /* exists */ }

/**
 * GET /api/v1/payment/methods — 支持的支付方式
 */
paymentRouter.get("/methods", (_req, res) => {
  res.json({ methods: paymentManager.listMethods() });
});

/**
 * POST /api/v1/payment/create — 创建支付订单
 */
paymentRouter.post("/create", async (req, res) => {
  const { skillName, amount, method, buyerId, sellerAccount } = req.body as {
    skillName?: string;
    amount?: number;
    method?: string;
    buyerId?: string;
    sellerAccount?: string;
  };
  if (!skillName) throw new ValidationError("skillName is required");
  if (!amount || amount <= 0) throw new ValidationError("amount must be > 0");
  if (!method || !["wechat", "alipay"].includes(method)) throw new ValidationError("method must be 'wechat' or 'alipay'");
  if (!buyerId) throw new ValidationError("buyerId is required");

  const order = await paymentManager.createOrder({
    skillName,
    amount,
    method: method as "wechat" | "alipay",
    buyerId,
    sellerAccount: sellerAccount ?? "seller",
  });

  // 5分钟后自动过期
  const expireMs = 5 * 60 * 1000;
  setTimeout(() => {
    const o = paymentManager.getOrder(order.orderId);
    if (o && o.status === "pending") {
      o.status = "expired";
    }
  }, expireMs).unref();

  res.json({
    success: true,
    order: {
      orderId: order.orderId,
      amount: order.amount,
      method: order.method,
      mode: order.mode,
      status: order.status,
      qrCode: order.qrCode,
      paymentUrl: order.paymentUrl,
      expiresIn: expireMs,
    },
    instruction: order.mode === "qr"
      ? `请使用${order.method === "wechat" ? "微信" : "支付宝"}转账 ¥${order.amount}，然后输入交易单号验证`
      : "请扫码完成支付",
  });
});

/**
 * POST /api/v1/payment/verify — 验证支付 + 签发 license
 */
paymentRouter.post("/verify", async (req, res) => {
  const { orderId, txnId } = req.body as {
    orderId?: string;
    txnId?: string;
  };
  if (!orderId) throw new ValidationError("orderId is required");

  const result = await paymentManager.verifyPayment(orderId, txnId);

  if (!result.success) {
    res.json({
      success: false,
      message: "支付验证失败。请确认交易单号正确，或等待款项到账后重试。",
    });
    return;
  }

  // 支付成功 → 签发 license
  const order = result.order!;
  const license = generateLicense(order.skillName, order.buyerId);
  const licenseFile = generateLicenseFile(license);

  // 保存完整订单
  const orderRecord = {
    orderId: order.orderId,
    skillName: order.skillName,
    buyerId: order.buyerId,
    price: { amount: order.amount, currency: "CNY" },
    paymentMethod: order.method,
    txnId: order.txnId,
    license,
    purchasedAt: order.paidAt,
  };
  writeFileSync(
    resolve(ORDERS_DIR, `${order.orderId}.json`),
    JSON.stringify(orderRecord, null, 2),
  );

  res.json({
    success: true,
    message: "支付验证成功！许可证已签发。",
    orderId: order.orderId,
    license: {
      key: license.key,
      skillName: license.skillName,
      issuedAt: license.issuedAt,
    },
    licenseFile,
  });
});

/**
 * POST /api/v1/payment/wechat/notify — 微信支付回调 (API 模式)
 */
paymentRouter.post("/wechat/notify", (req, res) => {
  // 微信支付 V3 回调验证
  // 1. 验证签名
  // 2. 解密 resource
  // 3. 更新订单状态
  // 4. 返回 { code: "SUCCESS", message: "成功" }

  const { resource } = req.body as { resource?: { ciphertext: string } };
  if (resource) {
    // 生产环境: 解密并处理
    console.log("[WeChatPay] Callback received:", resource.ciphertext.slice(0, 20));
  }

  res.json({ code: "SUCCESS", message: "成功" });
});

/**
 * POST /api/v1/payment/alipay/notify — 支付宝回调 (API 模式)
 */
paymentRouter.post("/alipay/notify", (req, res) => {
  // 支付宝异步通知验证
  const { trade_status, out_trade_no } = req.body as {
    trade_status?: string;
    out_trade_no?: string;
  };

  if (trade_status === "TRADE_SUCCESS" && out_trade_no) {
    console.log("[Alipay] Payment success:", out_trade_no);
  }

  res.send("success");
});
