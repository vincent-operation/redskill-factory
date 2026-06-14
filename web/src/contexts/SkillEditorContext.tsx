import { createContext, useContext, useReducer, type ReactNode } from "react";
import { dump as toYaml, load as fromYaml } from "js-yaml";

// Simplified skill structure for form editing
interface SkillFormState {
  name: string;
  title: string;
  version: string;
  category: string;
  description: string;
  author: string;
  priceAmount: string;
  tags: string;
  systemPrompt: string;
  userPrompt: string;
  greeting: string;
  examples: Array<{ user: string; assistant: string }>;
  variables: Array<{
    name: string; label: string; type: string;
    defaultVal: string; options: string; help: string;
  }>;
  preferredModel: string;
  maxTokens: string;
  temperature: string;
  targets: string[];
  evalTests: Array<{ description: string; input: string; expectContains: string; forbid: string }>;
}

type Action = { type: "LOAD_YAML"; yaml: string } | { type: "SET"; field: keyof SkillFormState; value: unknown } | { type: "ADD_EXAMPLE" } | { type: "REMOVE_EXAMPLE"; index: number } | { type: "UPDATE_EXAMPLE"; index: number; field: "user" | "assistant"; value: string } | { type: "ADD_VARIABLE" } | { type: "REMOVE_VARIABLE"; index: number } | { type: "UPDATE_VARIABLE"; index: number; field: string; value: string } | { type: "ADD_EVAL" } | { type: "REMOVE_EVAL"; index: number } | { type: "UPDATE_EVAL"; index: number; field: string; value: string } | { type: "TOGGLE_TARGET"; target: string };

const initialState: SkillFormState = {
  name: "", title: "", version: "0.1.0", category: "other",
  description: "", author: "@", priceAmount: "",
  tags: "",
  systemPrompt: "", userPrompt: "", greeting: "",
  examples: [],
  variables: [],
  preferredModel: "", maxTokens: "2048", temperature: "0.7",
  targets: ["claude-code"],
  evalTests: [],
};

function reducer(state: SkillFormState, action: Action): SkillFormState {
  switch (action.type) {
    case "LOAD_YAML": {
      try {
        const raw = fromYaml(action.yaml) as Record<string, unknown>;
        const meta = (raw.meta ?? {}) as Record<string, unknown>;
        const prompts = (raw.prompts ?? {}) as Record<string, unknown>;
        const exs = (prompts.examples ?? []) as Array<{ user: string; assistant: string }>;
        const vars = (raw.variables ?? []) as Array<{ name: string; label: string; type: string; default?: string; options?: string[]; help?: string }>;
        const constraints = (raw.constraints ?? {}) as Record<string, unknown>;
        const dist = (raw.distribution ?? {}) as Record<string, unknown>;
        const evalData = (raw.evaluation ?? {}) as Record<string, unknown>;
        const evalTestsArr = (evalData.tests ?? []) as Array<{ description?: string; input: Record<string, unknown>; expect?: { contains?: string[] }; forbid?: string[] }>;

        return {
          ...state,
          name: (meta.name as string) ?? "",
          title: (meta.title as string) ?? "",
          version: (meta.version as string) ?? "0.1.0",
          category: (meta.category as string) ?? "other",
          description: (meta.description as string) ?? "",
          author: (meta.author as string) ?? "@",
          priceAmount: meta.price ? String((meta.price as Record<string,unknown>).amount ?? "") : "",
          tags: Array.isArray(meta.tags) ? (meta.tags as string[]).join(", ") : "",
          systemPrompt: (prompts.system as string) ?? "",
          userPrompt: (prompts.user as string) ?? "",
          greeting: (prompts.greeting as string) ?? "",
          examples: exs.map((e) => ({ user: e.user, assistant: e.assistant })),
          variables: vars.map((v) => ({
            name: v.name, label: v.label, type: v.type,
            defaultVal: v.default !== undefined ? String(v.default) : "",
            options: Array.isArray(v.options) ? v.options.join(", ") : "",
            help: v.help ?? "",
          })),
          preferredModel: (constraints.preferredModel as string) ?? "",
          maxTokens: String(constraints.maxTokens ?? "2048"),
          temperature: String(constraints.temperature ?? "0.7"),
          targets: Array.isArray(dist.targets) ? (dist.targets as string[]) : ["claude-code"],
          evalTests: evalTestsArr.map((t) => ({
            description: t.description ?? "",
            input: JSON.stringify(t.input ?? {}),
            expectContains: t.expect?.contains?.join(", ") ?? "",
            forbid: t.forbid?.join(", ") ?? "",
          })),
        };
      } catch {
        return state;
      }
    }
    case "SET":
      return { ...state, [action.field]: action.value };
    case "ADD_EXAMPLE":
      return { ...state, examples: [...state.examples, { user: "", assistant: "" }] };
    case "REMOVE_EXAMPLE":
      return { ...state, examples: state.examples.filter((_, i) => i !== action.index) };
    case "UPDATE_EXAMPLE": {
      const exs2 = [...state.examples];
      if (exs2[action.index]) {
        exs2[action.index] = { ...exs2[action.index]!, [action.field]: action.value };
      }
      return { ...state, examples: exs2 };
    }
    case "ADD_VARIABLE":
      return { ...state, variables: [...state.variables, { name: "", label: "", type: "string", defaultVal: "", options: "", help: "" }] };
    case "REMOVE_VARIABLE":
      return { ...state, variables: state.variables.filter((_, i) => i !== action.index) };
    case "UPDATE_VARIABLE": {
      const vars2 = [...state.variables];
      if (vars2[action.index]) {
        vars2[action.index] = { ...vars2[action.index]!, [action.field]: action.value };
      }
      return { ...state, variables: vars2 };
    }
    case "TOGGLE_TARGET": {
      const ts = state.targets.includes(action.target)
        ? state.targets.filter((t) => t !== action.target)
        : [...state.targets, action.target];
      return { ...state, targets: ts };
    }
    case "ADD_EVAL":
      return { ...state, evalTests: [...state.evalTests, { description: "", input: "{}", expectContains: "", forbid: "" }] };
    case "REMOVE_EVAL":
      return { ...state, evalTests: state.evalTests.filter((_, i) => i !== action.index) };
    case "UPDATE_EVAL": {
      const evs = [...state.evalTests];
      if (evs[action.index]) {
        evs[action.index] = { ...evs[action.index]!, [action.field]: action.value };
      }
      return { ...state, evalTests: evs };
    }
    default:
      return state;
  }
}

// Serialize form state back to YAML string
export function formToYaml(state: SkillFormState): string {
  const obj: Record<string, unknown> = {
    meta: {
      name: state.name,
      title: state.title,
      version: state.version,
      category: state.category,
      description: state.description,
      author: state.author,
      tags: state.tags.split(",").map((t) => t.trim()).filter(Boolean),
      ...(state.priceAmount ? { price: { amount: parseFloat(state.priceAmount), currency: "CNY" } } : {}),
    },
    prompts: {
      system: state.systemPrompt,
      ...(state.userPrompt ? { user: state.userPrompt } : {}),
      ...(state.greeting ? { greeting: state.greeting } : {}),
      ...(state.examples.length > 0 ? { examples: state.examples.filter((e) => e.user || e.assistant) } : {}),
    },
    variables: state.variables
      .filter((v) => v.name)
      .map((v) => ({
        name: v.name,
        label: v.label || v.name,
        type: v.type,
        ...(v.defaultVal ? { default: v.type === "number" ? parseFloat(v.defaultVal) : v.defaultVal } : {}),
        ...(v.options ? { options: v.options.split(",").map((o) => o.trim()).filter(Boolean) } : {}),
        ...(v.help ? { help: v.help } : {}),
      })),
    constraints: {
      ...(state.preferredModel ? { preferredModel: state.preferredModel } : {}),
      maxTokens: parseInt(state.maxTokens, 10) || 2048,
      temperature: parseFloat(state.temperature) || 0.7,
    },
    distribution: {
      targets: state.targets,
    },
    ...(state.evalTests.length > 0 ? {
      evaluation: {
        tests: state.evalTests.filter((t) => t.description).map((t) => ({
          description: t.description,
          input: JSON.parse(t.input || "{}"),
          ...(t.expectContains ? { expect: { contains: t.expectContains.split(",").map((s) => s.trim()).filter(Boolean) } } : {}),
          ...(t.forbid ? { forbid: t.forbid.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
        })),
      },
    } : {}),
  };
  return toYaml(obj, { indent: 2, lineWidth: 120 });
}

interface ContextValue {
  state: SkillFormState;
  dispatch: React.Dispatch<Action>;
}

const Ctx = createContext<ContextValue | null>(null);

export function SkillEditorProvider({ children, initialYaml }: { children: ReactNode; initialYaml?: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load initial YAML on mount
  if (initialYaml && !state.name) {
    dispatch({ type: "LOAD_YAML", yaml: initialYaml });
  }

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useSkillEditor() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSkillEditor must be used within SkillEditorProvider");
  return ctx;
}
