import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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

const SAMPLE: ActionStep[] = [
  { id: "s1", step: 1, action: "Define research scope and key questions", why: "A clear scope prevents wasted effort and keeps the project focused on outcomes that matter.", priority: 1, completed: true, hoursSpent: 2 },
  { id: "s2", step: 2, action: "Survey existing literature & prior art", why: "Understanding what's been done avoids duplication and reveals gaps worth pursuing.", priority: 1, completed: false, hoursSpent: 1.5 },
  { id: "s3", step: 3, action: "Draft a structured methodology document", why: "A written method makes results reproducible and surfaces flaws before you spend time executing.", priority: 2, completed: false, hoursSpent: 0 },
  { id: "s4", step: 4, action: "Collect a small pilot dataset", why: "A pilot validates your pipeline end-to-end before you invest in full data collection.", priority: 2, completed: false, hoursSpent: 0 },
  { id: "s5", step: 5, action: "Build analysis notebook with reusable utilities", why: "Reusable code dramatically speeds up the iteration cycles that follow.", priority: 3, completed: false, hoursSpent: 0 },
  { id: "s6", step: 6, action: "Write up early findings as a one-pager", why: "Forcing a writeup early exposes weak conclusions while they're still cheap to fix.", priority: 3, completed: false, hoursSpent: 0 },
];

function mockGenerate(input: string): ActionStep[] {
  const verbs = ["Outline", "Research", "Draft", "Validate", "Build", "Review", "Publish"];
  const reasons = [
    "This unblocks downstream work and gives you a concrete artifact to iterate on.",
    "Doing this early surfaces hidden assumptions before they become costly.",
    "A focused pass here compounds into faster decisions later.",
    "This converts vague intent into a measurable milestone.",
    "Establishing this lets you delegate or parallelize the rest of the work.",
    "You'll need this baseline to evaluate whether later steps actually work.",
    "Shipping this creates the feedback loop that drives quality up.",
  ];
  const topic = input.trim().split(/\s+/).slice(0, 6).join(" ") || "your goal";
  const count = 6;
  return Array.from({ length: count }, (_, i) => ({
    id: `g${Date.now()}_${i}`,
    step: i + 1,
    action: `${verbs[i % verbs.length]} ${topic.toLowerCase()} — phase ${i + 1}`,
    why: reasons[i % reasons.length],
    priority: i < 2 ? 1 : i < 4 ? 2 : 3,
    completed: false,
    hoursSpent: 0,
  }));
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<ActionStep[]>(SAMPLE);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m0", role: "assistant", content: "Hi — I'm your research copilot. Select a step or ask me anything about your plan." },
  ]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const toggleComplete = useCallback((id: string) => {
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, completed: !x.completed } : x)));
  }, []);
  const updateHours = useCallback((id: string, hours: number) => {
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, hoursSpent: Math.max(0, hours) } : x)));
  }, []);
  const updateStep = useCallback((id: string, patch: Partial<ActionStep>) => {
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);
  const setPriority = useCallback((id: string, priority: number) => {
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, priority } : x)));
  }, []);
  const reorder = useCallback((id: string, dir: "up" | "down") => {
    setSteps((s) => {
      const sorted = [...s].sort((a, b) => a.priority - b.priority || a.step - b.step);
      const idx = sorted.findIndex((x) => x.id === id);
      if (idx < 0) return s;
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= sorted.length) return s;
      const a = sorted[idx];
      const b = sorted[swap];
      return s.map((x) => {
        if (x.id === a.id) return { ...x, step: b.step, priority: b.priority };
        if (x.id === b.id) return { ...x, step: a.step, priority: a.priority };
        return x;
      });
    });
  }, []);

  const generateFromText = useCallback(async (text: string) => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1400));
    setSteps(mockGenerate(text));
    setGenerating(false);
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = { id: `u${Date.now()}`, role: "user", content, contextStepId: selectedStepId ?? undefined };
      setMessages((m) => [...m, userMsg]);
      setTimeout(() => {
        const ctxStep = selectedStepId ? SAMPLE.concat(steps).find((s) => s.id === selectedStepId) : null;
        const reply = ctxStep
          ? `For "${ctxStep.action}": ${ctxStep.why} A practical next move would be to block 45 minutes today, list the 3 unknowns, and resolve the smallest one first.`
          : `Here's a quick take: break "${content.slice(0, 60)}" into the smallest reversible step you can ship in under an hour. That preserves momentum and creates a feedback loop.`;
        setMessages((m) => [...m, { id: `a${Date.now()}`, role: "assistant", content: reply }]);
      }, 700);
    },
    [selectedStepId, steps],
  );

  const clearChat = useCallback(() => setMessages([{ id: "m0", role: "assistant", content: "Fresh start. What would you like to dig into?" }]), []);

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