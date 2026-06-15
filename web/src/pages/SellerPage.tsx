/**
 * Seller Profile Page — 卖家中心
 *
 * 注册卖家、上传收款二维码、发布技能、查看收入。
 */
import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useSkills } from "../hooks/useSkills.js";

export function SellerPage() {
  const [sellerId, setSellerId] = useState("");
  const [profile, setProfile] = useState<{
    id: string; name: string; hasWechatQR: boolean; hasAlipayQR: boolean;
    publishedSkills: string[]; totalRevenue: number;
  } | null>(null);
  const [earnings, setEarnings] = useState<{ totalRevenue: number; totalOrders: number; bySkill: Record<string, number> } | null>(null);
  const [orders, setOrders] = useState<Array<{ orderId: string; skillName: string; buyerId: string; amount: number; method: string; license: string; purchasedAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const { skills } = useSkills();

  // Form state
  const [name, setName] = useState("");
  const [wechatNickname, setWechatNickname] = useState("");
  const [alipayAccount, setAlipayAccount] = useState("");
  const [wechatQR, setWechatQR] = useState("");
  const [alipayQR, setAlipayQR] = useState("");

  const handleRegister = async () => {
    if (!sellerId || !name) return;
    setLoading(true);
    const data = await api.post<{ success: boolean; seller: typeof profile }>("/seller/register", {
      id: sellerId,
      name,
      wechatQR: wechatQR || undefined,
      alipayQR: alipayQR || undefined,
      wechatNickname: wechatNickname || undefined,
      alipayAccount: alipayAccount || undefined,
    });
    if (data.success) {
      setProfile(data.seller);
      loadEarnings(sellerId);
    }
    setLoading(false);
  };

  const loadProfile = async (id: string) => {
    try {
      const data = await api.get<typeof profile>(`/seller/${id}`);
      setProfile(data);
      loadEarnings(id);
    } catch { setProfile(null); }
  };

  const loadEarnings = async (id: string) => {
    try {
      const data = await api.get<{ totalRevenue: number; totalOrders: number; bySkill: Record<string, number> }>(`/seller/${id}/earnings`);
      setEarnings(data);
    } catch {}
    // Also load orders
    try {
      const data = await api.get<{ orders: Array<{ orderId: string; skillName: string; buyerId: string; amount: number; method: string; license: string; purchasedAt: string }>; total: number }>(`/seller/${id}/orders`);
      setOrders(data.orders);
    } catch {}
  };

  const handlePublish = async (skillName: string) => {
    const data = await api.post<{ landingUrl: string; fullUrl: string; shareText: string }>("/seller/publish", { sellerId, skillName });
    alert(`发布成功！\n\n分享链接: ${data.fullUrl}\n\n${data.shareText}`);
    loadProfile(sellerId);
  };

  return (
    <div>
      <h1 className="mb-md">💰 卖家中心</h1>

      {!profile ? (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3 className="mb-sm">注册成为卖家</h3>
          <p className="text-secondary text-sm mb-sm">注册后可以发布技能、接收付款</p>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>卖家 ID</label>
            <input value={sellerId} onChange={(e) => setSellerId(e.target.value)} placeholder="@yourname" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>显示名称</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>微信昵称 (收款用)</label>
            <input value={wechatNickname} onChange={(e) => setWechatNickname(e.target.value)} placeholder="微信昵称" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>支付宝账号 (收款用)</label>
            <input value={alipayAccount} onChange={(e) => setAlipayAccount(e.target.value)} placeholder="手机号或邮箱" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>微信收款码 (上传图片)</label>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setWechatQR(reader.result as string);
              reader.readAsDataURL(file);
            }} style={{ marginBottom: 4 }} />
            <textarea value={wechatQR} onChange={(e) => setWechatQR(e.target.value)} placeholder="或粘贴 base64: data:image/png;base64,..." rows={2} style={{ fontSize: 11 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>支付宝收款码 (上传图片)</label>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setAlipayQR(reader.result as string);
              reader.readAsDataURL(file);
            }} style={{ marginBottom: 4 }} />
            <textarea value={alipayQR} onChange={(e) => setAlipayQR(e.target.value)} placeholder="或粘贴 base64: data:image/png;base64,..." rows={2} style={{ fontSize: 11 }} />
          </div>

          <button className="btn-primary" onClick={handleRegister} disabled={loading} style={{ width: "100%" }}>
            {loading ? "注册中..." : "🚀 注册并开始赚钱"}
          </button>
        </div>
      ) : (
        <>
          {/* Earnings Dashboard */}
          <div className="grid grid-3 mb-md">
            <div className="card" style={{ textAlign: "center", background: "linear-gradient(135deg,#f59e0b,#ff6b35)", color:"#fff" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>¥{earnings?.totalRevenue.toLocaleString() ?? 0}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>总收入</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{earnings?.totalOrders ?? 0}</div>
              <div style={{ fontSize: 12, color: "#666" }}>订单数</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{profile.publishedSkills.length}</div>
              <div style={{ fontSize: 12, color: "#666" }}>已发布</div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="card mb-md">
            <h3 className="mb-sm">💳 收款方式</h3>
            <p>微信: {profile.hasWechatQR ? "✅ 已设置" : "❌ 未设置"}</p>
            <p>支付宝: {profile.hasAlipayQR ? "✅ 已设置" : "❌ 未设置"}</p>
          </div>

          {/* Publish Skills */}
          <div className="card mb-md">
            <h3 className="mb-sm">📦 发布技能</h3>
            <p className="text-secondary text-sm mb-sm">选择一个技能发布到商店，生成分享链接</p>
            {skills.length === 0 ? (
              <p className="text-secondary text-sm">暂无可发布的技能，请先创建</p>
            ) : (
              skills.map((s) => (
                <div key={s.name} className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <div>
                    <strong>{s.title}</strong>
                    <span className="text-secondary text-sm" style={{ marginLeft: 8 }}>
                      {profile.publishedSkills.includes(s.name) ? "✅ 已发布" : ""}
                    </span>
                  </div>
                  {!profile.publishedSkills.includes(s.name) && (
                    <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => handlePublish(s.name)}>
                      🚀 发布
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Recent Orders */}
          <div className="card mb-md">
            <h3 className="mb-sm">📋 最近订单 ({orders.length})</h3>
            {orders.length === 0 ? (
              <p className="text-secondary text-sm">暂无订单，分享你的技能链接开始赚钱吧</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                      <th style={{ padding: "8px 4px", textAlign: "left" }}>技能</th>
                      <th style={{ padding: "8px 4px", textAlign: "right" }}>金额</th>
                      <th style={{ padding: "8px 4px", textAlign: "center" }}>支付</th>
                      <th style={{ padding: "8px 4px", textAlign: "right" }}>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map((o) => (
                      <tr key={o.orderId} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "6px 4px" }}>{o.skillName}</td>
                        <td style={{ padding: "6px 4px", textAlign: "right", color: "#ff6b35", fontWeight: 600 }}>¥{o.amount}</td>
                        <td style={{ padding: "6px 4px", textAlign: "center", fontSize: 11 }}>{o.method === "wechat" ? "💚" : o.method === "alipay" ? "💙" : o.method}</td>
                        <td style={{ padding: "6px 4px", textAlign: "right", fontSize: 11, color: "#999" }}>{new Date(o.purchasedAt).toLocaleDateString("zh-CN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Published Skills */}
          {profile.publishedSkills.length > 0 && (
            <div className="card">
              <h3 className="mb-sm">🔗 已发布技能分享链接</h3>
              {profile.publishedSkills.map((skillName) => (
                <div key={skillName} className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <code>{skillName}</code>
                  <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => {
                    const url = `/skill/${skillName}?ref=${profile.id}`;
                    navigator.clipboard?.writeText(window.location.origin + url);
                    alert("链接已复制！");
                  }}>
                    📋 复制链接
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
