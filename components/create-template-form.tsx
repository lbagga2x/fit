"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ExerciseCombobox } from "@/components/exercise-combobox";
import { createWorkoutTemplate, type TemplateExerciseInput } from "@/lib/actions";
import { cn } from "@/lib/utils";

const EMOJIS = ["💪", "🏋️", "🦵", "🧘", "🏃", "🔥", "⚡", "🎯", "💥", "🏆", "🦾", "❤️"];

type DraftExercise = {
  id: string; // local only, for React keys
  name: string;
  sets: string;
  repsTarget: string;
  notes: string;
};

function newDraft(): DraftExercise {
  return { id: crypto.randomUUID(), name: "", sets: "3", repsTarget: "", notes: "" };
}

export function CreateTemplateForm({ exerciseLibrary }: { exerciseLibrary: string[] }) {
  const router = useRouter();
  const [templateName, setTemplateName] = useState("");
  const [emoji, setEmoji] = useState("💪");
  const [exercises, setExercises] = useState<DraftExercise[]>([newDraft()]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // ── Exercise helpers ──────────────────────────────────────────────────────
  function updateExercise(id: string, field: keyof DraftExercise, value: string) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  }

  function addExercise() {
    setExercises((prev) => [...prev, newDraft()]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit() {
    setError("");

    if (!templateName.trim()) {
      setError("Give your workout a name.");
      return;
    }
    if (exercises.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    const incomplete = exercises.find((ex) => !ex.name.trim() || !ex.repsTarget.trim());
    if (incomplete) {
      setError("Fill in the name and reps target for every exercise.");
      return;
    }

    const payload = exercises.map<TemplateExerciseInput>((ex, i) => ({
      name: ex.name.trim(),
      sets: Math.max(1, parseInt(ex.sets, 10) || 3),
      repsTarget: ex.repsTarget.trim(),
      notes: ex.notes.trim() || undefined,
      order: i,
    }));

    startTransition(async () => {
      await createWorkoutTemplate({ name: templateName, emoji, exercises: payload });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Template name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workout Name
        </label>
        <Input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="e.g. Push Day, Leg Blast…"
          className="h-11 text-base"
          disabled={pending}
        />
      </div>

      {/* Emoji picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              disabled={pending}
              className={cn(
                "h-10 w-10 rounded-lg text-xl transition-all border-2",
                emoji === e
                  ? "border-primary bg-primary/15 scale-110"
                  : "border-border bg-muted/40 hover:border-primary/50"
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Exercises
        </label>

        {exercises.map((ex, idx) => (
          <Card key={ex.id} className="border-border">
            <CardContent className="pt-4 pb-3 flex flex-col gap-3">
              {/* Row header */}
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                  {idx + 1}
                </span>
                {exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExercise(ex.id)}
                    disabled={pending}
                    className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Name combobox */}
              <ExerciseCombobox
                library={exerciseLibrary}
                value={ex.name}
                onChange={(val) => updateExercise(ex.id, "name", val)}
              />

              {/* Sets + Reps target */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Sets</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={10}
                    value={ex.sets}
                    onChange={(e) => updateExercise(ex.id, "sets", e.target.value)}
                    disabled={pending}
                    className="h-10 text-center font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">
                    Reps / Target
                  </label>
                  <Input
                    value={ex.repsTarget}
                    onChange={(e) => updateExercise(ex.id, "repsTarget", e.target.value)}
                    placeholder="10-12 · 15 · 45s"
                    disabled={pending}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Optional notes */}
              <Input
                value={ex.notes}
                onChange={(e) => updateExercise(ex.id, "notes", e.target.value)}
                placeholder="Notes (optional) — e.g. keep elbows tight"
                disabled={pending}
                className="h-9 text-xs text-muted-foreground"
              />
            </CardContent>
          </Card>
        ))}

        <button
          type="button"
          onClick={addExercise}
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive font-medium rounded-lg bg-destructive/10 px-4 py-2.5">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-6">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          size="lg"
          className="flex-[2] font-bold gap-2"
          onClick={handleSubmit}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? "Saving…" : "Save Workout"}
        </Button>
      </div>
    </div>
  );
}
