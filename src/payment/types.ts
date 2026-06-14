/**
 * Payment System — 支付系统抽象层
 *
 * 支持微信支付 + 支付宝，两种模式:
 * - QR 模式: 个人收款码 (无需商户账号，立即可用)
 * - API 模式: 商户 API (需商户号，自动回调验证)
 */

export type PaymentMethod = "wechat" | "alipay";
export type PaymentMode = "qr" | "api";

export interface PaymentOrder {
  orderId: string;
  skillName: string;
  amount: number;
  method: PaymentMethod;
  mode: PaymentMode;
  buyerId: string;
  status: "pending" | "paid" | "expired" | "refunded";
  txnId?: string;
  createdAt: string;
  paidAt?: string;
  qrCode?: string; // QR code URL or data URI
  paymentUrl?: string; // Payment link for mobile
}

export interface PaymentProvider {
  readonly name: string;
  readonly method: PaymentMethod;

  /** 创建支付订单 */
  createOrder(params: CreateOrderParams): Promise<PaymentOrder>;

  /** 验证支付是否成功 */
  verifyPayment(orderId: string, txnId?: string): Promise<{ success: boolean; txnId?: string }>;

  /** 生成支付二维码 (QR 模式) */
  generateQR(amount: number, remark: string): Promise<{ qrCode: string; paymentUrl: string }>;
}

export interface CreateOrderParams {
  skillName: string;
  amount: number;
  buyerId: string;
  sellerAccount: string; // 微信: 收款人昵称, 支付宝: 账号
  remark?: string;
}
