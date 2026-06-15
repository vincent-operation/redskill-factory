/**
 * Public Skill Landing Page — 技能公开展示页
 *
 * 可分享到小红书的独立页面，含购买流程和支付确认。
 * 路由: /skill/:name
 */
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";

interface LandingSkill {
  name: string;
  title: string;
  description: string;
  author: string;
  price: { amount: number; currency: string } | null;
  tags: string[];
  category: string;
  rating: string;
  salesCount: number;
}

interface PurchaseResult {
  success: boolean;
  orderId: string;
  license: { key: string; skillName: string; issuedAt: string };
  licenseFile: string;
  paymentUrl: string;
}

export function SkillLandingPage() {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref") ?? "";

  const [skill, setSkill] = useState<LandingSkill | null>(null);
  const [seller, setSeller] = useState<{
    name: string; wechatNickname?: string; alipayAccount?: string;
    hasWechatQR: boolean; hasAlipayQR: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"view" | "pay" | "confirm" | "done">("view");
  const [buyerId, setBuyerId] = useState("");
  const [txnId, setTxnId] = useState("");
  const [buying, setBuying] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseResult | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [payMethod, setPayMethod] = useState<"wechat" | "alipay">("wechat");

  useEffect(() => {
    // Fetch skill from store API
    api.get<{ store: Record<string, LandingSkill[]> }>("/store").then((data) => {
      for (const skills of Object.values(data.store)) {
        const found = (skills as LandingSkill[]).find((s) => s.name === name);
        if (found) { setSkill(found); break; }
      }
      setLoading(false);
    });
    // Fetch seller info if ref provided
    if (ref) {
      api.get<{ name: string; wechatNickname?: string; alipayAccount?: string; hasWechatQR: boolean; hasAlipayQR: boolean }>(`/seller/${ref}`)
        .then(setSeller)
        .catch(() => {});
    }
  }, [name, ref]);

  // Simulate payment countdown
  useEffect(() => {
    if (step === "pay" && countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  const handleStartBuy = () => {
    setBuyerId("user_" + Math.random().toString(36).slice(2, 8));
    setCountdown(120); // 2 min payment window
    setStep("pay");
  };

  const handleConfirmPayment = async () => {
    if (!txnId.trim()) return;
    setBuying(true);
    try {
      // 使用新的支付验证 API
      const result = await api.post<PurchaseResult>("/payment/verify", {
        orderId: `TXN-${Date.now()}`,
        txnId: txnId.trim(),
        skillName: name,
        buyerId,
        ref,
      });
      // 如果 verify 失败，回退到 store/purchase
      if (!result.success) {
        const fallback = await api.post<PurchaseResult>("/store/purchase", {
          skillName: name,
          buyerId,
          txnId: txnId.trim(),
          ref,
        });
        setPurchase(fallback);
      } else {
        setPurchase(result);
      }
      setStep("done");
    } catch {
      alert("确认失败，请检查交易号是否正确");
    } finally {
      setBuying(false);
    }
  };

  if (loading) return <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}><p>加载中...</p></div>;
  if (!skill) return <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}><h2>技能未找到</h2><p>请检查链接是否正确</p></div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏭</div>
        <h1 style={{ fontSize: 28 }}>{skill.title}</h1>
        <p style={{ color: "#666", marginTop: 8 }}>{skill.description}</p>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 16, color: "#999", fontSize: 13 }}>
          <span>⭐ {skill.rating}</span>
          <span>已售 {skill.salesCount.toLocaleString()}</span>
          <span>{skill.author}</span>
        </div>
        {skill.price && (
          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#ff6b35" }}>¥{skill.price.amount}</span>
            <span style={{ color: "#999", marginLeft: 8, textDecoration: "line-through" }}>¥{Math.round(skill.price.amount * 3.3)}</span>
          </div>
        )}
      </div>

      {/* Step: View → Start Purchase */}
      {step === "view" && (
        <div style={{ textAlign: "center" }}>
          <div className="card" style={{ textAlign: "left", marginBottom: 20 }}>
            <h3 className="mb-sm">✨ 你将获得</h3>
            <ul style={{ paddingLeft: 20, color: "#555", lineHeight: 2 }}>
              <li>AI 技能永久使用权</li>
              <li>专属许可证密钥 (RSK 签名)</li>
              <li>支持 Claude Code / OpenAI GPT / 通用格式</li>
              <li>免费更新</li>
            </ul>
          </div>
          <div className="card" style={{ textAlign: "left", marginBottom: 20 }}>
            <h3 className="mb-sm">🏷️ 标签</h3>
            <div className="flex-wrap gap-sm">
              {skill.tags.map((t) => (
                <span key={t} style={{ background: "#f0f0f0", padding: "4px 12px", borderRadius: 16, fontSize: 13 }}>{t}</span>
              ))}
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={handleStartBuy}
            style={{ fontSize: 18, padding: "16px 48px", width: "100%" }}
          >
            💰 立即购买 ¥{skill.price?.amount ?? 0}
          </button>
          <p style={{ color: "#999", fontSize: 12, marginTop: 8 }}>
            支付后自动签发许可证 · 永久有效 · {ref ? `推荐人: ${ref}` : ""}
          </p>
        </div>
      )}

      {/* Step: Payment */}
      {step === "pay" && (
        <div style={{ textAlign: "center" }}>
          {/* Payment method selector */}
          <div className="flex gap-sm mb-md" style={{ justifyContent: "center" }}>
            <button
              onClick={() => setPayMethod("wechat")}
              style={{
                padding: "12px 24px", borderRadius: 8, border: payMethod === "wechat" ? "2px solid #07c160" : "1px solid #ddd",
                background: payMethod === "wechat" ? "#f0fdf4" : "#fff", fontWeight: payMethod === "wechat" ? 700 : 400,
              }}
            >
              💚 微信支付
            </button>
            <button
              onClick={() => setPayMethod("alipay")}
              style={{
                padding: "12px 24px", borderRadius: 8, border: payMethod === "alipay" ? "2px solid #1677ff" : "1px solid #ddd",
                background: payMethod === "alipay" ? "#f0f5ff" : "#fff", fontWeight: payMethod === "alipay" ? 700 : 400,
              }}
            >
              💙 支付宝
            </button>
          </div>

          <div className="card" style={{ background: payMethod === "wechat" ? "#f0fdf4" : "#f0f5ff", border: `2px solid ${payMethod === "wechat" ? "#07c160" : "#1677ff"}`, marginBottom: 20 }}>
            <h3 className="mb-sm">{payMethod === "wechat" ? "💚 微信支付" : "💙 支付宝"}</h3>
            <div style={{ fontSize: 40, fontWeight: 700, color: "#ff6b35", margin: "16px 0" }}>¥{skill.price?.amount ?? 0}</div>
            <div style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
                {payMethod === "wechat"
                  ? "打开微信 → 扫一扫/转账至"
                  : "打开支付宝 → 扫一扫/转账至"}
              </div>
              {seller && (
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {payMethod === "wechat"
                    ? (seller.wechatNickname || seller.name)
                    : (seller.alipayAccount || seller.name)}
                </div>
              )}
              {!seller && <div style={{ fontSize: 18, fontWeight: 600 }}>{skill.author}</div>}
              {seller && seller.hasWechatQR && payMethod === "wechat" && (
                <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>✅ 已上传收款码</div>
              )}
              {seller && seller.hasAlipayQR && payMethod === "alipay" && (
                <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>✅ 已上传收款码</div>
              )}
              <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>备注: {buyerId}</div>
            </div>
            {countdown > 0 && (
              <div style={{ fontSize: 13, color: "#999" }}>
                ⏱️ 请在 {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")} 内完成支付
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h4 className="mb-sm">✅ 支付完成后</h4>
            <p className="text-secondary text-sm mb-sm">
              {payMethod === "wechat"
                ? "打开微信 → 我 → 服务 → 钱包 → 账单 → 复制转账单号"
                : "打开支付宝 → 我的 → 账单 → 复制交易号"}
            </p>
            <input
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder={payMethod === "wechat" ? "微信转账单号: 1000..." : "支付宝交易号: 2026..."}
              style={{ width: "100%", marginBottom: 12 }}
            />
            <button
              className="btn-primary"
              onClick={handleConfirmPayment}
              disabled={buying || !txnId.trim()}
              style={{ width: "100%" }}
            >
              {buying ? "验证中..." : "✅ 已完成支付，获取许可证"}
            </button>
          </div>

          <button className="btn-secondary" onClick={() => setStep("view")} style={{ width: "100%" }}>
            ← 返回
          </button>
        </div>
      )}

      {/* Step: Done — License delivered */}
      {step === "done" && purchase && (
        <div>
          <div className="card" style={{ background: "#f0fdf4", border: "2px solid #22c55e", textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h2>购买成功！</h2>
            <p className="text-secondary mt-sm">{purchase.license.key}</p>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="mb-sm">📋 许可证信息</h3>
            <div style={{ background: "#fafafa", padding: 12, borderRadius: 8 }}>
              <p><strong>订单号:</strong> {purchase.orderId}</p>
              <p><strong>许可证密钥:</strong> <code style={{ fontSize: 16, background: "#eee", padding: "2px 8px", borderRadius: 4 }}>{purchase.license.key}</code></p>
              <p><strong>技能:</strong> {purchase.license.skillName}</p>
              <p><strong>签发时间:</strong> {new Date(purchase.license.issuedAt).toLocaleString("zh-CN")}</p>
            </div>
          </div>

          <details className="card" style={{ marginBottom: 20 }}>
            <summary><strong>📄 查看许可证文件</strong></summary>
            <pre style={{ background: "#fafafa", padding: 12, borderRadius: 4, fontSize: 11, overflow: "auto", maxHeight: 200, marginTop: 8 }}>
              {purchase.licenseFile}
            </pre>
          </details>

          <div className="card" style={{ textAlign: "center", marginBottom: 20 }}>
            <h4 className="mb-sm">🚀 下一步</h4>
            <p className="text-secondary text-sm">
              将许可证文件保存到技能目录中即可激活。<br />
              如有问题，联系 {skill.author}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 40, paddingTop: 20, borderTop: "1px solid #eee", color: "#999", fontSize: 12 }}>
        <p>由 RedSkill Factory 提供技术支持</p>
        <p>🏭 小红书技能工厂 · 从想法到收入</p>
      </div>
    </div>
  );
}
