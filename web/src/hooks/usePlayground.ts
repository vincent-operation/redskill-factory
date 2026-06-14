import { useState, useCallback, useRef } from "react";
import { api } from "../api/client.js";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function usePlayground() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const startSession = useCallback(async (skillName: string, variables?: Record<string, unknown>) => {
    setMessages([]);
    setLoading(true);
    const data = await api.post<{ sessionId: string; greeting: string | null }>(
      "/test/session/new",
      { skillName, variables },
    );
    setSessionId(data.sessionId);
    sessionIdRef.current = data.sessionId;
    if (data.greeting) {
      setMessages([{ role: "assistant", content: data.greeting }]);
    }
    setLoading(false);
    return data;
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!sessionIdRef.current) return;
    const sid = sessionIdRef.current;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);
    const data = await api.post<{ response: string }>(
      `/test/session/${sid}/message`,
      { message },
    );
    setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    setLoading(false);
  }, []);

  const endSession = useCallback(async () => {
    if (sessionIdRef.current) {
      await api.delete(`/test/session/${sessionIdRef.current}`);
    }
    setSessionId(null);
    sessionIdRef.current = null;
  }, []);

  return { sessionId, messages, loading, startSession, sendMessage, endSession };
}

export async function runEval(skillName: string, variables?: Record<string, unknown>) {
  return api.post<{
    total: number; pass: number; fail: number;
    details: Array<{ description: string; passed: boolean; checks: Array<{ type: string; expected: string; passed: boolean }>; response?: string }>;
  }>("/test/eval", { skillName, variables });
}
