import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "../api/client.js";

export interface SkillSummary {
  name: string;
  title: string;
  version: string;
  category: string;
  description: string;
  author: string;
  price: { amount: number; currency: string } | null;
  tags: string[];
  path: string;
}

interface SkillDetail {
  skill: {
    meta: { name: string; title: string; version: string; category: string; description: string; author: string; price: { amount: number; currency: string } | null; tags: string[] };
    prompts: { system: string; user?: string; examples?: Array<{ user: string; assistant: string }>; greeting?: string };
    variables: Array<{ name: string; label: string; type: string; default?: unknown; options?: string[]; help?: string }>;
    constraints?: Record<string, unknown>;
    evaluation?: { tests: Array<{ description?: string; input: Record<string, unknown>; expect?: { contains?: string[] }; forbid?: string[] }> };
    distribution: { targets: string[] };
  };
  yaml: string;
}

export function useSkills() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ skills: SkillSummary[] }>("/skills");
      setSkills(data.skills);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const createSkill = async (yaml: string) => {
    await api.post("/skills", { yaml });
    await fetchSkills();
  };

  const deleteSkill = async (name: string) => {
    await api.delete(`/skills/${encodeURIComponent(name)}`);
    await fetchSkills();
  };

  return { skills, loading, error, refetch: fetchSkills, createSkill, deleteSkill };
}

export function useSkill(name: string) {
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    api.get<SkillDetail>(`/skills/${encodeURIComponent(name)}`)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [name]);

  const updateSkill = async (yaml: string) => {
    await api.put(`/skills/${encodeURIComponent(name)}`, { yaml });
    setDetail((prev) => prev ? { ...prev, yaml } : null);
  };

  return { detail, loading, error, updateSkill };
}

export function useValidate() {
  const [validating, setValidating] = useState(false);

  const validate = async (yaml: string) => {
    setValidating(true);
    try {
      return await api.post<{
        success: boolean;
        errors: Array<{ path: string; message: string }>;
        warnings: string[];
      }>("/skills/validate", { yaml });
    } finally {
      setValidating(false);
    }
  };

  return { validate, validating };
}
