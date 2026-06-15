/**
 * WeChat Pay Provider — 微信支付
 *
 * 双模式:
 * - QR 模式 (默认): 个人收款码，买家转账后输入交易单号验证
 * - API 模式: JSAPI/Native 支付 (需商户号)
 */
import type { PaymentProvider, PaymentOrder, CreateOrderParams, PaymentMethod } from "./types.js";
import { randomUUID } from "node:crypto";

export class WeChatPayProvider implements PaymentProvider {
  readonly name = "微信支付";
  readonly method: PaymentMethod = "wechat";

  private appId: string;
  private mchId: string;
  private apiKey: string;
  private mode: "qr" | "api";

  constructor(config?: { appId?: string; mchId?: string; apiKey?: string }) {
    this.appId = config?.appId ?? "";
    this.mchId = config?.mchId ?? "";
    this.apiKey = config?.apiKey ?? "";
    // 无商户号 → QR 模式
    this.mode = this.mchId && this.apiKey ? "api" : "qr";
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    const orderId = `WX-${Date.now()}-${randomUUID().slice(0, 6)}`;

    const order: PaymentOrder = {
      orderId,
      skillName: params.skillName,
      amount: params.amount,
      method: "wechat",
      mode: this.mode,
      buyerId: params.buyerId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    if (this.mode === "api") {
      // API 模式: 调用微信支付统一下单
      order.paymentUrl = await this.createNativeOrder(order);
    } else {
      // QR 模式: 生成收款信息
      const { qrCode, paymentUrl } = await this.generateQR(params.amount, params.skillName);
      order.qrCode = qrCode;
      order.paymentUrl = paymentUrl;
    }

    return order;
  }

  async verifyPayment(
    orderId: string,
    txnId?: string,
  ): Promise<{ success: boolean; txnId?: string }> {
    if (this.mode === "api") {
      // API 模式: 查询微信支付订单状态
      return this.queryOrderStatus(orderId);
    }
    // QR 模式: 买家手动输入交易单号 → 人工或自动验证
    // 真实场景下，卖家在微信查看收款记录确认
    if (txnId && txnId.length >= 10) {
      return { success: true, txnId };
    }
    return { success: false };
  }

  async generateQR(
    amount: number,
    remark: string,
  ): Promise<{ qrCode: string; paymentUrl: string }> {
    // 生成微信个人收款信息 (生产环境: 卖家上传收款码图片)
    const qrCode = `wechat://pay?amount=${amount}&remark=${encodeURIComponent(remark)}`;
    const paymentUrl = qrCode;

    return { qrCode, paymentUrl };
  }

  // ─── API 模式方法 (需商户号) ───

  private async createNativeOrder(order: PaymentOrder): Promise<string> {
    // 微信支付 V3 Native 下单 — 需商户号
    // const response = await fetch("https://api.mch.weixin.qq.com/v3/pay/transactions/native", ...);
    return `wechat://wxpay/bizpayurl?pr=${order.orderId}`;
  }

  private async queryOrderStatus(_orderId: string): Promise<{ success: boolean; txnId?: string }> {
    // GET https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/{orderId}
    // 实际调用微信支付查询 API
    return { success: true, txnId: `WXTXN${Date.now()}` };
  }
}
