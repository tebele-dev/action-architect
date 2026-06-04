import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
export interface ActionStep {
  id: string;
  step: number;
  action: string;
  why: string;
  priority: number;
  completed: boolean;
  hoursSpent: number;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  contextStepId?: string;
}
interface StoreCtx {
  steps: ActionStep[];
  messages: ChatMessage[];
  selectedStepId: string | null;
  chatOpen: boolean;
  generating: boolean;
  setSelectedStepId: (id: string | null) => void;
  setChatOpen: (open: boolean) => void;
  toggleComplete: (id: string) => void;
  updateHours: (id: string, hours: number) => void;
  updateStep: (id: string, patch: Partial<ActionStep>) => void;
  setPriority: (id: string, priority: number) => void;
  reorder: (id: string, dir: "up" | "down") => void;
  generateFromText: (text: string) => Promise<void>;
  sendMessage: (content: string) => void;
  clearChat: () => void;
}
const Ctx = createContext<StoreCtx | null>(null);
const API_BASE = process.env.VITE_API_BASE_URL ?? "http://localhost:3000";
function resolveApiUrl(path: string) {
  return `${API_BASE}${path}`;
}
function normalizeStep(step: any): ActionStep {
  return {
    id: step.id,
    step: Number(step.step ?? step.stepNumber ?? 0),
    action: step.action ?? "",
    why: step.why ?? "",
    priority: Number(step.priority ?? 1),
    completed: Boolean(step.completed),
    hoursSpent: Number(step.hoursSpent ?? 0),
  };
}
async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error || body?.message || response.statusText || "API request failed";
    throw new Error(message);
  }
  return body?.data as T;
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<ActionStep[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "assistant",
      content: "Hi, I'm your research architect. Select a step or ask me anything about your plan.",
    },
  ]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const updateStepLocal = useCallback((updatedStep: ActionStep) => {
    setSteps((current) => current.map((step) => (step.id === updatedStep.id ? updatedStep : step)));
  }, []);
  const loadActivePlan = useCallback(async () => {
    try {
      const plans = await fetchJson<
        Array<{
          id: string;
          steps: any[];
        }>
      >("/api/plans");
      if (plans.length > 0) {
        setPlanId(plans[0].id);
        setSteps(plans[0].steps.map(normalizeStep));
      }
    } catch (error) {
      console.error("Unable to load plan:", error);
    }
  }, []);
  useEffect(() => {
    void loadActivePlan();
  }, [loadActivePlan]);
  const toggleComplete = useCallback(
    (id: string) => {
      const existing = steps.find((step) => step.id === id);
      if (!existing) return;
      const completed = !existing.completed;
      void (async () => {
        try {
          const updated = await fetchJson<any>(`/api/steps/${id}/complete`, {
            method: "PATCH",
            body: JSON.stringify({ completed }),
          });
          updateStepLocal(normalizeStep(updated));
        } catch (error) {
          console.error("Unable to update completion:", error);
        }
      })();
    },
    [steps, updateStepLocal],
  );
  const updateHours = useCallback(
    (id: string, hours: number) => {
      void (async () => {
        try {
          const updated = await fetchJson<any>(`/api/steps/${id}`, {
            method: "PUT",
            body: JSON.stringify({ hoursSpent: Math.max(0, hours) }),
          });
          updateStepLocal(normalizeStep(updated));
        } catch (error) {
          console.error("Unable to update hours:", error);
        }
      })();
    },
    [updateStepLocal],
  );
  const updateStep = useCallback(
    (id: string, patch: Partial<ActionStep>) => {
      void (async () => {
        try {
          const updated = await fetchJson<any>(`/api/steps/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              action: patch.action,
              why: patch.why,
              priority: patch.priority,
              hoursSpent: patch.hoursSpent,
              stepNumber: patch.step,
            }),
          });
          updateStepLocal(normalizeStep(updated));
        } catch (error) {
          console.error("Unable to update step:", error);
        }
      })();
    },
    [updateStepLocal],
  );
  const setPriority = useCallback(
    (id: string, priority: number) => {
      void (async () => {
        try {
          const updated = await fetchJson<any>(`/api/steps/${id}`, {
            method: "PUT",
            body: JSON.stringify({ priority }),
          });
          updateStepLocal(normalizeStep(updated));
        } catch (error) {
          console.error("Unable to update priority:", error);
        }
      })();
    },
    [updateStepLocal],
  );
  const reorder = useCallback(
    (id: string, dir: "up" | "down") => {
      setSteps((current) => {
        const sorted = [...current].sort((a, b) => a.priority - b.priority || a.step - b.step);
        const idx = sorted.findIndex((step) => step.id === id);
        if (idx < 0) return current;
        const swapIndex = dir === "up" ? idx - 1 : idx + 1;
        if (swapIndex < 0 || swapIndex >= sorted.length) return current;
        const first = sorted[idx];
        const second = sorted[swapIndex];
        const nextSteps = sorted.map((step) => {
          if (step.id === first.id) return { ...step, step: second.step };
          if (step.id === second.id) return { ...step, step: first.step };
          return step;
        });
        if (planId) {
          void (async () => {
            try {
              await fetchJson<any>(`/api/steps/${first.id}`, {
                method: "PUT",
                body: JSON.stringify({ stepNumber: second.step }),
              });
              await fetchJson<any>(`/api/steps/${second.id}`, {
                method: "PUT",
                body: JSON.stringify({ stepNumber: first.step }),
              });
            } catch (error) {
              console.error("Unable to reorder steps:", error);
            }
          })();
        }
        return nextSteps;
      });
    },
    [planId],
  );
  const generateFromText = useCallback(async (text: string) => {
    setGenerating(true);
    try {
      const result = await fetchJson<{
        planId: string;
        steps: any[];
      }>("/api/plans/generate", {
        method: "POST",
        body: JSON.stringify({ input: text }),
      });
      setPlanId(result.planId);
      setSteps(result.steps.map(normalizeStep));
    } catch (error) {
      console.error("Unable to generate plan:", error);
    } finally {
      setGenerating(false);
    }
  }, []);
  const sendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = {
        id: `u${Date.now()}`,
        role: "user",
        content,
        contextStepId: selectedStepId ?? undefined,
      };
      setMessages((current) => [...current, userMsg]);
      void (async () => {
        try {
          const result = await fetchJson<{
            sessionId: string;
            response: string;
          }>("/api/chat", {
            method: "POST",
            body: JSON.stringify({
              sessionId: chatSessionId ?? undefined,
              stepId: selectedStepId ?? undefined,
              message: content,
            }),
          });
          setChatSessionId(result.sessionId);
          setMessages((current) => [
            ...current,
            { id: `a${Date.now()}`, role: "assistant", content: result.response },
          ]);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to reach chat service";
          setMessages((current) => [
            ...current,
            { id: `a${Date.now()}`, role: "assistant", content: `Error: ${message}` },
          ]);
        }
      })();
    },
    [selectedStepId, chatSessionId],
  );
  const clearChat = useCallback(() => {
    setChatSessionId(null);
    setMessages([
      { id: "m0", role: "assistant", content: "Fresh start. What would you like to dig into?" },
    ]);
  }, []);
  return (
    <Ctx.Provider
      value={{
        steps,
        messages,
        selectedStepId,
        chatOpen,
        generating,
        setSelectedStepId,
        setChatOpen,
        toggleComplete,
        updateHours,
        updateStep,
        setPriority,
        reorder,
        generateFromText,
        sendMessage,
        clearChat,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}
