# Athonesayate

A personal expense tracker built as an installable progressive web app. Log spending in a couple of taps, see where the month is heading before it gets away from you, and keep recurring bills from going unnoticed.

Bilingual in English and Myanmar.

---

## What it does

**Quick Add** — the fastest path from "I just spent something" to it being recorded. Category and subcategory chips are ranked by how often you actually pick them over the last 90 days, so the two taps you need are usually the first two offered.

**Dashboard** — monthly totals, spending pace, a safe-to-spend-per-day figure, category mix, and an activity calendar.

**Forecast** — projects where the month will land by blending your recent spending rate with up to three months of history, weighted toward the present as the month fills in. It is deliberately an explainable weighted-rate model rather than a black box: every number can be traced back to transactions you can see.

**Reports** — daily series, six-month trend, breakdowns by category, subcategory, and account, and side-by-side month comparison.

**Budgets** — per-category monthly limits with progress against actual spending.

**Recurring bills** — rules for weekly through yearly schedules, one-tap mark-paid with undo, and a nightly push reminder for anything due, due tomorrow, or overdue.

**Goals** — savings targets with progress tracking.

**Offline** — the app keeps a local snapshot and queues writes while you're offline, replaying them in order once you reconnect.

## Try it without signing up

Visiting signed out drops you straight into the app with a generated sample dataset — every tab works, the charts are populated, the forecast runs. You're asked to create an account only when you try to save something.

## Tech

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Dates | date-fns |
| Backend | Supabase (PostgreSQL, Auth, row-level security) |
| PWA | Serwist service worker, Web Push |
| Hosting | Vercel, with Vercel Cron for bill reminders |

The browser talks to Supabase directly — there is no CRUD API layer. Row-level security is therefore the security boundary, not a second line of defence: every table restricts access to `user_id = auth.uid()`, and tables that reference other owned rows also verify you own the account, category, and subcategory being referenced.

## Layout

```
apps/
  web/       Expense tracker PWA and the push-dispatch route
  landing/   Marketing site (deploys independently)
packages/
  shared/    Domain types, metrics, recurrence logic, Supabase access
supabase/    Schema and incremental migrations
docs/        System design reference
```

## Running it

Requires Node 20+ and a Supabase project.

```bash
npm install
cp apps/web/.env.example apps/web/.env.local   # then fill it in
npm run dev                                     # http://localhost:3000
```

Apply the SQL in `supabase/` in numeric order through the Supabase SQL editor. `007_auth.sql` and `008_auth_lockdown.sql` are the authentication cutover — read the comments at the top of each before running them, and note that 008 is deliberately destructive to the pre-auth shared-user mode.

Then enable the **Email** provider under Authentication in the Supabase dashboard.

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Expense tracker in development |
| `npm run dev:landing` | Landing site on port 3001 |
| `npm run build` | Production build |
| `npm run typecheck` | Type-check every workspace |
| `npm run lint` | Lint the web app |
| `npm run icons` | Regenerate PWA icons |

### Environment

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required. Bill reminders additionally need a VAPID key pair, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` — the dispatch route fails closed in production without the latter. See [apps/web/.env.example](apps/web/.env.example) for the full list.

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security and must never be given a `NEXT_PUBLIC_` name.

## Documentation

[docs/system-design.md](docs/system-design.md) is the as-built reference — architecture, data model, the forecast algorithm, recurring-payment semantics, offline guarantees, security posture, and known gaps. Worth reading before changing anything non-trivial; it is explicit about which behaviours are load-bearing invariants.

## Status

Personal project, actively developed. Quality checks include `npm run typecheck`, production builds, and browser smoke tests.

To run the browser checks, build the app, start it with `npm run start --workspace @athonesayate/web -- --port 3100`, then run `node scripts/ui-smoke.cjs`, `node scripts/quick-add-smoke.cjs`, and `node scripts/pwa-smoke.cjs` sequentially. They require Playwright and a browser; `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` can point to existing installations. `UI_URL` overrides the default local URL.

The UI check covers seven tabs at six widths, modal focus, short and landscape viewports, install prompts, and tab navigation. The Quick Add check covers the original single-sheet scrolling, focus, and control reachability with a simulated keyboard viewport at five mobile sizes, plus visible mobile calendar amounts. The PWA check requires a local production server: it temporarily modifies the generated worker (and restores it) to test update approval, offline reloads, and the offline fallback. These checks use the signed-out demo; they do not verify authenticated data sync or physical iOS/Android devices.

`node scripts/glass-ui-smoke.cjs` checks the persistent navigation indicator, interrupted menu/dialog exits, nested focus and scroll locks, resizing and language changes, reduced motion, contrast, pointer lighting, and simulated unsupported-filter fills. `node scripts/popup-motion-smoke.cjs` checks rendered opening/closing poses, completion-owned exits, continuous reopening, early touch focus, keyboard resizing during motion, nested dialogs, live reduced motion, and unmount cleanup. The UI, Quick Add, mobile popup, export, desktop menu, glass, and popup motion checks accept `BROWSER_ENGINE=webkit` with a locally installed Playwright WebKit browser; omit `BROWSER_EXECUTABLE` for that engine.

`node scripts/glass-performance.cjs` records a repeatable production interaction trace and frame/CPU metrics in `artifacts/ui/`. Set `GLASS_TRACE_LABEL=before` or `after` to keep separate captures. These headless measurements describe the host machine; validate mobile GPU performance and software keyboard behavior on physical devices separately.
