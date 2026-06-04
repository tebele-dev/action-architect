import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, Target, TrendingUp } from "lucide-react";
export function ProgressOverview() {
  const { steps } = useStore();
  const total = steps.length;
  const done = steps.filter((s) => s.completed).length;
  const hours = steps.reduce((a, s) => a + s.hoursSpent, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const tiles = [
    { icon: Target, label: "Completion", value: `${pct}%`, sub: `${done}/${total} steps` },
    { icon: CheckCircle2, label: "Done", value: `${done}`, sub: `${total - done} remaining` },
    { icon: Clock, label: "Hours", value: hours.toFixed(1), sub: "logged across plan" },
    {
      icon: TrendingUp,
      label: "Avg / step",
      value: total ? (hours / total).toFixed(1) : "0.0",
      sub: "hours per item",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <t.icon className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wide">{t.label}</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{t.value}</div>
          <div className="text-xs text-muted-foreground">{t.sub}</div>
        </Card>
      ))}
      <Card className="col-span-2 p-4 md:col-span-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">Overall progress</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
