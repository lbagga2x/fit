"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  saveWorkout,
  cancelWorkout,
  addExerciseToWorkout,
  type ExerciseInput,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type SetData = {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  duration: number | null;
  completed: boolean;
};

type ExerciseData = {
  id: string;
  name: string;
  order: number;
  sets: SetData[];
};

type TargetMap = Record<
  string,
  { repsTarget: string; notes: string | null } | undefined
>;

type Props = {
  workoutId: string;
  exercises: ExerciseData[];
  targets: TargetMap;
};

type LocalSet = {
  weight: string;
  reps: string;
  duration: string;
  completed: boolean;
};

function isTimed(repsTarget: string) {
  return /s$|min/.test(repsTarget);
}

function emptyLocalSet(): LocalSet {
  return { weight: "", reps: "", duration: "", completed: false };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActiveWorkoutClient({ workoutId, exercises: initialExercises, targets }: Props) {
  // Exercise list lives in state so we can append custom ones without a reload
  const [exercises, setExercises] = useState<ExerciseData[]>(initialExercises);

  // Per-set input values, keyed exerciseId → setId → LocalSet
  const [localData, setLocalData] = useState<Record<string, Record<string, LocalSet>>>(
    () =>
      Object.fromEntries(
        initialExercises.map((ex) => [
          ex.id,
          Object.fromEntries(
            ex.sets.map((s) => [
              s.id,
              {
                weight: s.weight?.toString() ?? "",
                reps: s.reps?.toString() ?? "",
                duration: s.duration?.toString() ?? "",
                completed: s.completed,
              },
            ])
          ),
        ])
      )
  );

  // Add-exercise form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSets, setNewSets] = useState("3");
  const [addPending, startAdd] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [savePending, startSave] = useTransition();
  const [cancelPending, startCancel] = useTransition();

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalSets = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const completedCount = exercises.reduce(
    (n, ex) =>
      n + ex.sets.filter((s) => localData[ex.id]?.[s.id]?.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedCount / totalSets) * 100 : 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function updateSet(exId: string, setId: string, field: keyof LocalSet, value: string | boolean) {
    setLocalData((prev) => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        [setId]: { ...prev[exId]?.[setId], [field]: value },
      },
    }));
  }

  function toggleSet(exId: string, setId: string) {
    updateSet(exId, setId, "completed", !(localData[exId]?.[setId]?.completed ?? false));
  }

  // ── Add custom exercise ────────────────────────────────────────────────────
  function openAddForm() {
    setNewName("");
    setNewSets("3");
    setShowAddForm(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  function handleAdd() {
    const name = newName.trim();
    const num = Math.max(1, Math.min(10, parseInt(newSets, 10) || 3));
    if (!name) return;

    startAdd(async () => {
      const ex = await addExerciseToWorkout(workoutId, name, num);

      // Append exercise to list
      setExercises((prev) => [...prev, ex]);

      // Initialise empty local set state for each new set
      setLocalData((prev) => ({
        ...prev,
        [ex.id]: Object.fromEntries(ex.sets.map((s) => [s.id, emptyLocalSet()])),
      }));

      setShowAddForm(false);
    });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  function handleSave() {
    const payload: ExerciseInput[] = exercises.map((ex) => ({
      exerciseId: ex.id,
      sets: ex.sets.map((s) => {
        const ls = localData[ex.id]?.[s.id];
        return {
          setId: s.id,
          weight: ls?.weight ? parseFloat(ls.weight) : null,
          reps: ls?.reps ? parseInt(ls.reps, 10) : null,
          duration: ls?.duration ? parseInt(ls.duration, 10) : null,
          completed: ls?.completed ?? false,
        };
      }),
    }));
    startSave(async () => {
      await saveWorkout(workoutId, payload);
    });
  }

  function handleCancel() {
    startCancel(async () => {
      await cancelWorkout(workoutId);
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} / {totalSets} sets done
          </span>
          <span className="font-medium text-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Exercise cards */}
      {exercises.map((ex) => {
        const target = targets[ex.name];
        const timed = isTimed(target?.repsTarget ?? "");

        return (
          <Card key={ex.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{ex.name}</CardTitle>
                {!target && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                    Custom
                  </span>
                )}
              </div>
              {target && (
                <p className="text-xs text-muted-foreground">
                  Target: {ex.sets.length}×{target.repsTarget}
                  {target.notes ? ` · ${target.notes}` : ""}
                </p>
              )}
            </CardHeader>

            <CardContent className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs font-medium text-muted-foreground mb-1">
                <span className="text-center">Set</span>
                {timed ? (
                  <span className="col-span-2 text-center">Duration (s)</span>
                ) : (
                  <>
                    <span className="text-center">kg</span>
                    <span className="text-center">Reps</span>
                  </>
                )}
                <span className="text-center">Done</span>
              </div>

              {ex.sets.map((s) => {
                const ls = localData[ex.id]?.[s.id];
                const done = ls?.completed ?? false;

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center rounded-lg px-1 py-1 transition-colors",
                      done && "bg-primary/10"
                    )}
                  >
                    <span
                      className={cn(
                        "text-center text-sm font-bold tabular-nums",
                        done ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {s.setNumber}
                    </span>

                    {timed ? (
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="sec"
                        className="col-span-2 h-10 text-center text-base font-medium"
                        value={ls?.duration ?? ""}
                        onChange={(e) => updateSet(ex.id, s.id, "duration", e.target.value)}
                      />
                    ) : (
                      <>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="kg"
                          className="h-10 text-center text-base font-medium"
                          value={ls?.weight ?? ""}
                          onChange={(e) => updateSet(ex.id, s.id, "weight", e.target.value)}
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="reps"
                          className="h-10 text-center text-base font-medium"
                          value={ls?.reps ?? ""}
                          onChange={(e) => updateSet(ex.id, s.id, "reps", e.target.value)}
                        />
                      </>
                    )}

                    <button
                      className="flex justify-center items-center h-10 w-10 rounded-lg transition-colors hover:bg-muted active:scale-95"
                      onClick={() => toggleSet(ex.id, s.id)}
                      aria-label={done ? "Mark incomplete" : "Mark complete"}
                    >
                      {done ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* ── Add Exercise ─────────────────────────────────────────────────── */}
      {showAddForm ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              ref={nameInputRef}
              placeholder="Exercise name (e.g. Cable Fly)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={addPending}
              className="h-11 text-base"
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground shrink-0">Sets</label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                value={newSets}
                onChange={(e) => setNewSets(e.target.value)}
                disabled={addPending}
                className="h-11 w-20 text-center text-base font-medium"
              />
              <div className="flex gap-2 flex-1 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  disabled={addPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={!newName.trim() || addPending}
                  className="gap-1.5"
                >
                  {addPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={openAddForm}
          disabled={savePending || cancelPending}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary active:scale-[0.98] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </button>
      )}

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-8 pt-2">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 gap-2"
          onClick={handleCancel}
          disabled={savePending || cancelPending}
        >
          {cancelPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Cancel
        </Button>

        <Button
          size="lg"
          className="flex-[2] gap-2 font-bold"
          onClick={handleSave}
          disabled={savePending || cancelPending}
        >
          {savePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {progress === 100 ? "Finish Workout 🎉" : "Save & Finish"}
        </Button>
      </div>
    </div>
  );
}
