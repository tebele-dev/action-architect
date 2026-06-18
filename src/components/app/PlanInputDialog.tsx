import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store.js";

const EXAMPLES = [
  "I want to research how spaced repetition affects retention for medical students.",
  "Launch a small newsletter about climate-tech startups within 6 weeks.",
  "Investigate whether short-form video improves onboarding completion in our app.",
];

export function PlanInputDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { generateFromText, generating } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [planName, setPlanName] = useState("");

  const submit = async () => {
    if (!text.trim()) return;
    await generateFromText(text, planName.trim() || undefined);
    setOpen(false);
    setText("");
    setPlanName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Wand2 className="size-4" />
            New plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Turn your plan into action
          </DialogTitle>
          <DialogDescription>
            Paste a rough idea, project goal, or stream-of-thought. We'll structure it into
            prioritized steps.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Plan name (optional)"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="mb-2"
        />

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. I want to validate whether AI tutors can teach high-school physics better than..."
          className="min-h-40 w-full resize-none rounded-md border border-input bg-background p-3 text-sm leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground transition hover:bg-accent"
            >
              {ex.slice(0, 50)}…
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={generating || !text.trim()}>
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Generate action plan
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
