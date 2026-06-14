import { useState, useEffect } from "react";
import { api, ApiError } from "../api/client.js";

export interface TemplateSummary {
  name: string;
  title: string;
  category: string;
  description: string;
  price: { amount: number; currency: string } | null;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Record<string, TemplateSummary[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ templates: Record<string, TemplateSummary[]> }>("/templates")
      .then((data) => setTemplates(data.templates))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return { templates, loading, error };
}

export async function loadTemplateYaml(category: string, name: string): Promise<string> {
  const data = await api.get<{ yaml: string }>(`/templates/${encodeURIComponent(category)}/${encodeURIComponent(name)}`);
  return data.yaml;
}
