"use client";

import { useState, useTransition, useEffect } from "react";
import { Dumbbell, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startWorkout } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  emoji: string;
  exercises: { name: string; sets: number; repsTarget: string }[];
};

export function TemplateSelector({ templates }: { templates: Template[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleSelect(templateId: string) {
    setSelectedId(templateId);
    startTransition(async () => {
      await startWorkout(templateId);
    });
  }

  return (
    <>
      <Button
        size="xl"
        className="w-full gap-3 font-bold tracking-wide"
        onClick={() => setOpen(true)}
      >
        <Dumbbell className="h-5 w-5" />
        Start New Workout
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => !pending && setOpen(false)}
          />

          {/* Bottom sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-card border-t border-border shadow-2xl max-h-[88dvh]">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-foreground">Choose Your Workout</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a template to start tracking
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable workout list */}
            <div className="overflow-y-auto px-5 pb-8 flex flex-col gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  disabled={pending}
                  onClick={() => handleSelect(t.id)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4 text-left transition-all",
                    "hover:bg-accent hover:border-primary active:scale-[0.98]",
                    "disabled:opacity-50",
                    selectedId === t.id && pending && "border-primary bg-primary/10"
                  )}
                >
                  <span className="text-3xl shrink-0">{t.emoji}</span>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {t.exercises.map((e) => e.name).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.exercises.length} exercises ·{" "}
                      {t.exercises.reduce((s, e) => s + e.sets, 0)} sets
                    </p>
                  </div>

                  {pending && selectedId === t.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
