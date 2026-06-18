import { useState } from "react";
import { ActionStep, useStore } from "@/lib/store.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Checkbox } from "@/components/ui/checkbox.js";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Pencil,
  Check,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils.js";
import { Textarea } from "../ui/textarea.js";

const priorityMeta: Record<
  number,
  {
    label: string;
    cls: string;
  }
> = {
  1: { label: "P1 · High", cls: "bg-[oklch(0.95_0.06_25)] text-[oklch(0.42_0.18_25)]" },
  2: { label: "P2 · Med", cls: "bg-[oklch(0.96_0.06_70)] text-[oklch(0.42_0.14_70)]" },
  3: { label: "P3 · Low", cls: "bg-[oklch(0.95_0.06_160)] text-[oklch(0.4_0.12_160)]" },
};

export function ActionStepCard({ s }: { s: ActionStep }) {
  const {
    toggleComplete,
    updateHours,
    updateStep,
    setPriority,
    reorder,
    setSelectedStepId,
    setChatOpen,
    selectedStepId,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftAction, setDraftAction] = useState(s.action);
  const [draftWhy, setDraftWhy] = useState(s.why);
  const meta = priorityMeta[s.priority] ?? priorityMeta[3];
  const isSelected = selectedStepId === s.id;
  const saveEdit = () => {
    updateStep(s.id, { action: draftAction.trim() || s.action, why: draftWhy.trim() || s.why });
    setEditing(false);
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-4 transition-all hover:shadow-md",
        s.completed && "opacity-70",
        isSelected && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={s.completed}
          onCheckedChange={() => toggleComplete(s.id)}
          className="mt-1"
          aria-label="Toggle complete"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">#{s.step}</span>
            <button
              onClick={() => {
                const next = s.priority === 3 ? 1 : s.priority + 1;
                setPriority(s.id, next);
              }}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition hover:opacity-80",
                meta.cls,
              )}
              title="Click to cycle priority"
            >
              {meta.label}
            </button>
            {s.completed && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                done
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Input value={draftAction} onChange={(e) => setDraftAction(e.target.value)} />
              <Textarea
                value={draftWhy}
                onChange={(e) => setDraftWhy(e.target.value)}
                className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>
                  <Check className="size-4" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  <X className="size-4" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3
                className={cn(
                  "mt-1 text-base font-medium leading-snug",
                  s.completed && "line-through text-muted-foreground",
                )}
              >
                {s.action}
              </h3>
              {open && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.why}</p>
              )}
            </>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              Why
            </button>

            <div className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">hrs</span>
              <Input
                type="number"
                step="0.25"
                min={0}
                value={s.hoursSpent}
                onChange={(e) => updateHours(s.id, Number(e.target.value) || 0)}
                className="h-6 w-16 border-0 p-1 text-xs focus-visible:ring-0"
              />
            </div>

            <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => reorder(s.id, "up")}
                title="Move up"
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => reorder(s.id, "down")}
                title="Move down"
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setEditing(true)}
                title="Edit"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => {
                  setSelectedStepId(s.id);
                  setChatOpen(true);
                }}
                title="Ask architect"
              >
                <MessageCircle className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
