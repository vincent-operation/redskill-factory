/**
 * Payment Manager — 支付管理器
 *
 * 统一管理微信支付和支付宝，支持订单追踪和自动验证。
 */
import type { PaymentProvider, PaymentOrder, PaymentMethod } from "./types.js";
import { WeChatPayProvider } from "./wechat.js";
import { AlipayProvider } from "./alipay.js";

export class PaymentManager {
  private providers: Map<PaymentMethod, PaymentProvider> = new Map();
  private orders: Map<string, PaymentOrder> = new Map();

  constructor() {
    this.register(new WeChatPayProvider());
    this.register(new AlipayProvider());
  }

  register(provider: PaymentProvider): void {
    this.providers.set(provider.method, provider);
  }

  getProvider(method: PaymentMethod): PaymentProvider | undefined {
    return this.providers.get(method);
  }

  /** 创建支付订单 */
  async createOrder(params: {
    skillName: string;
    amount: number;
    method: PaymentMethod;
    buyerId: string;
    sellerAccount: string;
  }): Promise<PaymentOrder> {
    const provider = this.providers.get(params.method);
    if (!provider) throw new Error(`Unsupported payment method: ${params.method}`);

    const order = await provider.createOrder({
      skillName: params.skillName,
      amount: params.amount,
      buyerId: params.buyerId,
      sellerAccount: params.sellerAccount,
    });

    this.orders.set(order.orderId, order);
    return order;
  }

  /** 验证支付并更新订单状态 */
  async verifyPayment(
    orderId: string,
    txnId?: string,
  ): Promise<{ success: boolean; order?: PaymentOrder }> {
    const order = this.orders.get(orderId);
    if (!order) return { success: false };

    if (order.status === "paid") {
      return { success: true, order };
    }

    const provider = this.providers.get(order.method);
    if (!provider) return { success: false };

    const result = await provider.verifyPayment(orderId, txnId);
    if (result.success) {
      order.status = "paid";
      order.txnId = result.txnId;
      order.paidAt = new Date().toISOString();
      this.orders.set(orderId, order);
    }

    return { success: result.success, order };
  }

  /** 获取订单 */
  getOrder(orderId: string): PaymentOrder | undefined {
    return this.orders.get(orderId);
  }

  /** 列出所有支持的支付方式 */
  listMethods(): Array<{ method: PaymentMethod; name: string; mode: string }> {
    return [...this.providers.values()].map((p) => {
      const order = this.orders.values().next().value;
      return {
        method: p.method,
        name: p.name,
        mode: (order as PaymentOrder)?.mode ?? "qr",
      };
    });
  }
}

/** 全局单例 */
export const paymentManager = new PaymentManager();
