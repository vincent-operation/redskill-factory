import { useState, useEffect } from "react";
import { api } from "../api/client.js";

interface StoreSkill {
  name: string;
  title: string;
  description: string;
  category: string;
  author: string;
  price: { amount: number; currency: string } | null;
  tags: string[];
  salesCount: number;
  rating: string | null;
  isCustom?: boolean;
}

interface PurchaseResult {
  success: boolean;
  orderId: string;
  license: { key: string; skillName: string; issuedAt: string };
  licenseFile: string;
  message: string;
}

const CAT_EMOJI: Record<string, string> = {
  education: "📚", productivity: "⚡", creative: "🎨", lifestyle: "🌟",
  business: "💼", tech: "💻", custom: "🛠️", other: "📦",
};

export function StorePage() {
  const [store, setStore] = useState<Record<string, StoreSkill[]>>({});
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<PurchaseResult | null>(null);
  const [buyerId, setBuyerId] = useState("user_" + Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    api.get<{ store: Record<string, StoreSkill[]> }>("/store").then((data) => {
      setStore(data.store);
      setLoading(false);
    });
  }, []);

  const handleBuy = async (skillName: string) => {
    setBuying(skillName);
    try {
      const result = await api.post<PurchaseResult>("/store/purchase", {
        skillName,
        buyerId,
        buyerEmail: `${buyerId}@example.com`,
      });
      setPurchase(result);
    } catch {
      alert("购买失败，请重试");
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <p>加载中...</p>;

  return (
    <div>
      <div className="flex-between mb-md">
        <h1>🛍️ RedSkill 商店</h1>
        <input
          value={buyerId}
          onChange={(e) => setBuyerId(e.target.value)}
          placeholder="你的用户ID"
          style={{ width: 180 }}
        />
      </div>

      <p className="text-secondary mb-md">发现优质 AI 技能，一键购买，即刻使用</p>

      {purchase && (
        <div className="card mb-md" style={{ background: "#f0fdf4", border: "2px solid #22c55e" }}>
          <h3>✅ {purchase.message}</h3>
          <div className="mt-sm">
            <p><strong>订单号:</strong> {purchase.orderId}</p>
            <p><strong>许可证密钥:</strong> <code style={{ fontSize: 16, background: "#eee", padding: "2px 8px", borderRadius: 4 }}>{purchase.license.key}</code></p>
            <p><strong>签发时间:</strong> {new Date(purchase.license.issuedAt).toLocaleString("zh-CN")}</p>
          </div>
          <details className="mt-sm">
            <summary>许可证文件 (保存为 license.txt)</summary>
            <pre style={{ background: "#fafafa", padding: 12, borderRadius: 4, fontSize: 12, overflow: "auto", maxHeight: 200, marginTop: 8 }}>
              {purchase.licenseFile}
            </pre>
          </details>
          <button className="btn-secondary mt-sm" onClick={() => setPurchase(null)}>继续浏览</button>
        </div>
      )}

      {Object.entries(store).map(([category, skills]) => (
        <div key={category} className="mb-lg">
          <h2 className="mb-sm">{CAT_EMOJI[category] ?? "📦"} {category}</h2>
          <div className="grid grid-2">
            {skills.map((skill) => (
              <div key={skill.name} className="card" style={{ position: "relative" }}>
                <div className="flex-between mb-sm">
                  <h3>{skill.title}</h3>
                  {skill.rating && (
                    <span className="text-sm" style={{ color: "#f59e0b" }}>
                      {"⭐".repeat(Math.round(Number(skill.rating)))} {skill.rating}
                    </span>
                  )}
                </div>
                <p className="text-secondary text-sm mb-sm">{skill.description}</p>
                <div className="flex-between mb-sm">
                  <span className="text-sm text-secondary">{skill.author}</span>
                  <span className="text-sm text-secondary">已售 {skill.salesCount.toLocaleString()}</span>
                </div>
                <div className="flex-wrap gap-sm mb-sm">
                  {skill.tags.map((t) => (
                    <span key={t} style={{ background: "#f0f0f0", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>{t}</span>
                  ))}
                </div>
                <div className="flex-between">
                  <span style={{ fontSize: 24, fontWeight: 700, color: "#ff6b35" }}>
                    {skill.price ? `¥${skill.price.amount}` : "免费"}
                  </span>
                  {skill.price && (
                    <button
                      className="btn-primary"
                      onClick={() => handleBuy(skill.name)}
                      disabled={buying === skill.name}
                      style={{ minWidth: 100 }}
                    >
                      {buying === skill.name ? "购买中..." : "💰 立即购买"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(store).length === 0 && (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="text-secondary">商店暂无商品</p>
          <p className="text-secondary text-sm mt-sm">运行 rfs init 创建你的第一个技能</p>
        </div>
      )}
    </div>
  );
}
