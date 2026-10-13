# Nodera

**A visual operating system for thoughts, decisions, goals and personal development.**

Nodera turns scattered thoughts into connected ideas, connected ideas into structured plans, and plans into measurable progress. Capture a thought in seconds, connect it to others on an infinite mind‑map canvas, turn it into a task, link it to a goal, schedule it, and watch the goal's progress update from real completed work.

---

## What's implemented

| Area | Features |
|---|---|
| **Accounts & security** | Email/password registration and login (bcrypt, httpOnly session cookie, only token hashes stored), login rate‑limiting, password change, account deletion, private workspaces with membership roles, every API call authorized against the record's workspace (foreign ids return 404). |
| **Workspaces & folders** | Multiple workspaces, nested folders, favorites, archive/restore, move items between folders, default "My Life" structure (Health, Finance, Education, Business…). |
| **Thoughts & notes** | Quick capture anywhere (`Q`), thought inbox, rich‑text editor (headings, lists, checklists, tables, code blocks, quotes, links, images/files via drag‑drop or paste), internal note links with backlinks, tags, autosave, version history with restore, focus mode, Markdown export, archive. |
| **Mind maps** | Infinite canvas (React Flow): double‑click to create, drag from a node edge to connect *or* to branch a new node, 11 node types, 9 relationship types (depends on, supports, blocks, part of, requires, conflicts with, can combine with, leads to, related to) with labels/descriptions/bidirectional arrows, colors, shapes, icons, collapse/expand branches, groups, duplicate, delete with undo, full undo/redo, auto‑layout (dagre), in‑map search, minimap, zoom‑level LOD, debounced autosave with retry, keyboard shortcuts, templates, move nodes between maps, attachments and links on nodes. |
| **Thought → action** | Any node becomes a task, goal, project, habit or full note. The node *references* the entity (no duplicates); the same entity can appear on several maps; titles stay in sync; task checkbox and goal/project progress render live on the node. |
| **Projects & tasks** | Projects linked to goals, list and Kanban board (drag‑and‑drop status), quick‑add with `!priority`, `#tag`, `today/tomorrow` syntax, priorities, due dates, time blocks, estimates & actual time, recurring tasks (next occurrence is created on completion), dependencies, task detail drawer available everywhere. |
| **Goals** | Category, priority, dates, status, motivation, success criteria, milestones, dependencies between goals, linked projects/tasks/habits/events, connected thoughts from maps, automatic progress (milestones + tasks, including tasks of linked projects) or manual progress. |
| **Planning** | Day / week / month calendar, time blocking, drag to move and resize, drag unscheduled tasks onto the calendar, recurring events, reminders, conflict detection with suggested free slots, activities that contribute to several goals, time‑per‑goal summary. |
| **Habits** | Daily/weekly habits with targets, units, reminder times, goal links; one‑tap logging; streaks, best streak, 7/30‑day rates; 12‑week and yearly heatmaps; habits can be placed on maps. |
| **Dashboard** | Today's tasks, today's schedule, active goals, upcoming deadlines, 4‑week completion chart, habit consistency, recent thoughts, project status, recent maps, activity — rearrangeable and hideable widgets. |
| **Search & knowledge graph** | ⌘K command palette and a search page (keywords, tags, types, status, dates); workspace‑wide knowledge graph (force layout) that resolves canvas connections to real entities across folders, with type filters, highlight and neighbour focus. |
| **AI assistant (optional)** | Natural‑language plan → goals, milestones, habits, first tasks, connections and a weekly schedule; relationship discovery; goal breakdown; note organization (tags, folder, hidden action items); map summaries; weekly reflection grounded only in real data. Every result is a clearly‑labelled **suggestion**; nothing changes until you accept it (and choose which parts). Can be turned off per user; disabled entirely without an API key. |
| **Data** | JSON export (complete) and import into a new workspace (backup/restore), Markdown export, attachments stored outside the public folder and served through auth‑checked routes. |
| **UX** | Light/dark/system theme, reduced‑motion, responsive layout (mobile drawer navigation, bottom‑sheet canvas panel), keyboard navigation, focus traps in dialogs, toasts with undo, confirmations for destructive actions, empty/loading states, onboarding. |
| **SaaS readiness** | Plan tiers (FREE/PRO/TEAMS) with all limits configured in one file (`src/lib/plans.ts`) and enforced server‑side (maps, nodes per map, workspaces, storage, AI requests). Workspace membership roles ready for collaboration. |

---

## Architecture

```
Browser (React 19 client components, SWR cache, Zustand stores)
   │  JSON over fetch  (?ws=<workspace>&tzo=<tz offset>)
   ▼
Next.js 15 App Router
   ├─ src/app/(auth)      login / register (server-checked)
   ├─ src/app/(app)       the application (server layout checks the session)
   └─ src/app/api/**      REST route handlers ── route() wrapper: auth, zod validation, error mapping, logs
                               │
                               ▼
                         src/server/*  domain services (maps diff‑save, goal progress, AI, storage, reminders)
                               │
                               ▼
                    Prisma ORM ──► PostgreSQL
```

**Key decisions**

* **Next.js route handlers as the backend.** One deployable unit, shared TypeScript types and zod schemas between client and server. The service layer (`src/server`) is framework‑agnostic enough to move to a dedicated API later.
* **Custom session auth instead of a hosted provider.** Works fully offline for local development, keeps user data in your own Postgres, and is small enough to audit (`src/lib/auth.ts`). Swapping in Supabase/Auth.js later only touches that file and the register/login routes.
* **Workspace‑scoped authorization everywhere.** Every row belongs to a workspace; `userAndWorkspace()` / `loadOwned()` verify membership and role, and `assertSameWorkspace()` prevents linking to foreign records.
* **Nodes reference entities, never copy them.** `MapNode` has nullable `taskId / goalId / projectId / habitId / noteId`. Converting a node creates one entity and links it; the entity is the source of truth for the title.
* **Canvas persistence = debounced full‑snapshot + server diff.** The client sends the whole graph ~700 ms after a change; the server diffs against the DB (create / update changed / delete missing) in one transaction. This makes undo/redo, offline retries and multi‑step edits trivial and idempotent.
* **Pure logic is isolated and unit‑tested** (`src/lib/progress.ts`, `schedule.ts`, `habits.ts`, `richtext.ts`, canvas graph utils). Recurrence and conflict detection run in the browser so they use the user's timezone; the client sends its timezone offset so "today" is correct server‑side too.
* **AI behind a strict boundary.** `src/server/ai.ts` uses the official Anthropic SDK with structured (zod‑validated) outputs; suggestions are stored as `AiSuggestion` rows and only `applySuggestion()` — called on explicit acceptance — writes data.

### Project structure

```
prisma/
  schema.prisma          data model (users, workspaces, folders, notes, maps, nodes, edges, projects,
                         goals, milestones, tasks, habits, logs, events, reminders, attachments, activity, AI)
  migrations/            SQL migrations
  seed.ts                demo account with realistic data
  stress.ts              600-node canvas performance fixture
scripts/reminder-worker.ts   background reminder job
src/
  app/(auth)/            login, register
  app/(app)/             dashboard, thoughts, notes, maps, projects, tasks, goals, calendar, habits,
                         folders, graph, timeline, search, assistant, settings
  app/api/               REST endpoints
  components/ui/         design-system primitives (button, inputs, dialog, popover, tabs, toasts…)
  components/canvas/     mind-map editor (store with undo/redo, nodes, edges, panels, layout)
  components/editor/     rich-text editor (TipTap)
  components/forms/      create/edit forms for every entity
  components/layout/     app shell, sidebar, top bar, command palette, quick capture, onboarding
  lib/                   shared pure logic, validation, plans, client API/SWR helpers
  server/                server-only services
tests/unit/              vitest
tests/e2e/               Playwright (full MVP workflow + authorization isolation)
```

---

## Getting started (local)

Requirements: **Node 20+** and **PostgreSQL 14+** (or Docker).

```bash
cp .env.example .env                 # adjust DATABASE_URL if needed
docker compose up -d db              # or use your own PostgreSQL
npm install                          # also runs `prisma generate`
npm run db:migrate                   # create the schema
npm run db:seed                      # optional: demo@nodera.app / demo-password
npm run dev                          # http://localhost:3000
```

Optional: `npm run db:stress` adds a 600‑node / ~900‑edge map to the demo account for performance testing, and `npm run worker:reminders` runs the reminder job (use `--once` for cron).

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `APP_URL` | no | Public base URL |
| `UPLOAD_DIR` | no | Where attachments are stored (default `./uploads`, never publicly served) |
| `MAX_UPLOAD_BYTES` | no | Upload size limit (default 10 MB) |
| `ANTHROPIC_API_KEY` | no | Enables the AI assistant. Without it every AI feature is hidden and the rest of the app works normally. |
| `AI_MODEL` | no | Claude model id (default `claude-opus-5-5`) |

Secrets are read only on the server; nothing is exposed to client bundles.

### Database migrations

* Development: change `prisma/schema.prisma`, then `npm run db:migrate -- --name <change>`.
* Production / CI: `npm run db:deploy` (`prisma migrate deploy`) applies pending migrations. The Docker image does this on start.

## Testing

```bash
npm run typecheck        # TypeScript
npm run lint             # ESLint
npm test                 # unit tests (progress, scheduling/conflicts, habits, rich text, validation, canvas graph)
npm run build && npm run test:e2e   # Playwright: starts `next start` unless a server is already on :3000
```

The e2e suite covers the acceptance workflow — register → folder → note (survives reload) → goal with milestone → mind map node + connection → convert to task assigned to the goal → map reopens with the link → complete the task → goal progress updates → navigate task → map node → sign out/in, data persists — plus cross‑account isolation checks.
If Playwright's bundled browser isn't installed, point it at a local Chromium: `PW_CHROMIUM_PATH=/path/to/chromium npm run test:e2e`.

## Deployment

* **Docker:** `docker compose --profile full up --build` runs Postgres + the app (migrations applied automatically). Mount a persistent volume for `UPLOAD_DIR`.
* **Vercel:** create a hosted PostgreSQL (Neon, Supabase, Vercel Postgres…) and set `DATABASE_URL` in *Project → Settings → Environment Variables* (never `localhost`). The `vercel-build` script runs `prisma migrate deploy` automatically before `next build`, so tables are created on every deploy. After deploying, open `/api/health` — it reports whether the database URL is set, reachable and migrated. For Supabase's pooled connection (port 6543) append `?pgbouncer=true&connection_limit=1`.
* **Any Node host:** set `DATABASE_URL` (Neon, Supabase, RDS…), run `npm run db:deploy` in the release step, `npm run build`, `npm start`. On serverless hosts replace the local‑disk adapter in `src/server/storage.ts` (three functions) with S3/Supabase Storage, and run `scripts/reminder-worker.ts --once` from a scheduled job.
* **Backups:** rely on your database provider's point‑in‑time recovery for the server side; users can additionally export complete JSON backups and restore them as a new workspace from Settings.

## Roadmap (architecture already prepared)

Template marketplace (map templates live in `src/server/templates.ts`), collaboration (workspace roles exist), subscriptions/billing (limits in `src/lib/plans.ts`), decision journal (`DECISION` node type), project analytics, offline sync (snapshot‑based canvas saves), voice notes (audio uploads already accepted), push/email reminder delivery (`deliver()` in the worker).
