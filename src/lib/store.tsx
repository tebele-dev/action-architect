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

interface AuthResponse {
  id: string;
  name: string;
  email: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface StoreCtx {
  steps: ActionStep[];
  messages: ChatMessage[];
  selectedStepId: string | null;
  chatOpen: boolean;
  generating: boolean;
  user: AuthResponse | null;
  accessToken: string | null;
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
  signup: (name: string, email: string, password: string) => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  signout: () => void;
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

class ApiClient {
  private getToken(): string | null {
    try {
      const token = localStorage.getItem("authToken");
      return token || null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    path: string,
    init?: RequestInit & { requiresAuth?: boolean },
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((init?.headers as Record<string, string>) ?? {}),
    };

    if (init?.requiresAuth !== false) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(resolveApiUrl(path), {
      ...init,
      headers,
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        body?.error || body?.message || response.statusText || "API request failed";

      if (response.status === 401 && init?.requiresAuth !== false) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }

      throw new Error(errorMessage);
    }

    return body?.data as T;
  }

  async get<T>(path: string, options?: { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>(path, {
      method: "GET",
      ...options,
    });
  }

  async post<T>(path: string, data?: any, options?: { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put<T>(path: string, data?: any, options?: { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async patch<T>(path: string, data?: any, options?: { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(path: string, options?: { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
      ...options,
    });
  }
}

const apiClient = new ApiClient();

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
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    const storedToken = localStorage.getItem("authToken");

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedToken);
      } catch {
        localStorage.removeItem("authUser");
        localStorage.removeItem("authToken");
      }
    }
  }, []);

  const updateStepLocal = useCallback((updatedStep: ActionStep) => {
    setSteps((current) => current.map((step) => (step.id === updatedStep.id ? updatedStep : step)));
  }, []);

  const loadActivePlan = useCallback(async () => {
    const plans = await apiClient.get<
      Array<{
        id: string;
        steps: any[];
      }>
    >("/api/plans");

    if (plans.length > 0) {
      setPlanId(plans[0].id);
      setSteps(plans[0].steps.map(normalizeStep));
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadActivePlan().catch(() => {});
    }
  }, [user, loadActivePlan]);

  const toggleComplete = useCallback(
    (id: string) => {
      const existing = steps.find((step) => step.id === id);
      if (!existing) return;
      const completed = !existing.completed;
      void apiClient
        .patch<any>(`/api/steps/${id}/complete`, { completed })
        .then((updated) => updateStepLocal(normalizeStep(updated)))
        .catch(() => {});
    },
    [steps, updateStepLocal],
  );

  const updateHours = useCallback(
    (id: string, hours: number) => {
      void apiClient
        .put<any>(`/api/steps/${id}`, {
          hoursSpent: Math.max(0, hours),
        })
        .then((updated) => updateStepLocal(normalizeStep(updated)))
        .catch(() => {});
    },
    [updateStepLocal],
  );

  const updateStep = useCallback(
    (id: string, patch: Partial<ActionStep>) => {
      void apiClient
        .put<any>(`/api/steps/${id}`, {
          action: patch.action,
          why: patch.why,
          priority: patch.priority,
          hoursSpent: patch.hoursSpent,
          stepNumber: patch.step,
        })
        .then((updated) => updateStepLocal(normalizeStep(updated)))
        .catch(() => {});
    },
    [updateStepLocal],
  );

  const setPriority = useCallback(
    (id: string, priority: number) => {
      void apiClient
        .put<any>(`/api/steps/${id}`, { priority })
        .then((updated) => updateStepLocal(normalizeStep(updated)))
        .catch(() => {});
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
          void Promise.all([
            apiClient.put<any>(`/api/steps/${first.id}`, { stepNumber: second.step }),
            apiClient.put<any>(`/api/steps/${second.id}`, { stepNumber: first.step }),
          ]).catch(() => {});
        }
        return nextSteps;
      });
    },
    [planId],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      setGenerating(true);

      try {
        const userData = await apiClient.post<AuthResponse>(
          "/api/auth/register",
          {
            name,
            email,
            password,
          },
          { requiresAuth: false },
        );

        const loginData = await apiClient.post<LoginResponse>(
          "/api/auth/login",
          {
            email,
            password,
          },
          { requiresAuth: false },
        );

        localStorage.setItem("authToken", loginData.accessToken);
        setAccessToken(loginData.accessToken);

        localStorage.setItem("authUser", JSON.stringify(userData));
        setUser(userData);
      } catch (error) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setAccessToken(null);
        throw error;
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  const signin = useCallback(async (email: string, password: string): Promise<void> => {
    setGenerating(true);
    try {
      const loginData = await apiClient.post<LoginResponse>(
        "/api/auth/login",
        {
          email,
          password,
        },
        { requiresAuth: false },
      );

      localStorage.setItem("authToken", loginData.accessToken);
      setAccessToken(loginData.accessToken);

      const userData = await apiClient.get<AuthResponse>("/api/auth/me", {
        requiresAuth: true,
      });

      localStorage.setItem("authUser", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setAccessToken(null);
      throw error;
    } finally {
      setGenerating(false);
    }
  }, []);

  const signout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
    setAccessToken(null);
    setPlanId(null);
    setSteps([]);
    setChatSessionId(null);
    setMessages([
      {
        id: "m0",
        role: "assistant",
        content: "You've been signed out. Sign in to continue.",
      },
    ]);
    setSelectedStepId(null);
  }, []);

  const generateFromText = useCallback(async (text: string) => {
    setGenerating(true);
    try {
      const result = await apiClient.post<{
        planId: string;
        steps: any[];
      }>("/api/plans/generate", { input: text });

      setPlanId(result.planId);
      setSteps(result.steps.map(normalizeStep));
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

      void apiClient
        .post<{
          sessionId: string;
          response: string;
        }>("/api/chat", {
          sessionId: chatSessionId ?? undefined,
          stepId: selectedStepId ?? undefined,
          message: content,
        })
        .then((result) => {
          setChatSessionId(result.sessionId);
          setMessages((current) => [
            ...current,
            { id: `a${Date.now()}`, role: "assistant", content: result.response },
          ]);
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : "Unable to reach chat service";
          setMessages((current) => [
            ...current,
            { id: `a${Date.now()}`, role: "assistant", content: `Error: ${message}` },
          ]);
        });
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
        user,
        accessToken,
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
        signin,
        signup,
        signout,
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
