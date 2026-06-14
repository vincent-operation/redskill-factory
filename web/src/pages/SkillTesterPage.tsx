import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePlayground, runEval } from "../hooks/usePlayground.js";
import { useSkill } from "../hooks/useSkills.js";

export function SkillTesterPage() {
  const { name } = useParams<{ name: string }>();
  const { detail, loading: skillLoading } = useSkill(name ?? "");
  const { messages, loading: chatLoading, startSession, sendMessage } = usePlayground();
  const [input, setInput] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [evalReport, setEvalReport] = useState<{
    total: number; pass: number; fail: number;
    details: Array<{ description: string; passed: boolean; checks: Array<{ type: string; expected: string; passed: boolean }>; response?: string }>;
  } | null>(null);
  const [evalRunning, setEvalRunning] = useState(false);

  useEffect(() => {
    if (detail?.skill) {
      const defaults: Record<string, string> = {};
      for (const v of detail.skill.variables) {
        defaults[v.name] = v.default !== undefined ? String(v.default) : "";
      }
      setVars(defaults);
    }
  }, [detail]);

  const handleStart = async () => {
    if (!name) return;
    const varsObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(vars)) {
      varsObj[k] = v || undefined;
    }
    await startSession(name, varsObj);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  const handleEval = async () => {
    if (!name) return;
    setEvalRunning(true);
    const varsObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(vars)) varsObj[k] = v || undefined;
    const report = await runEval(name, varsObj);
    setEvalReport(report);
    setEvalRunning(false);
  };

  if (skillLoading) return <p>加载中...</p>;
  if (!detail) return <p>技能未找到</p>;

  const skill = detail.skill;

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 120px)" }}>
      {/* Left: Variables */}
      <div className="card" style={{ width: 220, flexShrink: 0, overflow: "auto" }}>
        <h4 className="mb-sm">⚙️ 变量</h4>
        {skill.variables.map((v) => (
          <div key={v.name} style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, display: "block" }}>{v.label} ({v.type})</label>
            {v.type === "select" && v.options ? (
              <select value={vars[v.name] ?? ""} onChange={(e) => setVars({ ...vars, [v.name]: e.target.value })}>
                {v.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input value={vars[v.name] ?? ""} onChange={(e) => setVars({ ...vars, [v.name]: e.target.value })} placeholder={v.help} />
            )}
          </div>
        ))}
        <button className="btn-primary" onClick={handleStart} style={{ width: "100%", marginTop: 8 }}>开始测试</button>
        <button className="btn-secondary" onClick={handleEval} disabled={evalRunning} style={{ width: "100%", marginTop: 8 }}>
          {evalRunning ? "评测中..." : "🧪 运行评测"}
        </button>
      </div>

      {/* Center: Chat */}
      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "auto", marginBottom: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              textAlign: msg.role === "user" ? "right" : "left",
              marginBottom: 8,
            }}>
              <div style={{
                display: "inline-block",
                padding: "8px 14px",
                borderRadius: 12,
                background: msg.role === "user" ? "var(--color-primary)" : "var(--color-border)",
                color: msg.role === "user" ? "#fff" : "var(--color-text)",
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
                fontSize: 14,
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && <p className="text-secondary text-sm">AI 正在回复...</p>}
        </div>
        <div className="flex gap-sm">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入消息..."
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleSend} disabled={chatLoading}>发送</button>
        </div>
      </div>

      {/* Right: Eval results */}
      {evalReport && (
        <div className="card" style={{ width: 300, flexShrink: 0, overflow: "auto" }}>
          <h4 className="mb-sm">📊 评测结果</h4>
          <p style={{ fontSize: 14 }}>通过: {evalReport.pass}/{evalReport.total} ({Math.round(evalReport.pass / evalReport.total * 100)}%)</p>
          {evalReport.details.map((d, i) => (
            <div key={i} style={{ marginTop: 8, padding: 8, background: d.passed ? "#e8f5e9" : "#fce4ec", borderRadius: 6, fontSize: 12 }}>
              <strong>{d.passed ? "✅" : "❌"} {d.description}</strong>
              {d.checks.map((c, j) => (
                <div key={j} style={{ marginTop: 2 }}>{c.passed ? "✓" : "✗"} {c.type}: "{c.expected}"</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
