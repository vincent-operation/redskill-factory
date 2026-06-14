import { useNavigate } from "react-router-dom";
import { useTemplates } from "../hooks/useTemplates.js";
import type { TemplateSummary } from "../hooks/useTemplates.js";

const CATEGORY_LABELS: Record<string, string> = {
  education: "📚 教育学习", productivity: "⚡ 效率工具", creative: "🎨 创意内容", lifestyle: "🌟 生活方式",
};

export function TemplatesPage() {
  const { templates, loading } = useTemplates();
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="mb-md">📦 模板库</h1>
      <p className="text-secondary mb-md">选择一个模板快速创建技能，在此基础上修改即可发布</p>

      {loading ? (
        <p>加载中...</p>
      ) : Object.keys(templates).length === 0 ? (
        <p className="text-secondary">暂无模板</p>
      ) : (
        Object.entries(templates).map(([cat, tpls]) => (
          <div key={cat} className="mb-md">
            <h2 style={{ marginBottom: 12 }}>{CATEGORY_LABELS[cat] ?? cat}</h2>
            <div className="grid grid-3">
              {(tpls as TemplateSummary[]).map((t) => (
                <div className="card" key={t.name}>
                  <span className="badge">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <h3 style={{ marginTop: 8 }}>{t.title}</h3>
                  <p className="text-secondary text-sm" style={{ marginTop: 4 }}>{t.description}</p>
                  {t.price && <p style={{ marginTop: 8, color: "var(--color-primary)", fontWeight: 600 }}>¥{t.price.amount}</p>}
                  <button
                    className="btn-primary"
                    style={{ marginTop: 12, width: "100%" }}
                    onClick={() => navigate(`/skills/new?template=${t.name}&category=${cat}`)}
                  >
                    使用此模板 →
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
