import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useSkill } from "../hooks/useSkills.js";

const ALL_TARGETS = ["claude-code", "openai-gpt", "generic"];

interface BuildOutput {
  target: string;
  directoryName: string;
  files: Array<{ path: string; size: number }>;
}

export function BuildPage() {
  const { name } = useParams<{ name: string }>();
  const { detail, loading } = useSkill(name ?? "");
  const [targets, setTargets] = useState<string[]>(["claude-code", "generic"]);
  const [building, setBuilding] = useState(false);
  const [outputs, setOutputs] = useState<BuildOutput[] | null>(null);

  const handleBuild = async () => {
    if (!name) return;
    setBuilding(true);
    setOutputs(null);
    const data = await api.post<{ outputs: BuildOutput[] }>("/build", { skillName: name, targets });
    setOutputs(data.outputs);
    setBuilding(false);
  };

  if (loading) return <p>加载中...</p>;
  if (!detail) return <p>技能未找到</p>;

  return (
    <div>
      <h1 className="mb-md">📦 打包: {detail.skill.meta.title}</h1>
      <p className="text-secondary mb-md">版本: {detail.skill.meta.version}</p>

      <div className="card mb-md">
        <h3 className="mb-sm">选择目标格式</h3>
        {ALL_TARGETS.map((t) => (
          <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input type="checkbox" checked={targets.includes(t)} onChange={() => {
              setTargets((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
            }} />
            {t}
          </label>
        ))}
        <button className="btn-primary mt-sm" onClick={handleBuild} disabled={building}>
          {building ? "打包中..." : "🔨 开始打包"}
        </button>
      </div>

      {outputs && (
        <div>
          <h2 className="mb-md">✅ 打包完成</h2>
          {outputs.map((o) => (
            <div key={o.target} className="card mb-md">
              <h3>📁 {o.directoryName}</h3>
              <div style={{ marginTop: 8 }}>
                {o.files.map((f) => (
                  <div key={f.path} className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                    <code>{f.path}</code>
                    <span className="text-secondary text-sm">{f.size} bytes</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {o.files.map((f) => (
                  <a
                    key={f.path}
                    href={`/api/v1/build/${name}/download/${o.directoryName}/${f.path}`}
                    className="btn-primary"
                    style={{ textDecoration: "none" }}
                    download
                  >
                    ⬇️ {f.path}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
