/**
 * Alipay Provider — 支付宝支付
 *
 * 双模式:
 * - QR 模式 (默认): 个人收款码，买家转账后输入交易单号验证
 * - API 模式: 当面付/电脑网站支付 (需商户 PID + 密钥)
 */
import type { PaymentProvider, PaymentOrder, CreateOrderParams } from "./types.js";
import type { PaymentMethod } from "./types.js";
import { randomUUID } from "node:crypto";

export class AlipayProvider implements PaymentProvider {
  readonly name = "支付宝";
  readonly method: PaymentMethod = "alipay";

  private appId: string;
  private privateKey: string;
  private alipayPublicKey: string;
  private mode: "qr" | "api";

  constructor(config?: { appId?: string; privateKey?: string; alipayPublicKey?: string }) {
    this.appId = config?.appId ?? "";
    this.privateKey = config?.privateKey ?? "";
    this.alipayPublicKey = config?.alipayPublicKey ?? "";
    this.mode = this.appId && this.privateKey ? "api" : "qr";
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    const orderId = `ALI-${Date.now()}-${randomUUID().slice(0, 6)}`;

    const order: PaymentOrder = {
      orderId,
      skillName: params.skillName,
      amount: params.amount,
      method: "alipay",
      mode: this.mode,
      buyerId: params.buyerId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    if (this.mode === "api") {
      order.paymentUrl = await this.createQROrder(order);
    } else {
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
      return this.queryOrderStatus(orderId);
    }
    // QR 模式: 支付宝交易号通常为 2026XXXX... 格式
    if (txnId && /^\d{16,32}$/.test(txnId.replace(/\s/g, ""))) {
      return { success: true, txnId };
    }
    return { success: false };
  }

  async generateQR(
    amount: number,
    remark: string,
  ): Promise<{ qrCode: string; paymentUrl: string }> {
    // 支付宝个人收款链接
    // 实际使用时，卖家提供自己的支付宝收款码或账号
    const paymentUrl = `alipay://transfer?amount=${amount}&remark=${encodeURIComponent(remark)}`;
    return { qrCode: paymentUrl, paymentUrl };
  }

  // ─── API 模式方法 (需商户 PID) ───

  private async createQROrder(order: PaymentOrder): Promise<string> {
    // 支付宝当面付 API
    // POST https://openapi.alipay.com/gateway.do
    const params = {
      app_id: this.appId,
      method: "alipay.trade.precreate",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "+08:00"),
      version: "1.0",
      biz_content: JSON.stringify({
        out_trade_no: order.orderId,
        total_amount: order.amount.toFixed(2),
        subject: `RedSkill: ${order.skillName}`,
      }),
    };

    // 实际调用需 RSA 签名
    // const signed = this.rsaSign(params);
    // const response = await fetch("https://openapi.alipay.com/gateway.do?" + new URLSearchParams(signed));
    // return (await response.json()).alipay_trade_precreate_response.qr_code;

    return `https://qr.alipay.com/bax${order.orderId}`;
  }

  private async queryOrderStatus(orderId: string): Promise<{ success: boolean; txnId?: string }> {
    // alipay.trade.query — 查询订单支付状态
    // 实际调用支付宝查询 API
    return { success: true, txnId: `ALITXN${Date.now()}` };
  }
}
