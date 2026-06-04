import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
export function ChatbotPanel() {
  const {
    chatOpen,
    setChatOpen,
    messages,
    sendMessage,
    selectedStepId,
    steps,
    setSelectedStepId,
    clearChat,
  } = useStore();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const ctxStep = steps.find((s) => s.id === selectedStepId) ?? null;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatOpen]);
  const submit = () => {
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText("");
  };
  return (
    <Sheet open={chatOpen} onOpenChange={setChatOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold">Research architect</span>
              <span className="text-xs font-normal text-muted-foreground">
                AI assistant · backend powered
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {ctxStep && (
          <div className="flex items-center gap-2 border-b border-border bg-accent/40 px-4 py-2 text-xs">
            <Sparkles className="size-3 text-primary" />
            <span className="truncate">
              Context: <span className="font-medium text-foreground">{ctxStep.action}</span>
            </span>
            <button
              onClick={() => setSelectedStepId(null)}
              className="ml-auto rounded p-1 hover:bg-background"
              aria-label="Clear context"
            >
              <X className="size-3" />
            </button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <div className="mb-2 flex justify-between">
            <span className="text-xs text-muted-foreground">
              {ctxStep ? "Asking about selected step" : "General question"}
            </span>
            <button
              onClick={clearChat}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask about a step, request research…"
              rows={2}
              className="flex-1 resize-none rounded-md border border-input bg-background p-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <Button size="icon" onClick={submit} disabled={!text.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
