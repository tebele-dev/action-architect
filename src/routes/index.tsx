import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store.js";
import { ChatbotPanel } from "@/components/app/ChatbotPanel.js";
import { MainDashboard } from "@/components/app/MainDashboard.js";
import { SignInForm } from "@/components/auth/SignInForm.js";
import { SignUpForm } from "@/components/auth/SignUpForm.js";
import { Button } from "@/components/ui/button.js";
import { Bot, Sparkles, LogOut } from "lucide-react";
import { PlanInputDialog } from "@/components/app/PlanInputDialog.js";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Action Architect — Plan, Prioritize, Track" },
      {
        name: "description",
        content: "Turn unstructured plans into prioritized action steps and track hours per day.",
      },
      { property: "og:title", content: "Action Architect" },
      {
        property: "og:description",
        content: "Turn unstructured plans into prioritized action steps.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { signout, generating, user, setChatOpen } = useStore();
  const [activeForm, setActiveForm] = useState<"signin" | "signup">("signin");

  const isAuthenticated = !!user;

  const handleSignOut = () => {
    signout();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex justify-center">
            <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
          </div>
          <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
            Action Architect
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">Plan, prioritize, track</p>

          <div className="mb-4 flex gap-2 border-b border-border">
            <Button
              onClick={() => {
                setActiveForm("signin");
              }}
              className={`flex-1 pb-2 text-sm font-medium transition ${
                activeForm === "signin"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
                `}
            >
              Sign In
            </Button>
            <Button
              onClick={() => {
                setActiveForm("signup");
              }}
              className={`flex-1 pb-2 text-sm font-medium transition ${
                activeForm === "signup"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
                `}
            >
              Sign Up
            </Button>
          </div>

          {activeForm === "signin" ? <SignInForm /> : <SignUpForm />}

          {generating && (
            <div className="mt-4 text-center text-sm text-muted-foreground">Authenticating...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Action Architect</div>
              <div className="text-[11px] text-muted-foreground">Plan · Prioritize · Track</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setChatOpen(true)}>
              <Bot className="size-4" /> Architect
            </Button>
            <PlanInputDialog />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <MainDashboard />
      <ChatbotPanel />
    </div>
  );
}
