import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing seed data (children before parents to satisfy FK constraints)
  await prisma.templateExercise.deleteMany();
  await prisma.workoutTemplate.deleteMany();

  const templates = [
    {
      name: "Workout A",
      emoji: "🦵",
      order: 0,
      exercises: [
        { name: "Leg Press", sets: 3, repsTarget: "10-12", order: 0 },
        { name: "Machine Chest Press", sets: 3, repsTarget: "10-12", order: 1 },
        { name: "DB Shoulder Press", sets: 3, repsTarget: "10-12", order: 2 },
        { name: "Lat Pulldowns", sets: 3, repsTarget: "12", order: 3 },
        {
          name: "Plank",
          sets: 3,
          repsTarget: "45s",
          notes: "Hold for 45 seconds",
          order: 4,
        },
      ],
    },
    {
      name: "Workout B",
      emoji: "🏋️",
      order: 1,
      exercises: [
        { name: "Goblet Squat", sets: 3, repsTarget: "10-12", order: 0 },
        { name: "Seated Cable Row", sets: 3, repsTarget: "12", order: 1 },
        { name: "DB Bench Press", sets: 3, repsTarget: "10", order: 2 },
        { name: "DB Bicep Curls", sets: 3, repsTarget: "12", order: 3 },
        {
          name: "Tricep Rope Pushdowns",
          sets: 3,
          repsTarget: "15",
          order: 4,
        },
      ],
    },
    {
      name: "Active Recovery & Tummy",
      emoji: "🧘",
      order: 2,
      exercises: [
        {
          name: "Lying Leg Raises",
          sets: 3,
          repsTarget: "15",
          order: 0,
        },
        {
          name: "Plank",
          sets: 3,
          repsTarget: "45-60s",
          notes: "Hold for 45-60 seconds",
          order: 1,
        },
        {
          name: "Bicycle Crunches",
          sets: 3,
          repsTarget: "20",
          order: 2,
        },
        {
          name: "Incline Treadmill Walk",
          sets: 1,
          repsTarget: "20 min",
          notes: "10% incline, 3.0 speed",
          order: 3,
        },
      ],
    },
    {
      name: "Mirror Muscle Pump",
      emoji: "💪",
      order: 3,
      exercises: [
        { name: "Lateral Raises", sets: 3, repsTarget: "15", order: 0 },
        { name: "Incline DB Press", sets: 3, repsTarget: "12", order: 1 },
        { name: "Face Pulls", sets: 3, repsTarget: "15", order: 2 },
        { name: "Hammer Curls", sets: 3, repsTarget: "12", order: 3 },
      ],
    },
  ];

  for (const t of templates) {
    await prisma.workoutTemplate.create({
      data: {
        name: t.name,
        emoji: t.emoji,
        order: t.order,
        exercises: {
          create: t.exercises,
        },
      },
    });
  }

  // Seed exercise library with GIF URLs from free-exercise-db
  const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
  const exerciseGifs: Record<string, string> = {
    "Leg Press":             BASE + "Leg_Press/0.jpg",
    "Machine Chest Press":   BASE + "Leverage_Chest_Press/0.jpg",
    "DB Shoulder Press":     BASE + "Dumbbell_Shoulder_Press/0.jpg",
    "Lat Pulldowns":         BASE + "Wide-Grip_Lat_Pulldown/0.jpg",
    "Plank":                 BASE + "Plank/0.jpg",
    "Goblet Squat":          BASE + "Goblet_Squat/0.jpg",
    "Seated Cable Row":      BASE + "Seated_Cable_Rows/0.jpg",
    "DB Bench Press":        BASE + "Dumbbell_Bench_Press/0.jpg",
    "DB Bicep Curls":        BASE + "Dumbbell_Bicep_Curl/0.jpg",
    "Tricep Rope Pushdowns": BASE + "Triceps_Pushdown_-_Rope_Attachment/0.jpg",
    "Lying Leg Raises":      BASE + "Flat_Bench_Lying_Leg_Raise/0.jpg",
    "Bicycle Crunches":      BASE + "Cable_Crunch/0.jpg",
    "Incline Treadmill Walk":BASE + "Jogging_Treadmill/0.jpg",
    "Lateral Raises":        BASE + "Cable_Seated_Lateral_Raise/0.jpg",
    "Incline DB Press":      BASE + "Incline_Dumbbell_Press/0.jpg",
    "Face Pulls":            BASE + "Face_Pull/0.jpg",
    "Hammer Curls":          BASE + "Hammer_Curls/0.jpg",
  };

  const allNames = [...new Set(templates.flatMap((t) => t.exercises.map((e) => e.name)))];
  for (const name of allNames) {
    const gifUrl = exerciseGifs[name] ?? null;
    await prisma.exerciseLibrary.upsert({
      where: { name },
      create: { name, gifUrl },
      update: { gifUrl },
    });
  }

  // Create default user
  const existingUser = await prisma.user.findFirst();
  if (!existingUser) {
    await prisma.user.create({
      data: { name: "Lav", weight: 73 },
    });
  }

  console.log(`✅ Seed complete — 4 templates + ${allNames.length} exercises in library + user.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
