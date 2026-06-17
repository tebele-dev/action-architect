import { useMemo, useState } from "react";
import { useStore } from "@/lib/store.js";
import { ProgressOverview } from "@/components/app/ProgressOverview.js";
import { ActionStepCard } from "@/components/app/ActionStepCard.js";
import { PlanInputDialog } from "@/components/app/PlanInputDialog.js";
import { Inbox, ListFilter } from "lucide-react";

type Filter = "all" | "active" | "done";

export function MainDashboard() {
  const { steps } = useStore();
  const [filter, setFilter] = useState<Filter>("all");

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
      </section>
    </main>
  );
}
