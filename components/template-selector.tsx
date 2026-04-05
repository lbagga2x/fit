"use client";

import { useState, useTransition } from "react";
import { Dumbbell, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { startWorkout } from "@/lib/actions";

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

  function handleSelect(templateId: string) {
    setSelectedId(templateId);
    startTransition(async () => {
      await startWorkout(templateId);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xl" className="w-full gap-3 font-bold tracking-wide">
          <Dumbbell className="h-5 w-5" />
          Start New Workout
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose Your Workout</DialogTitle>
          <DialogDescription>
            Select a template to start tracking your session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          {templates.map((t) => (
            <button
              key={t.id}
              disabled={pending}
              onClick={() => handleSelect(t.id)}
              className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4 text-left transition-colors hover:bg-accent hover:border-primary active:scale-[0.98] disabled:opacity-50"
            >
              <span className="text-3xl">{t.emoji}</span>

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
      </DialogContent>
    </Dialog>
  );
}
