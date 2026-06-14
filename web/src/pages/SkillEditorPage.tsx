import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { SkillEditorProvider, useSkillEditor, formToYaml } from "../contexts/SkillEditorContext.js";
import { useSkill, useValidate } from "../hooks/useSkills.js";
import { loadTemplateYaml } from "../hooks/useTemplates.js";
import { api } from "../api/client.js";

export function SkillEditorPage() {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !name || name === "new";
  const templateName = searchParams.get("template");
  const templateCat = searchParams.get("category");

  return (
    <SkillEditorProvider initialYaml={undefined}>
      <EditorInner isNew={isNew} skillName={name} templateName={templateName} templateCat={templateCat} />
    </SkillEditorProvider>
  );
}

function EditorInner({ isNew, skillName, templateName, templateCat }: {
  isNew: boolean;
  skillName?: string;
  templateName: string | null;
  templateCat: string | null;
}) {
  const { state, dispatch } = useSkillEditor();
  const { detail, loading, updateSkill } = useSkill(skillName ?? "");
  const { validate, validating } = useValidate();
  const navigate = useNavigate();
  const [tab, setTab] = useState("meta");
  const [yamlPreview, setYamlPreview] = useState("");
  const [valResult, setValResult] = useState<{ success: boolean; errors: Array<{ path: string; message: string }>; warnings: string[] } | null>(null);

  // Load skill data
  useEffect(() => {
    if (isNew && templateName) {
      loadTemplateYaml(templateCat ?? "other", templateName).then((y) => {
        dispatch({ type: "LOAD_YAML", yaml: y });
      });
    } else if (detail) {
      dispatch({ type: "LOAD_YAML", yaml: detail.yaml });
    }
  }, [isNew, templateName, templateCat, detail, dispatch]);

  const tabs = ["meta", "prompts", "variables", "constraints", "eval", "dist"];
  const tabLabels: Record<string, string> = {
    meta: "📋 基本信息", prompts: "💬 提示词", variables: "⚙️ 变量", constraints: "🎛️ 约束", eval: "🧪 评测", dist: "📦 分发",
  };

  const handleSave = async () => {
    const yaml = formToYaml(state);
    setYamlPreview(yaml);
    const result = await validate(yaml);
    setValResult(result);
    if (result.success && !isNew) {
      await updateSkill(yaml);
      alert("保存成功！");
    } else if (result.success && isNew && state.name) {
      try {
        await api.post("/skills", { yaml });
        navigate(`/skills/${state.name}/edit`);
      } catch {
        alert("创建失败，请检查格式");
      }
    }
  };

  if (loading && !isNew) return <p>加载中...</p>;

  return (
    <div>
      <div className="flex-between mb-md">
        <h1>{isNew ? "创建新技能" : `编辑: ${detail?.skill.meta.title ?? skillName}`}</h1>
        <div className="flex gap-sm">
          <button className="btn-secondary" onClick={() => setYamlPreview(formToYaml(state))}>
            📄 查看 YAML
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={validating}>
            {validating ? "校验中..." : "💾 保存"}
          </button>
        </div>
      </div>

      <div className="flex gap-sm mb-md" style={{ flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ borderBottom: tab === t ? "2px solid var(--color-primary)" : "none", background: "none", borderRadius: 0, padding: "8px 16px", fontWeight: tab === t ? 600 : 400 }}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {valResult && !valResult.success && (
        <div className="card mb-md" style={{ border: "1px solid var(--color-error)" }}>
          <h4 style={{ color: "var(--color-error)" }}>校验错误:</h4>
          {valResult.errors.map((e, i) => <p key={i} style={{ fontSize: 13 }}>❌ {e.path}: {e.message}</p>)}
        </div>
      )}
      {valResult?.warnings && valResult.warnings.length > 0 && (
        <div className="card mb-md" style={{ border: "1px solid var(--color-warning)" }}>
          <h4 style={{ color: "var(--color-warning)" }}>{"警告:"}</h4>
          {valResult.warnings.map((w: string, i: number) => <p key={i} style={{ fontSize: 13 }}>{"⚠️ " + w}</p>)}
        </div>
      )}

      <div className="card">
        {tab === "meta" && <MetaTab state={state} dispatch={dispatch} />}
        {tab === "prompts" && <PromptsTab state={state} dispatch={dispatch} />}
        {tab === "variables" && <VariablesTab state={state} dispatch={dispatch} />}
        {tab === "constraints" && <ConstraintsTab state={state} dispatch={dispatch} />}
        {tab === "eval" && <EvalTab state={state} dispatch={dispatch} />}
        {tab === "dist" && <DistTab state={state} dispatch={dispatch} />}
      </div>

      {yamlPreview && (
        <div className="card mt-md">
          <div className="flex-between">
            <h3>📄 YAML 预览</h3>
            <button className="btn-secondary" onClick={() => setYamlPreview("")}>关闭</button>
          </div>
          <pre style={{ background: "#fafafa", padding: 16, borderRadius: 8, overflow: "auto", maxHeight: 400, fontSize: 12, marginTop: 8 }}>
            {yamlPreview}
          </pre>
        </div>
      )}
    </div>
  );
}

// Meta tab
function MetaTab({ state, dispatch }: { state: ReturnType<typeof useSkillEditor>["state"]; dispatch: ReturnType<typeof useSkillEditor>["dispatch"] }) {
  const f = (field: string, label: string, placeholder = "") => (
    <div style={{ marginBottom: 12 }} key={field}>
      <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
      <input value={String(state[field as keyof typeof state] ?? "")} onChange={(e) => dispatch({ type: "SET", field: field as never, value: e.target.value })} placeholder={placeholder} />
    </div>
  );
  return (
    <div className="grid grid-2">
      {f("name", "技能标识 (kebab-case)", "my-awesome-skill")}
      {f("title", "展示名称", "我的技能")}
      {f("version", "版本号", "0.1.0")}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>分类</label>
        <select value={state.category} onChange={(e) => dispatch({ type: "SET", field: "category", value: e.target.value })}>
          {["education","productivity","creative","lifestyle","business","health","tech","other"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {f("author", "作者", "@你的小红书昵称")}
      {f("priceAmount", "价格 (元)", "29.9")}
      <div style={{ marginBottom: 12, gridColumn: "1 / -1" }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>描述</label>
        <textarea value={state.description} onChange={(e) => dispatch({ type: "SET", field: "description", value: e.target.value })} placeholder="一句话描述这个技能" rows={2} />
      </div>
      <div style={{ marginBottom: 12, gridColumn: "1 / -1" }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>标签 (逗号分隔)</label>
        <input value={state.tags} onChange={(e) => dispatch({ type: "SET", field: "tags", value: e.target.value })} placeholder="AI, 工具, 效率" />
      </div>
    </div>
  );
}

// Prompts tab
function PromptsTab({ state, dispatch }: { state: ReturnType<typeof useSkillEditor>["state"]; dispatch: ReturnType<typeof useSkillEditor>["dispatch"] }) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>System Prompt (支持 {"{{variable}}"} 模板)</label>
        <textarea value={state.systemPrompt} onChange={(e) => dispatch({ type: "SET", field: "systemPrompt", value: e.target.value })} rows={8} placeholder="你是一位专业的..." />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>User Prompt 模板</label>
        <textarea value={state.userPrompt} onChange={(e) => dispatch({ type: "SET", field: "userPrompt", value: e.target.value })} rows={3} placeholder="{{message}}" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>开场白</label>
        <textarea value={state.greeting} onChange={(e) => dispatch({ type: "SET", field: "greeting", value: e.target.value })} rows={3} placeholder="你好！我是..." />
      </div>
      <div>
        <div className="flex-between" style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Few-shot 示例</label>
          <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => dispatch({ type: "ADD_EXAMPLE" })}>+ 添加</button>
        </div>
        {state.examples.map((ex, i) => (
          <div key={i} className="card" style={{ marginBottom: 8 }}>
            <div className="flex-between mb-sm">
              <span style={{ fontSize: 12 }}>示例 #{i + 1}</span>
              <button className="btn-danger" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => dispatch({ type: "REMOVE_EXAMPLE", index: i })}>删除</button>
            </div>
            <textarea style={{ marginBottom: 8 }} value={ex.user} onChange={(e) => dispatch({ type: "UPDATE_EXAMPLE", index: i, field: "user", value: e.target.value })} placeholder="用户输入" rows={2} />
            <textarea value={ex.assistant} onChange={(e) => dispatch({ type: "UPDATE_EXAMPLE", index: i, field: "assistant", value: e.target.value })} placeholder="助手回复" rows={2} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Variables tab
function VariablesTab({ state, dispatch }: { state: ReturnType<typeof useSkillEditor>["state"]; dispatch: ReturnType<typeof useSkillEditor>["dispatch"] }) {
  return (
    <div>
      <div className="flex-between mb-sm">
        <h3>变量 ({state.variables.length})</h3>
        <button className="btn-secondary" onClick={() => dispatch({ type: "ADD_VARIABLE" })}>+ 添加变量</button>
      </div>
      {state.variables.map((v, i) => (
        <div key={i} className="card" style={{ marginBottom: 8 }}>
          <div className="flex-between mb-sm">
            <span style={{ fontSize: 12 }}>变量 #{i + 1}</span>
            <button className="btn-danger" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => dispatch({ type: "REMOVE_VARIABLE", index: i })}>删除</button>
          </div>
          <div className="grid grid-2">
            <div><label style={{ fontSize: 12 }}>变量名</label><input value={v.name} onChange={(e) => dispatch({ type: "UPDATE_VARIABLE", index: i, field: "name", value: e.target.value })} placeholder="myVar" /></div>
            <div><label style={{ fontSize: 12 }}>标签</label><input value={v.label} onChange={(e) => dispatch({ type: "UPDATE_VARIABLE", index: i, field: "label", value: e.target.value })} placeholder="我的变量" /></div>
            <div>
              <label style={{ fontSize: 12 }}>类型</label>
              <select value={v.type} onChange={(e) => dispatch({ type: "UPDATE_VARIABLE", index: i, field: "type", value: e.target.value })}>
                {["string","number","boolean","select","multiselect","textarea"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 12 }}>默认值</label><input value={v.defaultVal} onChange={(e) => dispatch({ type: "UPDATE_VARIABLE", index: i, field: "defaultVal", value: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>选项 (逗号分隔, select/multiselect)</label><input value={v.options} onChange={(e) => dispatch({ type: "UPDATE_VARIABLE", index: i, field: "options", value: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>帮助文本</label><input value={v.help} onChange={(e) => dispatch({ type: "UPDATE_VARIABLE", index: i, field: "help", value: e.target.value })} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Constraints tab
function ConstraintsTab({ state, dispatch }: { state: ReturnType<typeof useSkillEditor>["state"]; dispatch: ReturnType<typeof useSkillEditor>["dispatch"] }) {
  return (
    <div className="grid grid-2">
      <div><label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>推荐模型</label><input value={state.preferredModel} onChange={(e) => dispatch({ type: "SET", field: "preferredModel", value: e.target.value })} placeholder="claude-sonnet-4-6" /></div>
      <div><label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Max Tokens</label><input type="number" value={state.maxTokens} onChange={(e) => dispatch({ type: "SET", field: "maxTokens", value: e.target.value })} /></div>
      <div><label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Temperature (0-2)</label><input type="number" step="0.1" value={state.temperature} onChange={(e) => dispatch({ type: "SET", field: "temperature", value: e.target.value })} /></div>
    </div>
  );
}

// Eval tab
function EvalTab({ state, dispatch }: { state: ReturnType<typeof useSkillEditor>["state"]; dispatch: ReturnType<typeof useSkillEditor>["dispatch"] }) {
  return (
    <div>
      <div className="flex-between mb-sm">
        <h3>评测用例 ({state.evalTests.length})</h3>
        <button className="btn-secondary" onClick={() => dispatch({ type: "ADD_EVAL" })}>+ 添加</button>
      </div>
      {state.evalTests.map((t, i) => (
        <div key={i} className="card" style={{ marginBottom: 8 }}>
          <div className="flex-between mb-sm">
            <span>#{i + 1}</span>
            <button className="btn-danger" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => dispatch({ type: "REMOVE_EVAL", index: i })}>删除</button>
          </div>
          <div className="grid grid-2">
            <div><label style={{ fontSize: 12 }}>描述</label><input value={t.description} onChange={(e) => dispatch({ type: "UPDATE_EVAL", index: i, field: "description", value: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>输入 (JSON)</label><input value={t.input} onChange={(e) => dispatch({ type: "UPDATE_EVAL", index: i, field: "input", value: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>期望包含 (逗号分隔)</label><input value={t.expectContains} onChange={(e) => dispatch({ type: "UPDATE_EVAL", index: i, field: "expectContains", value: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>禁止词 (逗号分隔)</label><input value={t.forbid} onChange={(e) => dispatch({ type: "UPDATE_EVAL", index: i, field: "forbid", value: e.target.value })} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Dist tab
function DistTab({ state, dispatch }: { state: ReturnType<typeof useSkillEditor>["state"]; dispatch: ReturnType<typeof useSkillEditor>["dispatch"] }) {
  const allTargets = ["claude-code", "openai-gpt", "hermes", "openclaw", "generic"];
  return (
    <div>
      <h3 className="mb-sm">分发目标</h3>
      {allTargets.map((t) => (
        <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 14 }}>
          <input type="checkbox" checked={state.targets.includes(t)} onChange={() => dispatch({ type: "TOGGLE_TARGET", target: t })} />
          {t}
        </label>
      ))}
    </div>
  );
}
