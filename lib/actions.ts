"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { auth } from "@/auth";
import { toLocalDateStr } from "./utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// ─── Start Workout ───────────────────────────────────────────────────────────

/**
 * Creates a new in-progress workout from a template.
 * Each set is pre-populated with weight/reps from the last completed
 * session for that exercise name (frictionless logging).
 */
export async function startWorkout(templateId: string) {
  const userId = await getCurrentUserId();

  const template = await prisma.workoutTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  // For each exercise, look up the last logged set values from any prior workout
  const previousData = await Promise.all(
    template.exercises.map(async (ex) => {
      const lastSets = await prisma.set.findMany({
        where: {
          completed: true,
          exercise: {
            name: ex.name,
            workout: { userId, completedAt: { not: null } },
          },
        },
        orderBy: { exercise: { workout: { completedAt: "desc" } } },
        take: ex.sets,
        select: { setNumber: true, weight: true, reps: true, duration: true },
      });
      return { exerciseName: ex.name, lastSets };
    })
  );

  const prevMap = Object.fromEntries(
    previousData.map((d) => [d.exerciseName, d.lastSets])
  );

  const workout = await prisma.workout.create({
    data: {
      userId,
      templateId,
      exercises: {
        create: template.exercises.map((ex) => ({
          name: ex.name,
          order: ex.order,
          sets: {
            create: Array.from({ length: ex.sets }, (_, i) => {
              const prev = prevMap[ex.name]?.find((s) => s.setNumber === i + 1);
              return {
                setNumber: i + 1,
                weight: prev?.weight ?? null,
                reps: prev?.reps ?? null,
                duration: prev?.duration ?? null,
              };
            }),
          },
        })),
      },
    },
  });

  redirect(`/workout/${workout.id}`);
}

// ─── Save Completed Workout (Task 3) ─────────────────────────────────────────

export type SetInput = {
  setId: string;
  weight: number | null;
  reps: number | null;
  duration: number | null;
  completed: boolean;
};

export type ExerciseInput = {
  exerciseId: string;
  sets: SetInput[];
};

/**
 * Persists all logged set values and marks the workout as complete.
 * On next session, startWorkout() will read these values as pre-fills.
 */
export async function saveWorkout(
  workoutId: string,
  exercises: ExerciseInput[]
) {
  const setUpdates = exercises.flatMap((ex) =>
    ex.sets.map((s) =>
      prisma.set.update({
        where: { id: s.setId },
        data: {
          weight: s.weight,
          reps: s.reps,
          duration: s.duration,
          completed: s.completed,
        },
      })
    )
  );

  await prisma.$transaction([
    ...setUpdates,
    prisma.workout.update({
      where: { id: workoutId },
      data: { completedAt: new Date() },
    }),
  ]);

  revalidatePath("/");
  redirect("/");
}

// ─── Delete in-progress workout ──────────────────────────────────────────────

export async function cancelWorkout(workoutId: string) {
  await prisma.workout.delete({ where: { id: workoutId } });
  revalidatePath("/");
  redirect("/");
}

// ─── Delete completed workout ─────────────────────────────────────────────────

export async function deleteWorkout(workoutId: string) {
  const userId = await getCurrentUserId();
  await prisma.workout.delete({ where: { id: workoutId, userId } });
  revalidatePath("/history");
  revalidatePath("/");
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

export async function getStreak(): Promise<number> {
  const userId = await getCurrentUserId();

  const workouts = await prisma.workout.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  if (!workouts.length) return 0;

  // Collect unique workout days (local date strings)
  const workoutDays = new Set(
    workouts.map((w) => toLocalDateStr(w.completedAt!))
  );

  let streak = 0;
  const today = new Date();

  // Walk backwards from today; streak breaks if a day is missing
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toLocalDateStr(d);

    if (workoutDays.has(key)) {
      streak++;
    } else {
      // Allow today to be missing (mid-day check), but break on any other gap
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}

export async function getRecentWorkouts() {
  const userId = await getCurrentUserId();

  return prisma.workout.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 5,
    include: {
      template: { select: { name: true, emoji: true } },
      exercises: { select: { name: true }, take: 3 },
    },
  });
}

export async function getInProgressWorkout() {
  const userId = await getCurrentUserId();

  return prisma.workout.findFirst({
    where: { userId, completedAt: null },
    orderBy: { createdAt: "desc" },
    include: { template: { select: { name: true, emoji: true } } },
  });
}

export async function getTemplates() {
  return prisma.workoutTemplate.findMany({
    orderBy: { order: "asc" },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
}

// ─── Create / Delete workout template ────────────────────────────────────────

export type TemplateExerciseInput = {
  name: string;
  sets: number;
  repsTarget: string;
  notes?: string;
  order: number;
};

export async function createWorkoutTemplate(data: {
  name: string;
  emoji: string;
  exercises: TemplateExerciseInput[];
}) {
  const last = await prisma.workoutTemplate.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.workoutTemplate.create({
    data: {
      name: data.name.trim(),
      emoji: data.emoji,
      order: (last?.order ?? -1) + 1,
      exercises: {
        create: data.exercises.map((ex) => ({
          name: ex.name.trim(),
          sets: ex.sets,
          repsTarget: ex.repsTarget.trim(),
          notes: ex.notes?.trim() || null,
          order: ex.order,
        })),
      },
    },
  });

  // Upsert any new exercise names into the library
  for (const ex of data.exercises) {
    await prisma.exerciseLibrary.upsert({
      where: { name: ex.name.trim() },
      create: { name: ex.name.trim() },
      update: {},
    });
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteWorkoutTemplate(templateId: string) {
  await prisma.templateExercise.deleteMany({ where: { templateId } });
  await prisma.workoutTemplate.delete({ where: { id: templateId } });
  revalidatePath("/");
}

// ─── Exercise Library ─────────────────────────────────────────────────────────

export async function getExerciseLibrary(): Promise<string[]> {
  const rows = await prisma.exerciseLibrary.findMany({
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return rows.map((r) => r.name);
}

// ─── Add custom exercise to in-progress workout ───────────────────────────────

export async function addExerciseToWorkout(
  workoutId: string,
  name: string,
  numSets: number
) {
  const trimmed = name.trim();

  // Upsert into library — guarantees canonical name is stored for future sessions
  await prisma.exerciseLibrary.upsert({
    where: { name: trimmed },
    create: { name: trimmed },
    update: {},
  });

  const last = await prisma.workoutExercise.findFirst({
    where: { workoutId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const exercise = await prisma.workoutExercise.create({
    data: {
      workoutId,
      name: trimmed,
      order: (last?.order ?? -1) + 1,
      sets: {
        create: Array.from({ length: numSets }, (_, i) => ({
          setNumber: i + 1,
        })),
      },
    },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });

  return exercise;
}

// ─── Progress / Graphs ───────────────────────────────────────────────────────

export async function getExerciseSummaries() {
  const userId = await getCurrentUserId();

  const rows = await prisma.workoutExercise.findMany({
    where: { workout: { userId, completedAt: { not: null } } },
    include: {
      sets: { where: { completed: true } },
      workout: { select: { completedAt: true } },
    },
    orderBy: { workout: { completedAt: "asc" } },
  });

  // Group by exercise name
  const byName: Record<string, typeof rows> = {};
  for (const r of rows) {
    if (!byName[r.name]) byName[r.name] = [];
    byName[r.name].push(r);
  }

  return Object.entries(byName)
    .map(([name, sessions]) => {
      const weightedSessions = sessions.filter((s) =>
        s.sets.some((set) => set.weight && set.weight > 0)
      );
      const maxWeights = weightedSessions.map((s) =>
        Math.max(...s.sets.map((set) => set.weight ?? 0))
      );
      const first = maxWeights[0] ?? 0;
      const last = maxWeights[maxWeights.length - 1] ?? 0;
      const best = Math.max(...maxWeights, 0);

      return {
        name,
        sessions: sessions.length,
        bestWeight: best,
        lastWeight: last,
        improvement: first > 0 ? Math.round(((last - first) / first) * 100) : 0,
        hasSets: weightedSessions.length > 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

export type ProgressPoint = {
  date: string;
  maxWeight: number;
  totalVolume: number;
  timestamp: number;
};

export async function getExerciseProgressData(
  exerciseName: string
): Promise<ProgressPoint[]> {
  const userId = await getCurrentUserId();

  const rows = await prisma.workoutExercise.findMany({
    where: {
      name: exerciseName,
      workout: { userId, completedAt: { not: null } },
    },
    include: {
      sets: { where: { completed: true }, orderBy: { setNumber: "asc" } },
      workout: { select: { completedAt: true } },
    },
    orderBy: { workout: { completedAt: "asc" } },
  });

  return rows
    .filter((r) => r.sets.length > 0)
    .map((r) => {
      const weightedSets = r.sets.filter((s) => s.weight && s.weight > 0);
      const maxWeight =
        weightedSets.length > 0
          ? Math.max(...weightedSets.map((s) => s.weight!))
          : 0;
      const totalVolume = r.sets.reduce(
        (n, s) => n + (s.weight ?? 0) * (s.reps ?? 0),
        0
      );
      const d = new Date(r.workout.completedAt!);
      return {
        date: d.toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
        maxWeight,
        totalVolume,
        timestamp: d.getTime(),
      };
    });
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getAllWorkouts() {
  const userId = await getCurrentUserId();

  return prisma.workout.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    include: {
      template: { select: { name: true, emoji: true } },
      exercises: {
        orderBy: { order: "asc" },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });
}

export async function getWorkoutDetail(workoutId: string) {
  return prisma.workout.findUniqueOrThrow({
    where: { id: workoutId },
    include: {
      template: { select: { name: true, emoji: true } },
      exercises: {
        orderBy: { order: "asc" },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });
}

// ─── Active Workout Data ──────────────────────────────────────────────────────

export async function getActiveWorkout(workoutId: string) {
  return prisma.workout.findUniqueOrThrow({
    where: { id: workoutId },
    include: {
      template: { select: { name: true, emoji: true } },
      exercises: {
        orderBy: { order: "asc" },
        include: {
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
}

// Get target reps for each exercise in the template
export async function getTemplateExerciseTargets(templateId: string) {
  const exercises = await prisma.templateExercise.findMany({
    where: { templateId },
    select: { name: true, repsTarget: true, notes: true },
  });
  return Object.fromEntries(exercises.map((e) => [e.name, e]));
}
