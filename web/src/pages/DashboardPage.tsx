import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSkills } from "../hooks/useSkills.js";
import { useTemplates } from "../hooks/useTemplates.js";
import { api } from "../api/client.js";
import type { TemplateSummary } from "../hooks/useTemplates.js";

interface RevenueData {
  totalRevenue: number;
  totalOrders: number;
  activeSkills: number;
  averageOrderValue: number;
  topSkills: Array<{ name: string; sales: number; revenue: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  education: "📚 教育", productivity: "⚡ 效率", creative: "🎨 创意", lifestyle: "🌟 生活",
};

export function DashboardPage() {
  const { skills, loading, error, deleteSkill } = useSkills();
  const { templates } = useTemplates();
  const navigate = useNavigate();
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  useEffect(() => {
    api.get<RevenueData>("/analytics/revenue").then(setRevenue).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex-between mb-md">
        <h1>仪表板</h1>
        <div className="flex gap-sm">
          <Link to="/templates" className="btn-secondary" style={{ textDecoration: "none" }}>
            📦 浏览模板
          </Link>
          <Link to="/skills/new" className="btn-primary" style={{ textDecoration: "none" }}>
            ➕ 创建技能
          </Link>
        </div>
      </div>

      {revenue && (
        <div className="grid grid-4 mb-md">
          <div className="card" style={{ textAlign: "center", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>¥{revenue.totalRevenue.toLocaleString()}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>总收入</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e" }}>{revenue.totalOrders}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>总订单</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{revenue.activeSkills}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>在售技能</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#3b82f6" }}>¥{revenue.averageOrderValue}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>平均客单价</div>
          </div>
        </div>
      )}

      {revenue && revenue.topSkills.length > 0 && (
        <div className="card mb-md">
          <h3 className="mb-sm">🏆 畅销排行</h3>
          {revenue.topSkills.map((s, i) => (
            <div key={s.name} className="flex-between" style={{ padding: "8px 0", borderBottom: i < revenue.topSkills.length - 1 ? "1px solid var(--color-border)" : "none" }}>
              <span>#{i + 1} <strong>{s.name}</strong></span>
              <span className="text-secondary text-sm">{s.sales} 单 · ¥{s.revenue}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="card mt-md" style={{ border: "1px solid var(--color-error)", color: "var(--color-error)" }}>{error}</div>}

      <h2 className="mt-md mb-md">我的技能 ({skills.length})</h2>
      {loading ? (
        <p className="text-secondary">加载中...</p>
      ) : skills.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 40 }}>🏭</p>
          <h3>还没有技能</h3>
          <p className="text-secondary mt-sm">创建你的第一个 RedSkill 开始变现之旅</p>
          <div className="flex gap-sm" style={{ justifyContent: "center", marginTop: 16 }}>
            <Link to="/skills/new" className="btn-primary" style={{ textDecoration: "none" }}>从空白创建</Link>
            <Link to="/templates" className="btn-secondary" style={{ textDecoration: "none" }}>从模板创建</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-3">
          {skills.map((skill) => (
            <div className="card" key={skill.name} style={{ cursor: "pointer" }} onClick={() => navigate(`/skills/${skill.name}/edit`)}>
              <div className="flex-between">
                <span className="badge">{CATEGORY_LABELS[skill.category] ?? skill.category}</span>
                {skill.price && <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>¥{skill.price.amount}</span>}
              </div>
              <h3 style={{ marginTop: 8 }}>{skill.title}</h3>
              <p className="text-secondary text-sm" style={{ marginTop: 4 }}>{skill.description}</p>
              <div className="flex gap-sm" style={{ marginTop: 12, flexWrap: "wrap" }}>
                {skill.tags.map((t) => <span key={t} className="badge">{t}</span>)}
              </div>
              <div className="flex gap-sm" style={{ marginTop: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                <Link to={`/skills/${skill.name}/test`} className="btn-secondary" style={{ fontSize: 12, textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>🧪 测试</Link>
                <Link to={`/skills/${skill.name}/build`} className="btn-secondary" style={{ fontSize: 12, textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>📦 打包</Link>
                <Link to={`/skills/${skill.name}/market`} className="btn-secondary" style={{ fontSize: 12, textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>📱 推广</Link>
                <button
                  className="btn-danger"
                  style={{ marginLeft: "auto", fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); if (confirm("确认删除？")) deleteSkill(skill.name); }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-md mb-md">内置模板</h2>
      <div className="grid grid-2">
        {Object.entries(templates).flatMap(([cat, tpls]) =>
          (tpls as TemplateSummary[]).map((t) => (
            <div className="card" key={t.name}>
              <span className="badge">{CATEGORY_LABELS[cat] ?? cat}</span>
              <h4 style={{ marginTop: 8 }}>{t.title}</h4>
              <p className="text-secondary text-sm">{t.description}</p>
              <Link
                to={`/skills/new?template=${t.name}&category=${cat}`}
                className="btn-primary"
                style={{ marginTop: 8, display: "inline-block", textDecoration: "none", fontSize: 13 }}
              >
                使用此模板 →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
