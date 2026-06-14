import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useSkill } from "../hooks/useSkills.js";

interface MarketingResult {
  type: string;
  content: string;
  template: string;
}

export function MarketPage() {
  const { name } = useParams<{ name: string }>();
  const { detail, loading } = useSkill(name ?? "");
  const [type, setType] = useState<"note" | "cover" | "title">("note");
  const [count, setCount] = useState(3);
  const [template, setTemplate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<MarketingResult[] | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!name) return;
    setGenerating(true);
    const data = await api.post<{ results: MarketingResult[] }>("/market/generate", {
      skillName: name,
      type,
      count,
      ...(template ? { template } : {}),
    });
    setResults(data.results);
    setGenerating(false);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (loading) return <p>加载中...</p>;
  if (!detail) return <p>技能未找到</p>;

  return (
    <div>
      <h1 className="mb-md">📱 推广物料: {detail.skill.meta.title}</h1>

      <div className="card mb-md">
        <div className="grid grid-2" style={{ marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>类型</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="note">📝 完整笔记</option>
              <option value="title">💬 标题</option>
              <option value="cover">🎨 封面建议</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>数量</label>
            <input type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value) || 1)} min={1} max={10} />
          </div>
        </div>
        {type === "note" && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>笔记模板 (可选)</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
              <option value="">默认 (种草测评型)</option>
              <option value="种草测评型">种草测评型</option>
              <option value="教程攻略型">教程攻略型</option>
              <option value="对比评测型">对比评测型</option>
            </select>
          </div>
        )}
        <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? "生成中..." : "✨ 生成"}
        </button>
      </div>

      {results && (
        <div>
          {results.map((r, i) => (
            <div key={i} className="card mb-md">
              <div className="flex-between mb-sm">
                <span className="badge">{r.template}</span>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => copyToClipboard(r.content, i)}>
                  {copied === i ? "✅ 已复制" : "📋 复制"}
                </button>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, background: "#fafafa", padding: 16, borderRadius: 8 }}>
                {r.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
