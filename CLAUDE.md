# FIT — Gym Tracker

Personal workout tracker for GoodLife gym sessions. Multi-user via Google OAuth.

## Stack
- Next.js 15 App Router + TypeScript
- Tailwind CSS (dark-only, no toggle — CSS vars in `app/globals.css`)
- shadcn/ui components (manually created, no CLI)
- Prisma ORM + **Neon PostgreSQL** (production)
- NextAuth v5 (next-auth@beta) + @auth/prisma-adapter + Google provider
- recharts for progress graphs

## User
- Name: Lav, 34M, 73kg, Body Recomp, GoodLife gym
- Encouraging UI, prominent streak display

## Key commands
```bash
npm run dev          # local dev server
npm run build        # prisma generate && next build
npm run db:seed      # re-seed templates
npm run db:studio    # Prisma Studio
```

## Deployment
- **Production URL:** https://fit2x.vercel.app
- **Vercel project:** `fit2x` (under lbagga2xs-projects team) — GitHub-linked, auto-deploys on push
- **NOT** the `fit` project (that's a stale manual deploy — ignore it)
- Deploy manually: `npx vercel link --project fit2x --yes && npx vercel deploy --prod`
- Env vars are on the `fit2x` project (Production): `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`
- When adding env vars via CLI use `printf '%s' 'value' | npx vercel env add VAR production --yes` (NOT echo — echo adds a trailing newline that corrupts the value)

## File map
```
prisma/
  schema.prisma        — Models: User, Account, Session, WorkoutTemplate,
                         TemplateExercise, ExerciseLibrary, Workout,
                         WorkoutExercise, Set
  seed.ts              — 4 templates + 17 exercises in ExerciseLibrary
auth.ts                — NextAuth config (Google provider + PrismaAdapter)
middleware.ts          — Route protection (checks session cookie directly,
                         NOT auth() — avoids redirect loops)
lib/
  prisma.ts            — Prisma client singleton
  actions.ts           — ALL server actions
  utils.ts             — cn(), formatDate(), toLocalDateStr(), getStreakMessage()
app/
  page.tsx             — Dashboard (streak, template selector, recent workouts)
  login/page.tsx       — Google sign-in page
  workout/[id]/        — Active workout logger
  history/             — All completed workouts
  history/[id]/        — Single workout detail
  progress/            — Exercise progress list
  progress/[name]/     — Exercise chart (LineChart + BarChart via recharts)
  templates/new/       — Create custom workout template
  api/auth/[...nextauth]/route.ts  — NextAuth handler
components/
  active-workout-client.tsx   — Client set logger (pre-fills from last session)
  template-selector.tsx       — Bottom sheet for picking/deleting templates
  streak-card.tsx             — Streak display
  exercise-combobox.tsx       — Searchable exercise picker (from ExerciseLibrary)
  exercise-chart.tsx          — recharts line+bar chart
  create-template-form.tsx    — Form to create custom templates
  ui/                         — button, card, input, checkbox, dialog, badge
```

## Architecture notes
- `getCurrentUserId()` in actions.ts — reads session via auth(), redirects to /login if missing
- `startWorkout()` — pre-fills weight/reps from last completed sets per exercise name
- Streak walks backward from today; skips today if no workout yet (mid-day check)
- Templates: seeded "GoodLife Plans" (no delete) vs user-created "My Workouts" (deletable)
- ExerciseLibrary table ensures canonical exercise names (no typos across sessions)
- middleware.ts checks `authjs.session-token` / `__Secure-authjs.session-token` cookie directly
  (using auth() wrapper in middleware causes ERR_TOO_MANY_REDIRECTS)
- All pages are `force-dynamic` — data is user-specific

## Database (Neon PostgreSQL)
- Pool URL → `DATABASE_URL` (for queries via pgBouncer)
- Direct URL → `DIRECT_URL` (for migrations)
- schema.prisma uses both: `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`
- When seeding: delete TemplateExercise before WorkoutTemplate (FK constraint on PostgreSQL)

## Google OAuth
- Google Cloud project: `fit2x-492412`
- Consent screen: External, Testing mode, test user: lbagga.dev@gmail.com
- Authorized redirect URI: `https://fit2x.vercel.app/api/auth/callback/google`
- auth.ts reads `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` explicitly via process.env
- NEXTAUTH_URL=https://fit2x.vercel.app is set on Vercel
