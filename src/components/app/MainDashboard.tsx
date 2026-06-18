import { useMemo, useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store.js";
import { ProgressOverview } from "@/components/app/ProgressOverview.js";
import { ActionStepCard } from "@/components/app/ActionStepCard.js";
import { PlanInputDialog } from "@/components/app/PlanInputDialog.js";
import { Inbox, ListFilter, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";

type Filter = "all" | "active" | "done";

function EditablePlanName({
  plan,
  updatePlan,
}: {
  plan: any;
  updatePlan: (id: string, name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(plan.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== plan.name) {
      updatePlan(plan.id, trimmed);
    } else {
      setValue(plan.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
    if (e.key === "Escape") {
      setValue(plan.name);
      setIsEditing(false);
    }
  };

  const startEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setValue(plan.name);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="truncate max-w-[120px] bg-transparent px-0 py-0 text-sm outline-none border-b border-primary focus:border-primary"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span className="truncate max-w-[120px] cursor-text" onClick={startEditing}>
      {plan.name}
    </span>
  );
}

export function MainDashboard() {
  const { steps, plans, currentPlanId, setCurrentPlan, createPlan, updatePlan, deletePlan } =
    useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const sorted = [...steps].sort((a, b) => a.priority - b.priority || a.step - b.step);
    if (filter === "active") return sorted.filter((s) => !s.completed);
    if (filter === "done") return sorted.filter((s) => s.completed);
    return sorted;
  }, [steps, filter]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <section>
        <div className="mb-4 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Today's plan</h1>
          <p className="text-sm text-muted-foreground">
            Your structured action plan, sorted by priority. Click any step to edit, complete, or
            ask the architect.
          </p>
        </div>
        <ProgressOverview />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Action steps
          </h2>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-0.5 text-xs">
            <ListFilter className="ml-2 size-3 text-muted-foreground" />
            {(["all", "active", "done"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-md px-2.5 py-1 capitalize transition " +
                  (filter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Inbox className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-medium">No plans yet</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Generate your first action plan from a rough idea.
            </p>
            <div className="mt-4">
              <PlanInputDialog />
            </div>
          </div>
        ) : (
          <>
            {/* Plan tabs */}
            <Tabs
              value={currentPlanId || ""}
              onValueChange={(val) => setCurrentPlan(val)}
              className="w-full"
            >
              <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-2">
                <TabsList className="inline-flex h-auto gap-1 bg-transparent p-0">
                  {plans.map((plan) => (
                    <TabsTrigger
                      key={plan.id}
                      value={plan.id}
                      className="group relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-secondary data-[state=active]:shadow-sm"
                    >
                      <EditablePlanName
                        plan={plan}
                        updatePlan={updatePlan}
                        key={plan.id + (editingPlanId === plan.id ? "-editing" : "")}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="size-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm(`Delete plan "${plan.name}" and all its steps?`)) {
                                deletePlan(plan.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 size-3" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TabsTrigger>
                  ))}
                  <PlanInputDialog />
                </TabsList>
              </div>

              <TabsContent value={currentPlanId || ""} className="mt-4">
                {visible.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
                    <div className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                      <Inbox className="size-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-medium">Nothing here yet</h3>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      {filter === "done"
                        ? "Complete a step to see it here."
                        : "Start by generating an action plan from a rough idea."}
                    </p>
                    <div className="mt-4">
                      <PlanInputDialog />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visible.map((s) => (
                      <ActionStepCard key={s.id} s={s} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </section>
    </main>
  );
}
