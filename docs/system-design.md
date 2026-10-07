# Athonesayate System Design

| Document field | Value |
|---|---|
| Status | As-built design reference |
| Last updated | 2026-07-26 |
| Repository version | Monorepo version 0.1.0 |
| Primary application | Next.js expense-tracking progressive web app backed by Supabase |

## 1. Purpose and scope

This document explains how Athonesayate works today. It is intended to help a new engineer understand the system, safely change it, operate it, and recognize the boundaries between implemented behavior and future intent.

The design covers:

- the customer-facing landing site;
- the expense-tracking web application;
- shared domain types, calculations, recurring-payment logic, and Supabase access;
- authentication, per-user isolation, and the signed-out demo;
- the PostgreSQL/Supabase schema and migrations;
- client state management and derived dashboard/report data;
- offline reads, optimistic writes, and mutation replay;
- Quick Add category and subcategory ranking;
- expense forecasting;
- recurring-payment recording and undo;
- PWA installation, service-worker caching, and web push reminders;
- deployment, configuration, security, scalability, failure modes, and testing.

This is an **as-built** document. When the implementation and an aspirational design differ, the current implementation is stated first and the recommended future design is identified separately.

## 2. Executive summary

Athonesayate is a TypeScript monorepo containing two Next.js applications and one shared package:

1. **apps/web** is the interactive expense tracker. Most rendering and business calculations run in the browser.
2. **apps/landing** is a separate bilingual marketing site that links to the application.
3. **packages/shared** contains domain types, calculations, recurring-payment matching, and the direct Supabase data-access layer.

The web app is a client-heavy PWA. It loads an entire data snapshot from Supabase, stores that snapshot in React state, and derives dashboards, reports, calendars, category rankings, and forecasts locally. A browser localStorage cache and FIFO mutation queue allow the app to display its last known state and accept supported writes while offline.

There is one server-side route: a scheduled web-push dispatcher. Vercel Cron invokes it daily, it finds due recurring bills, and it sends a single reminder payload to registered browser subscriptions.

Access is authenticated and per-user:

- Supabase Auth email/password sessions gate the application;
- `app_users.id` is the `auth.users` id, so every existing `user_id` column is the ownership key;
- row-level security policies restrict all reads and writes to `user_id = auth.uid()`, including the rows a record references;
- the offline cache and mutation queue are namespaced per user and cleared on sign-out;
- the scheduled push dispatcher runs with service-role credentials and sends each user only their own bills.

A signed-out visitor is not shown an auth wall. They land in the application backed by a bundled sample dataset, can browse every tab, and are asked to create an account only when they attempt to save something. The demo never contacts Supabase, so it required no relaxation of the row-level security policies.

## 3. Design goals and current non-goals

### 3.1 Goals reflected in the implementation

- Fast daily expense entry from desktop or mobile.
- A single responsive application rather than separate native clients.
- Useful feedback immediately after a transaction is recorded.
- Installability and basic offline operation through PWA technology.
- Explainable financial calculations rather than opaque models.
- English and Myanmar-language presentation.
- Account, transaction, budget, recurring-bill, goal, and reporting workflows in one interface.
- Graceful compatibility with databases that have not yet applied the newest recurring-payment migrations.

### 3.2 Current non-goals or incomplete areas

- Creating new banking accounts. Seeded accounts can be edited or archived, but there is no create-account command or form; new users get a starter account from the signup trigger instead.
- Sharing a dataset between users (households or joint accounts). Ownership is strictly one user per row.
- Bank synchronization or payment initiation.
- Foreign-exchange conversion or multi-currency reporting.
- Transfers between accounts in the TypeScript domain/UI, even though the base SQL constraint permits a transfer transaction type.
- Server-side reporting or data warehouse workloads.
- Automatic conflict resolution across multiple devices.
- Guaranteed offline delivery of every mutation.
- A machine-learning forecasting service.
- Automatic execution of recurring rules. The auto-create flag is stored and displayed, but no scheduler creates those transactions automatically.
- Tagging in the UI. Tag tables exist in SQL but are unused by the application.

## 4. System context

~~~mermaid
flowchart LR
    Person[User]
    Landing[Landing site<br/>Next.js]
    Web[Expense tracker PWA<br/>Next.js + React]
    SW[Serwist service worker]
    Local[(Browser localStorage<br/>snapshot + mutation queue)]
    DB[(Supabase PostgreSQL)]
    Cron[Vercel Cron]
    PushAPI[Push dispatch API route]
    PushSvc[Browser push service]

    Person --> Landing
    Landing --> Web
    Person --> Web
    Web <--> Local
    Web <--> DB
    Web <--> SW
    SW <--> PushSvc
    Cron --> PushAPI
    PushAPI <--> DB
    PushAPI --> PushSvc
    PushSvc --> SW
    SW --> Person
~~~

### Boundary summary

| Boundary | Responsibility | Trust level |
|---|---|---|
| Browser UI | Interaction, React state, validation, charts, derived calculations | Untrusted client |
| Browser localStorage | Cached financial snapshot and queued mutation arguments | Device-local but unencrypted |
| Service worker | Application caching and notification display/click handling | Browser-managed |
| Supabase client API | Direct browser reads and writes using the anon key plus the user's session JWT | Public API boundary; row-level security is the enforcement point |
| Supabase PostgreSQL | Durable system of record | Trusted persistence layer |
| Push dispatch route | Scheduled due-bill evaluation and VAPID delivery | Server runtime |
| Web push provider | Delivery to browser subscription endpoints | External infrastructure |

## 5. Repository topology

~~~text
athonesayate/
├── apps/
│   ├── web/                  Expense tracker and push-dispatch API
│   └── landing/              Marketing and installation site
├── packages/
│   └── shared/               Types, metrics, recurrence, Supabase client/data
├── supabase/                 Base schema, seed data, and incremental migrations
├── scripts/                  Asset-generation scripts
├── docs/                     Engineering documentation
├── package.json              npm workspaces and root commands
└── package-lock.json         Locked dependency graph
~~~

### 5.1 Important modules

| Module | Role |
|---|---|
| [apps/web/components/app-gate.tsx](../apps/web/components/app-gate.tsx) | Chooses between the auth screen and the app; remounts the app on account change |
| [apps/web/components/use-session.ts](../apps/web/components/use-session.ts) | Session state, storage binding, and sign-out cleanup |
| [apps/web/components/auth-screen.tsx](../apps/web/components/auth-screen.tsx) | Sign-in, sign-up, and password-reset form |
| [apps/web/components/use-app-state.ts](../apps/web/components/use-app-state.ts) | Central client state, derived views, and feature command handlers |
| [apps/web/components/expense-tracker-app.tsx](../apps/web/components/expense-tracker-app.tsx) | Responsive application shell, lazy-loaded tabs, FAB, toast, and provider |
| [apps/web/components/app-context.tsx](../apps/web/components/app-context.tsx) | Typed React context exposing the full state object |
| [apps/web/lib/offline-data.ts](../apps/web/lib/offline-data.ts) | Network-first reads, local snapshot, optimistic writes, queue, replay, and demo-mode gating |
| [apps/web/lib/demo-data.ts](../apps/web/lib/demo-data.ts) | Date-relative sample dataset for the signed-out demo |
| [packages/shared/src/supabase-data.ts](../packages/shared/src/supabase-data.ts) | Direct table queries and CRUD mapping between SQL and TypeScript |
| [packages/shared/src/metrics.ts](../packages/shared/src/metrics.ts) | Totals, balances, ranking, forecast, daily series, and safe-to-spend calculations |
| [packages/shared/src/recurring.ts](../packages/shared/src/recurring.ts) | Recurrence advancement, stale-date normalization, cycle identity, and payment matching |
| [apps/web/lib/calendar-utils.ts](../apps/web/lib/calendar-utils.ts) | Transaction and recurring-rule calendar aggregation |
| [apps/web/app/sw.ts](../apps/web/app/sw.ts) | Serwist worker, runtime caching, push display, and notification navigation |
| [apps/web/app/api/push/dispatch/route.ts](../apps/web/app/api/push/dispatch/route.ts) | Scheduled bill-reminder computation and web-push delivery |
| [supabase/001_expense_tracker_schema.sql](../supabase/001_expense_tracker_schema.sql) | Base relational schema, indexes, triggers, and development RLS policies |

## 6. Runtime architecture

### 6.1 Web application composition

The root page renders AppGate, which resolves the session before mounting anything else. The gate chooses between a loading state, the auth screen, and ExpenseTrackerApp — the last of which serves both the signed-in application and the signed-out demo. ExpenseTrackerApp calls useAppState once, passes its return value through AppProvider, and lazy-loads each feature tab as a separate client chunk.

~~~mermaid
flowchart TD
    Page[app/page.tsx]
    Gate[AppGate]
    Auth[AuthScreen]
    Shell[ExpenseTrackerApp]
    State[useAppState]
    Context[AppProvider / useApp]
    Quick[QuickAddSheet]
    Dashboard[Dashboard tab]
    Transactions[Transactions tab]
    Reports[Reports tab]
    Budgets[Budgets tab]
    Recurring[Recurring tab]
    Goals[Goals tab]
    Settings[Settings tab]

    Page --> Gate
    Gate -->|no session, auth requested| Auth
    Gate -->|session or demo| Shell
    Auth -->|back to demo| Gate
    Shell --> State
    State --> Context
    Context --> Quick
    Context --> Dashboard
    Context --> Transactions
    Context --> Reports
    Context --> Budgets
    Context --> Recurring
    Context --> Goals
    Context --> Settings
~~~

There is no Redux, server action layer, or independent feature store. useAppState is the application store and command layer. Its ReturnType is the context contract, so adding or removing a returned field automatically changes the compile-time context type.

ExpenseTrackerApp is keyed on the user id, so switching accounts — or moving from the demo to a real session — remounts the whole tree rather than leaving one user's derived state in place for the next.

### 6.2 Rendering model

- The root layout and route use the Next.js App Router.
- The expense tracker is a client component because it relies on browser storage, connectivity events, notifications, and extensive local interaction.
- Feature tabs are dynamically imported to reduce the initial JavaScript chunk.
- Only the selected tab is mounted.
- Charts use Recharts.
- Dates and calendar arithmetic use date-fns.
- Styling uses Tailwind CSS plus shared theme CSS.
- The application uses Inter, Space Grotesk, and Noto Sans Myanmar.
- Theme initialization runs before the body renders to reduce light/dark flashing.

### 6.3 Landing application

The landing site is a second Next.js application. It:

- renders product marketing and installation guidance;
- supports English and Myanmar copy;
- has its own theme and language context;
- links to NEXT_PUBLIC_APP_URL, defaulting to the production expense-tracker URL;
- does not access Supabase or the financial dataset.

This separation lets the marketing site deploy and evolve independently from the application.

## 7. User-facing capability map

| Surface | Main capabilities |
|---|---|
| Dashboard | Monthly metrics, spending pace, projection summary, category mix, activity calendar, category concentration, recurring bills, and detailed projected usage |
| Quick Add sheet | Expense/income entry, frequency-ranked category/subcategory chips, account, date, and note |
| Transactions | Search/filter, create, edit, delete, list/table responsive views, and transaction calendar |
| Reports | Monthly overview, filters, daily series, six-month trend, category/subcategory/account breakdowns, and month comparison |
| Budgets | Set a category budget for a month, edit it, remove it, and compare spending with the limit |
| Recurring | Create/edit/archive rules, mark paid/received, undo the latest recorded payment, and inspect recurring calendar state |
| Goals | Create, edit, archive, and visualize savings-goal progress |
| Settings | Enable/disable bill reminders, edit/archive accounts, and manage categories/subcategories |
| Global shell | Responsive navigation, language/theme controls, sync state, notices, month selection, floating Quick Add, and sign-out |
| Auth screen | Sign in, sign up with optional display name, and password reset |
| Signed-out demo | Full read-only browsing of sample data, a persistent demo banner, and a sign-up prompt raised on the first write attempt |

## 8. Data model

### 8.1 Entity relationship diagram

~~~mermaid
erDiagram
    APP_USERS ||--o{ ACCOUNTS : owns
    APP_USERS ||--o{ CATEGORIES : owns
    APP_USERS ||--o{ SUBCATEGORIES : owns
    APP_USERS ||--o{ TRANSACTIONS : owns
    APP_USERS ||--o{ BUDGETS : owns
    APP_USERS ||--o{ RECURRING_RULES : owns
    APP_USERS ||--o{ GOALS : owns
    APP_USERS ||--o{ TAGS : owns
    APP_USERS ||--o{ PUSH_SUBSCRIPTIONS : owns

    CATEGORIES ||--o{ SUBCATEGORIES : contains
    ACCOUNTS ||--o{ TRANSACTIONS : receives
    CATEGORIES o|--o{ TRANSACTIONS : classifies
    SUBCATEGORIES o|--o{ TRANSACTIONS : refines
    CATEGORIES ||--o{ BUDGETS : limited_by
    ACCOUNTS ||--o{ RECURRING_RULES : funds
    CATEGORIES o|--o{ RECURRING_RULES : classifies
    SUBCATEGORIES o|--o{ RECURRING_RULES : refines
    RECURRING_RULES o|--o{ TRANSACTIONS : settled_by
    TRANSACTIONS ||--o{ TRANSACTION_TAGS : has
    TAGS ||--o{ TRANSACTION_TAGS : assigned
~~~

### 8.2 Entity definitions

#### app_users

Profile table for an authenticated user. `id` is a foreign key to `auth.users(id)`, so it is both the auth subject and the ownership key every other table references. In the current application:

- the signup trigger creates the row and seeds starter categories, subcategories, and one account;
- deleting the auth user cascades to the profile and from there to every owned table;
- updates, archives, and deletes target a supplied row ID; the user predicate is enforced by row-level security rather than by the query;
- currency and month_start_day are still not read by the UI.

#### accounts

Represents cash, checking, savings, credit card, wallet, or investment accounts. The current balance is not stored. It is derived as:

~~~text
current balance = opening balance
                + sum(income transactions)
                - sum(expense transactions)
~~~

Archiving is a soft delete. The database restricts account deletion when dependent transactions exist, but the application archives accounts instead of physically deleting them.

#### categories and subcategories

Categories are typed as income or expense and may contain a legacy/default monthly budget. Subcategories belong to exactly one category.

Both support soft deletion through archived. The UI assigns display colors by stable category array position; usage ranking is therefore kept in separate derived arrays and never reorders the global category list.

#### transactions

Transactions are the ledger events that drive balances, budgets, reports, ranking, calendars, and forecasts.

Important fields:

- account_id is required;
- category_id and subcategory_id are nullable so archived/deleted classifications do not destroy history;
- amount is non-negative;
- occurred_on is a calendar date, represented in TypeScript as YYYY-MM-DD;
- is_recurring marks generated/recorded recurring payments;
- recurring_rule_id identifies the rule that was settled;
- recurring_due_on identifies the billing cycle.

The base SQL constraint also allows transfer, while the TypeScript TransactionType permits only income and expense. Transfer rows are therefore outside the supported application domain and could produce incorrect UI assumptions if inserted externally.

#### budgets

Budgets are month-specific category limits with a uniqueness constraint on user, category, and month. When available, a monthly budget row overrides categories.monthly_budget for that month. The category column remains a legacy/default fallback.

#### recurring_rules

A recurring rule contains an account, optional category/subcategory, type, amount, merchant, frequency, next due date, auto-create flag, and active flag.

Supported frequencies are weekly, biweekly, monthly, quarterly, and yearly. Archiving sets active to false. The auto_create field is persisted and shown, but no current worker consumes it.

#### goals

Goals store target amount, current amount, optional date, color, and archived state. Progress is derived as current / target and capped visually at 100 percent.

#### tags and transaction_tags

These tables provide a many-to-many tagging model in SQL. No TypeScript type, query, or UI currently uses them.

#### push_subscriptions

Stores Web Push endpoint, p256dh key, auth secret, and the owning user id. Endpoint is globally unique, so sign-out releases the subscription to keep the next user on that device from colliding with it. Stale endpoints are removed when the push service responds with HTTP 404 or 410.

### 8.3 Referential and deletion behavior

| Relationship | Database behavior |
|---|---|
| User to owned data | Cascade delete |
| Category to subcategory | Cascade delete |
| Category/subcategory to transaction | Set null |
| Recurring rule to linked transaction | Set recurring_rule_id null |
| Account to transaction/rule | Restrict delete |
| Category to budget | Cascade delete |
| Transaction or tag to join row | Cascade delete |

Most user-visible deletes are implemented as archive operations for accounts, categories, recurring rules, and goals. Transactions and month-specific budgets are physically deleted.

### 8.4 Money and date conventions

- PostgreSQL stores amounts as numeric(12,2).
- JavaScript converts amounts to number; calculations therefore use floating-point arithmetic.
- UI currency formatters are hard-coded to Thai baht using the th-TH locale.
- app_users.currency currently does not control formatting.
- Domain dates are date-only strings. This avoids most UTC conversion problems in ledger records.
- The push dispatcher explicitly derives “today” in BILL_REMINDER_TIMEZONE.

### 8.5 Application operation matrix

| Entity | Create | Update | Removal behavior | Offline queued |
|---|---:|---:|---|---:|
| Account | No current UI/data command | Yes | Soft archive | Yes for update/archive |
| Category | Yes | Yes | Soft archive | Yes |
| Subcategory | Yes | Yes | Soft archive | Yes |
| Transaction | Yes | Yes | Hard delete | Yes |
| Monthly budget | Upsert | Upsert | Hard delete | Yes |
| Recurring rule | Yes | Yes | Soft archive through active=false | Yes |
| Goal | Yes | Yes | Soft archive | Yes |
| Push subscription | Upsert | Upsert by endpoint | Hard delete/unsubscribe | No |
| Tag / transaction tag | No | No | No application behavior | No |

The Supabase data module contains updateGoalProgress and fetchPushSubscriptions helpers that are not part of the normal central-state command surface.

## 9. Data access and client state

### 9.0 Session and demo mode

`useSession` resolves the Supabase session once on mount and then follows `onAuthStateChange`. It owns three side effects beyond reporting status:

1. it binds local storage to the user id before any consumer mounts, so the cache and queue can never be read under the wrong account;
2. on sign-out it releases the Web Push subscription, because endpoints are globally unique and a row left behind would block the next user on that device from registering;
3. on sign-out it deletes that user's cached snapshot and pending queue.

`AppGate` reads the session and selects a mode. When there is no session it enables demo mode on the offline layer, and it does so **during render rather than in an effect** — a child's effects run before its parent's, so useAppState would otherwise have started a real Supabase fetch before the flag was set.

Demo mode changes two things inside `offline-data`:

| Operation | Signed in | Demo |
|---|---|---|
| `loadExpenseData` | Network-first Supabase snapshot, localStorage fallback | Returns generated sample data; never touches network or storage |
| Any mutation | Remote write, or optimistic write plus queued replay when offline | Throws `DEMO_WRITE_BLOCKED` before the optimistic path runs |

Refusing the write *before* the optimistic branch is deliberate: nothing reaches React state, the cached snapshot, or the mutation queue, so a demo visitor cannot leave residue that replays into a real account later.

The block is surfaced in exactly one place. All twenty-odd command handlers in useAppState already report failures through `setDataError`, so that setter is wrapped: the sentinel message opens the sign-up sheet and is swallowed, and every other message behaves as before. No individual handler knows demo mode exists.

### 9.0.1 Demo dataset

`lib/demo-data.ts` generates the sample dataset relative to the moment it is called, so the dashboard, month comparison, and forecast all have usable history:

- four complete prior months plus the current month to date;
- salary, rent, internet, electricity, and a savings transfer placed on fixed days, each omitted if that day has not arrived in the current month;
- day-to-day spending scaled by how much of the current month has elapsed;
- a fixed PRNG seed, so complete months render identically on every load.

Consequences worth knowing:

- the dataset moves with the **client clock**, so the current month fills in as the month progresses and the five-month window slides forward;
- a visitor arriving in the first days of a month sees a nearly empty current month and a Low-confidence forecast, which is the weakest version of the demo;
- sample ids use a `d0000000-…` prefix, so demo rows are recognisable if one ever appears in a bug report;
- signing up does **not** migrate this data. The demo references account, category, and subcategory ids that exist only in the browser, so a new account starts from the starter rows seeded by `007_auth.sql` instead.

### 9.1 Initial read path

On mount, useAppState calls loadExpenseData. In demo mode this returns the generated sample data immediately. Otherwise the offline layer first attempts a live Supabase snapshot. Supabase queries accounts, budgets, categories, subcategories, transactions, active recurring rules, and goals in parallel.

~~~mermaid
sequenceDiagram
    participant UI as useAppState
    participant Offline as offline-data
    participant DB as Supabase
    participant Cache as localStorage

    UI->>Offline: loadExpenseData()
    Offline->>Offline: bind online/offline listeners
    Offline->>Offline: start queue replay if online
    Offline->>DB: fetch seven datasets in parallel
    alt Network succeeds
        DB-->>Offline: ExpenseData snapshot
        alt Mutation queue is empty
            Offline->>Cache: replace cached snapshot
        end
        Offline-->>UI: snapshot, fromCache=false
    else Recognized network failure
        Offline->>Cache: read last good snapshot
        Cache-->>Offline: cached ExpenseData
        Offline-->>UI: snapshot, fromCache=true
    else Configuration or server error
        Offline-->>UI: throw error
    end
    UI->>UI: initialize entities, drafts, defaults, and derived views
~~~

Reads are network-first, not cache-first. The cache is used only when the error is recognized as an offline/network failure.

### 9.2 Central state structure

useAppState stores:

- durable entities mirrored from Supabase;
- form state for new records;
- edit drafts keyed by entity ID;
- active tab, filters, selected dates/months, and language/theme;
- per-operation saving identifiers;
- offline sync state and cached-data status;
- the most recent recurring payment for toast-level undo.

Derived data is calculated with useMemo. Examples include account balances, month totals, category spending, filtered reports, calendar summaries, recurring status, category rankings, and forecasts.

This design is simple and strongly typed, but it makes one large hook responsible for almost every application behavior.

### 9.3 Online write path

For supported entities, the UI command handler calls the offline wrapper. The wrapper calls the remote Supabase function. On success:

1. the durable database row is returned;
2. the localStorage snapshot is updated;
3. the handler updates React state;
4. all dependent useMemo calculations rerun.

Input validation is primarily client-side and minimal: required IDs, non-empty names, and positive numeric amounts. Database constraints remain the final validation boundary.

### 9.4 Offline write path

~~~mermaid
sequenceDiagram
    participant User
    participant UI as React command handler
    participant Offline as offline-data
    participant DB as Supabase
    participant Cache as localStorage

    User->>UI: submit mutation
    UI->>Offline: create/update/archive
    Offline->>DB: try remote mutation
    DB--xOffline: network failure
    Offline->>Offline: create optimistic result
    Offline->>Cache: append FIFO queue item
    Offline->>Cache: mutate cached snapshot
    Offline-->>UI: optimistic result
    UI->>UI: update in-memory state

    Note over Offline: Browser later emits online
    Offline->>Offline: replay queue in order
    loop Each queued mutation
        Offline->>DB: invoke stored handler and arguments
        alt Success
            Offline->>Cache: remove queue head
        else Still offline
            Offline->>Offline: stop; retain queue
        else Permanent error
            Offline->>Offline: log warning and drop item
        end
    end
    Offline->>UI: queue-drained callback
    UI->>DB: refetch canonical snapshot
~~~

Client-generated UUIDs make create replay idempotent with respect to the locally-created record ID. Queue items persist the handler name and raw argument array.

### 9.5 Offline guarantees and limits

The implementation provides best-effort offline behavior, not transactional durability:

- localStorage writes can fail because of quota or browser policy;
- queue loss is only commented, not surfaced to the user;
- non-network replay errors are dropped after a console warning;
- there is no dead-letter queue or repair screen;
- replay locking is per JavaScript module/tab, not cross-tab;
- there is no entity version, ETag, or conflict merge;
- writes from multiple clients are last-write-wins at the database;
- push-subscription operations bypass the offline mutation queue;
- related multi-step operations are not atomic.

The PWA cache and the financial-data snapshot are separate mechanisms: Serwist caches application/network resources, while offline-data stores JSON domain data in localStorage.

## 10. Core domain workflows

### 10.1 Quick Add

Quick Add opens from:

- the global floating plus button;
- the N keyboard shortcut when focus is not in an input;
- the installed PWA manifest shortcut, which launches /?action=quick-add.

The sheet collects type, amount, category, optional subcategory, account, occurred date, and note. On save, the category or subcategory name is copied into merchant for a useful fallback display label.

~~~mermaid
flowchart LR
    Trigger[FAB, N shortcut,<br/>or PWA shortcut]
    Sheet[Quick Add sheet]
    Rank[Rank categories and<br/>subcategories]
    Validate[Validate account,<br/>category, amount]
    Save[Offline-aware<br/>createTransaction]
    State[Update state and cache]
    Views[Balances, reports,<br/>budgets, forecast]

    Trigger --> Sheet
    Rank --> Sheet
    Sheet --> Validate
    Validate --> Save
    Save --> State
    State --> Views
~~~

### 10.2 Frequently-used ranking

Category and subcategory ranking is derived from transaction history and is not persisted.

For each list:

1. consider the inclusive 90-day window ending today;
2. exclude future-dated transactions;
3. exclude transactions marked recurring or linked to a recurring rule;
4. for categories, isolate the selected income/expense type;
5. for subcategories, isolate the selected parent category;
6. count matching transactions;
7. sort by count descending;
8. break ties by most recent transaction date descending;
9. break remaining ties alphabetically.

The selected item remains unchanged while it is valid. The top-ranked item becomes the default only on initial load or when a type/category change invalidates the current choice.

Ranking uses transaction count rather than amount, so “frequent” means most often chosen, not most expensive.

### 10.3 Recurring schedule normalization

Rules can become stale when the app is not opened or a bill is not marked paid.

- Monthly schedules advance to the current month when their stored date is in an older month.
- Other schedules repeatedly advance until the next advancement would be after the reference date, leaving the most recent applicable occurrence.
- This normalization is initially in memory. Marking a rule paid persists the next occurrence.

### 10.4 Recurring cycle identity and payment matching

For weekly/biweekly rules, a cycle is identified by the exact due date. For monthly/quarterly/yearly rules, the cycle key is the due year and month.

Payment matching priority:

1. A transaction explicitly linked to the rule through recurring_rule_id is authoritative.
2. A transaction linked to a different live rule is rejected.
3. Legacy recurring transactions may match by stored due date plus normalized merchant, account, and transaction type.

This supports new explicit links while retaining compatibility with payments created before migration 005.

### 10.5 Mark paid and undo

~~~mermaid
sequenceDiagram
    participant User
    participant State as useAppState
    participant Tx as Transaction mutation
    participant Rule as Rule mutation

    User->>State: Mark paid / Record received
    State->>State: normalize current due date
    State->>Tx: create linked recurring transaction
    Tx-->>State: transaction
    State->>Rule: advance next_due_on one frequency
    Rule-->>State: updated rule
    State->>State: update local lists and show undo toast

    opt User selects Undo
        State->>Tx: delete recorded transaction
        State->>Rule: restore previous rule
        State->>State: restore lists and clear undo state
    end
~~~

The create-transaction and update-rule calls are separate operations. A failure between them can leave a recorded payment without an advanced rule. Undo has the same two-operation atomicity limitation in reverse.

Only the latest payment recorded in the current browser session is available for toast-level undo, and the extended notice duration is 12 seconds.

### 10.6 Remaining recurring expense calculation

For the current month, the app:

- starts from each normalized expense rule;
- skips the first occurrence if a payment recorded on or before today settles it;
- repeatedly advances through month end;
- adds every outstanding occurrence, including multiple weekly or biweekly cycles;
- treats a future-dated recorded payment as projected/committed rather than already spent.

The result is used by safe-to-spend and the expense forecast.

### 10.7 Budgets

For a selected month, the app overlays a month-specific budget row on the category’s fallback budget and sums expense transactions in that category.

~~~text
remaining = max(monthly budget - category spending, 0)
progress  = min(category spending / monthly budget, 140 percent)
~~~

The 140 percent display cap allows an over-budget state to remain visually bounded.

### 10.8 Reports and calendars

Reports are computed entirely in the browser from the loaded transaction array. Filters include category, subcategory, account, recurring/manual status, and free-text search across merchant, note, category, subcategory, and account names.

The reporting surface provides:

- current monthly totals and daily spending;
- category, subcategory, and account aggregations;
- six-month expense bars;
- side-by-side month comparison with absolute and percentage deltas;
- responsive card and table presentations.

Overview, comparison, and trend aggregates share the same expense-filter predicate, including subcategory and search. Trend bars and labels select their full month and year; category, subcategory, and account rows apply their classification while preserving other active filters. Comparison amounts, spend bars, and month totals open Overview for the selected month. Missing subcategories have an explicit "No subcategory" filter.

Daily chart selections narrow only the transaction detail list; totals and charts remain monthly. Drill-downs focus and scroll to that list, respecting reduced motion. Removable filter chips and a "Back to charts" shortcut are available alongside the detail count and precise total. Transactions are initially shown in batches of 50 with "Show more" making every match reachable; changing the selection resets the batch.

Calendar helpers aggregate transactions and recurring events by YYYY-MM-DD. Activity views can combine income, expense, count, due amount, paid recurring amount, and recurring counts.

### 10.9 Account balances and safe-to-spend

Account balance is calculated from all loaded transactions. Safe-to-spend per day is:

~~~text
max(
  (current-month income - current-month spending - remaining recurring expenses)
  / remaining calendar days,
  0
)
~~~

It is a cash-flow guardrail, not a credit-risk or liquidity model.

## 11. Expense forecast design

### 11.1 Objective

The forecast estimates current-month total expense using:

- actual expense transactions through today;
- known remaining recurring expenses;
- a prediction of remaining non-recurring spending;
- up to three recent complete months as historical evidence.

It deliberately uses an explainable weighted-rate model rather than machine learning.

### 11.2 Input preparation

1. Filter to expense transactions.
2. Exclude future-dated transactions from actual-to-date.
3. Treat transactions with isRecurring or recurringRuleId as recurring.
4. Determine when tracking began from the earliest transaction of any type.
5. Use only prior months whose first day is on or after tracking began. This avoids treating pre-adoption months or a partially tracked first month as complete history.
6. Consider at most the three immediately preceding months.

### 11.3 Historical rate

For each included completed month:

~~~text
monthly variable daily rate =
  non-recurring expense total / calendar days in that month
~~~

Months are stored newest first and weighted by recency:

| Available history | Newest month | Middle month | Oldest month |
|---|---:|---:|---:|
| 3 months | 3 | 2 | 1 |
| 2 months | 2 | 1 | — |
| 1 month | 1 | — | — |

The historical monthly baseline uses the same weights but includes all expenses, including recurring expenses, because it is used to compare complete monthly totals.

### 11.4 Current pace and blend

~~~text
current variable daily rate =
  current non-recurring spend through today / elapsed days

month progress =
  elapsed days / days in current month

remaining daily rate =
  historical daily rate × (1 - month progress)
  + current daily rate × month progress
~~~

Early in the month, history stabilizes the estimate. Later in the month, observed current behavior dominates. With no eligible history, current pace is used alone.

### 11.5 Projection and trend

~~~text
predicted variable remaining =
  max(remaining daily rate × remaining days, 0)

projected month total =
  actual expense through today
  + remaining recurring expense
  + predicted variable remaining

trend percent =
  (projected month total - weighted historical monthly baseline)
  / weighted historical monthly baseline
  × 100
~~~

Trend is unavailable when the historical baseline is zero.

### 11.6 Confidence label

| Condition | Confidence |
|---|---|
| At least 3 complete months and at least 10 elapsed days | High |
| At least 2 complete months, or at least 7 elapsed days | Medium |
| Otherwise | Low |

Confidence is a simple evidence label, not a statistical confidence interval.

### 11.7 Forecast data flow

~~~mermaid
flowchart TD
    Tx[All transactions]
    Current[Actual expenses<br/>through today]
    CurrentVar[Current non-recurring<br/>daily rate]
    History[Up to 3 complete<br/>prior months]
    HistVar[Recency-weighted<br/>historical daily rate]
    Rules[Outstanding recurring<br/>occurrences through month end]
    Blend[Blend by month progress]
    Remaining[Predicted variable<br/>remaining]
    Projected[Projected month total]
    Baseline[Weighted historical<br/>monthly baseline]
    Trend[Trend and confidence]

    Tx --> Current
    Tx --> CurrentVar
    Tx --> History
    History --> HistVar
    CurrentVar --> Blend
    HistVar --> Blend
    Blend --> Remaining
    Current --> Projected
    Remaining --> Projected
    Rules --> Projected
    History --> Baseline
    Projected --> Trend
    Baseline --> Trend
~~~

### 11.8 Known forecast limitations

- Linear daily rates do not model payday, weekend, holiday, or category-specific seasonality.
- One-off purchases can distort a monthly baseline.
- Manual transactions that represent recurring bills but lack recurring markers are treated as variable.
- Confidence is heuristic.
- Forecast calculations run on the client and require the relevant history to be loaded.
- No prediction interval is displayed.
- The model is for the real current month only. Historical dashboard months show actual totals.

## 12. PWA and service worker

### 12.1 Installability

The manifest defines:

- standalone display;
- portrait orientation;
- 192px, 512px, and maskable icons;
- application theme/background colors;
- a Quick Add shortcut.

Apple web-app metadata and safe viewport settings are defined in the root layout.

### 12.2 Caching

Serwist builds the service worker in production:

- source: app/sw.ts;
- generated destination: public/sw.js;
- disabled during development;
- precaches build assets;
- uses Serwist default runtime caching;
- enables navigation preload;
- takes control immediately through skipWaiting and clientsClaim.

The service worker does not own the financial mutation queue. Offline domain state remains the responsibility of offline-data and localStorage.

### 12.3 Notification behavior

On push:

- parse JSON when possible, otherwise use text as the body;
- show an Athonesayate notification with icon, badge, tag, and navigation URL.

On click:

- close the notification;
- find an existing window client, navigate it, and focus it;
- otherwise open a new window.

## 13. Bill-reminder push pipeline

~~~mermaid
sequenceDiagram
    participant Cron as Vercel Cron
    participant API as /api/push/dispatch
    participant DB as Supabase
    participant Push as Web Push service
    participant SW as Device service worker
    participant User

    Cron->>API: GET with optional Bearer secret
    API->>DB: active rules + recent transactions + subscriptions
    DB-->>API: rows
    API->>API: normalize due dates
    API->>API: exclude paid rules
    API->>API: select overdue, today, and tomorrow
    API->>Push: send VAPID notification to each subscription
    Push->>SW: push event
    SW->>User: display bill reminder
    API->>DB: remove 404/410 stale endpoints
~~~

### Dispatcher rules

- Vercel schedule: 30 2 * * *.
- Default business timezone: Asia/Yangon, configurable.
- Reminder window: due tomorrow, today, or overdue.
- Transaction payment lookback: 45 days.
- Notification body lists at most four bills and summarizes the remainder.
- All subscriptions receive the same aggregate payload under the current shared-user model.
- If CRON_SECRET is configured, the Authorization header must match. If it is not configured, the endpoint is callable without authentication.

## 14. API and integration inventory

| Integration | Direction | Authentication/configuration | Purpose |
|---|---|---|---|
| Supabase browser API | Browser to Supabase | Public URL + anon key + user session JWT | Primary CRUD, scoped by row-level security |
| Supabase Auth | Browser to Supabase | Email/password; session persisted in localStorage | Sign in, sign up, password reset |
| Supabase service API | Push route to Supabase | SUPABASE_SERVICE_ROLE_KEY, server only | Scheduled cross-user bill reads |
| Web Push | Server route to browser push endpoints | VAPID key pair | Bill reminders |
| Vercel Cron | Vercel to push route | CRON_SECRET; required in production | Daily dispatch |
| Browser localStorage | Browser internal | Same-origin browser access | Snapshot and mutation queue |
| Service Worker / PushManager | Browser internal/external push service | User permission + VAPID public key | PWA cache and notifications |

There are no application REST endpoints for normal CRUD. The browser talks directly to Supabase.

## 15. Security and privacy

### 15.1 Current posture

The application uses Supabase Auth with email/password sessions and per-user row-level security.

- `app_users.id` is a foreign key to `auth.users(id)`. Every owned table keeps its existing `user_id` reference to `app_users`, so ownership is one hop from the session in all cases.
- A trigger on `auth.users` creates the profile row on signup and seeds a starter account, categories, and subcategories. Without the seed a new user cannot use Quick Add, because the app has no create-account form.
- Policies are `user_id = auth.uid()`. Tables that reference other user-owned rows (`transactions`, `budgets`, `recurring_rules`, `subcategories`) additionally assert ownership of the referenced account, category, and subcategory in their `with check`, so a row cannot be attached to another user's account. `transaction_tags` reaches ownership through both parents.
- Every owned table defaults `user_id` to `auth.uid()`.
- The browser holds one Supabase client per tab. Multiple clients would each run their own token-refresh timer against the same stored session.
- Snapshot reads pass an explicit `user_id` predicate. RLS already restricts the rows; the predicate exists so the composite `user_id` indexes are used.
- The offline snapshot and mutation queue are namespaced per user id and cleared on sign-out, so a second account on the same device cannot read the first account's cached data or replay its queued writes.
- The scheduled push dispatcher uses a service-role client, groups bills and subscriptions by user, and sends each user only their own payload. It returns 500 in production when `CRON_SECRET` is unset rather than running unauthenticated.

- The signed-out demo is served entirely from generated client-side data. It issues no Supabase request, so exposing a preview did not require any anonymous read policy.

Remaining gaps:

- Financial snapshots and mutation arguments are still stored unencrypted in localStorage.
- Notification bodies still include merchant names and amounts, with no opt-out.
- Signup is open; there is no invite gate or rate limiting on auth attempts beyond Supabase defaults.

### 15.2 Remaining production hardening

1. Add rate limiting and audit logging to server routes.
2. Define a local-data privacy policy; consider IndexedDB plus encryption or an option to disable offline financial caching.
3. Avoid including sensitive merchant or amount details in notifications unless the user opts in.
4. Add Content Security Policy and review service-worker caching of authenticated responses.
5. Consider requiring email confirmation before first sign-in if signup is left open.

## 16. Reliability and consistency

| Failure mode | Current behavior | Consequence | Recommended improvement |
|---|---|---|---|
| Initial network unavailable with cache | Cached snapshot loads | App is usable with stale indicator | Show snapshot timestamp |
| Initial network unavailable without cache | Error shown | No data available | Add onboarding/offline empty state |
| Offline supported write | Optimistic state and FIFO queue | Temporary divergence | Keep, but add durable queue status |
| Permanent replay error | Item logged and dropped | Possible silent data loss | Dead-letter queue and user repair UI |
| localStorage quota exceeded | Error swallowed | Cache/queue may not persist | Surface error; migrate to IndexedDB |
| Two tabs replay simultaneously | No cross-tab lock | Duplicate/racing operations possible | Web Locks/BroadcastChannel coordination |
| Concurrent edits | Last write wins | Lost updates | updated_at/version preconditions |
| Mark-paid second step fails | Transaction exists; rule not advanced | Duplicate due state | Database RPC/transaction |
| Undo second step fails | Payment deleted; rule not restored | Rule remains advanced | Database RPC/transaction |
| Missing latest migrations | Selected recurring fields fall back | Reduced linkage precision | Migration health check |
| Push endpoint expired | 404/410 endpoint deleted | Self-healing subscription list | Keep |
| Push dispatcher called repeatedly | Same tagged reminder can be resent/replaced | Duplicate processing | Dispatch ledger/idempotency key |
| Client clock incorrect | Date windows/ranking/forecast shift | Misclassified records; the demo dataset also moves with it | Server reference date or user warning |
| Demo visited early in a month | Current month is nearly empty | Weak first impression, Low-confidence forecast | Offset the demo reference date or preselect the prior month |

## 17. Performance and scalability

### 17.1 Current behavior

- Every snapshot fetch loads all transactions without pagination or date bound.
- Most reporting and forecasting runs in the browser.
- Several aggregations repeatedly filter the transaction array for each category, subcategory, account, day, or month.
- The data cache duplicates the complete snapshot in localStorage.
- Push dispatch loads all active rules, all subscriptions, and 45 days of transactions, then broadcasts one combined result.

This is straightforward and responsive for a small personal dataset. It will degrade as users, history, rules, and subscriptions grow.

### 17.2 Existing database indexes

- transactions(user_id, occurred_on desc)
- transactions(category_id)
- transactions(subcategory_id)
- transactions(recurring_rule_id) where non-null
- subcategories(category_id)
- recurring_rules(subcategory_id)
- budgets(user_id, month)
- recurring_rules(user_id, next_due_on) where active

### 17.3 Scaling path

1. Page transaction lists and bound normal snapshots by useful history.
2. Add server/RPC aggregates for monthly totals, category usage, reports, and forecast inputs.
3. Use TanStack Query or an equivalent cache for normalized remote state, while retaining a dedicated offline mutation strategy.
4. Move large durable offline data from localStorage to IndexedDB.
5. Precompute or incrementally maintain reporting aggregates only after measuring query cost.
6. Batch push delivery; dispatch is already partitioned by user, but every subscription is still sent individually.
7. Add composite indexes based on measured queries, likely user/type/date/category and user/type/date/subcategory.
8. Split useAppState into domain hooks or stores to reduce rerender and ownership coupling.

## 18. Deployment and configuration

### 18.1 Build commands

| Command | Purpose |
|---|---|
| npm install | Install all workspace dependencies |
| npm run dev | Run expense tracker in development |
| npm run dev:landing | Run landing site on port 3001 |
| npm run build | Production build for expense tracker |
| npm run build:landing | Production build for landing site |
| npm run typecheck | Type-check all workspaces |
| npm run icons | Regenerate PWA icons |

### 18.2 Environment variables

| Variable | Runtime | Required | Purpose |
|---|---|---:|---|
| NEXT_PUBLIC_SUPABASE_URL | Web browser and push route | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Web browser | Yes | Supabase public client key |
| SUPABASE_SERVICE_ROLE_KEY | Push route only | Yes for push | Bypasses RLS for scheduled dispatch; must never be NEXT_PUBLIC |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Browser and push route | For push | Push application public key |
| VAPID_PRIVATE_KEY | Push route only | For push | Push application private key |
| VAPID_SUBJECT | Push route only | Optional | VAPID contact identity |
| CRON_SECRET | Push route only | Required in production | Authorizes scheduled dispatch; the route fails closed without it |
| BILL_REMINDER_TIMEZONE | Push route only | Optional | Calendar timezone; defaults to Asia/Yangon |
| NEXT_PUBLIC_APP_URL | Landing browser | Optional | Expense-tracker link target |
| NODE_ENV | Build/runtime | Managed | Disables Serwist in development |

Never expose VAPID_PRIVATE_KEY or future service-role credentials through a NEXT_PUBLIC variable.

### 18.3 Database provisioning order

Apply SQL in numeric order:

1. 001_expense_tracker_schema.sql
2. 002_seed_demo_data.sql when demo data is wanted
3. 003_subcategories.sql
4. 004_recurring_subcategories.sql
5. 005_recurring_payment_links.sql
6. 006_push_subscriptions.sql
7. 007_auth.sql
8. 008_auth_lockdown.sql

007 is additive and changes no policy, so the pre-auth build keeps working after it. 008 is a hard cutover and refuses to run while the demo dataset is unclaimed. Between the two, sign up and run `select public.claim_legacy_data('<your-auth-uid>');` to move the demo-owned rows onto a real account. Back up the database before that call.

The base schema already includes subcategories, but migration ordering remains relevant for databases created from older versions. Several data-layer functions intentionally fall back when recurring subcategory/link columns are missing.

### 18.4 Vercel topology

The repository is designed for separate web and landing deployments.

- apps/web/vercel.json defines the daily push cron.
- apps/landing/vercel.json runs installation and the landing-specific build from the monorepo root.
- Both Next.js configs transpile packages/shared.
- The web build generates the service worker only for production.

## 19. Observability and operations

### Current signals

- UI dataError displays user-visible mutation/load errors.
- dataNotice displays success information and recurring undo.
- Sync pills show offline, queued, or syncing status.
- Permanent offline replay failures emit console warnings.
- The push API returns sent, due, and staleRemoved counts as JSON.
- Vercel and Supabase provide platform logs outside the repository.

### Missing operational capabilities

- No structured application logger.
- No error tracking service.
- No metrics, tracing, dashboards, or alerts.
- No audit log for financial record changes.
- No forecast accuracy tracking.
- No queue dead-letter telemetry.
- No health endpoint or migration-version check.

Recommended initial telemetry:

1. client and API error reporting with PII scrubbing;
2. queue depth, replay duration, and replay failure counts;
3. push dispatch evaluated/sent/failed/stale counts;
4. database query latency and row counts;
5. forecast absolute percentage error after month end;
6. build/deployment version shown in diagnostics.

## 20. Testing and quality strategy

### 20.1 Current state

The repository currently has:

- TypeScript no-emit checks for all workspaces;
- Next.js production builds, including route generation and build-time validation;
- no unit-test runner;
- no checked-in unit, component, integration, or end-to-end tests;
- no checked-in CI workflow.

Type checking and builds catch integration and syntax problems, but they do not validate date arithmetic, forecast math, offline replay, or recurring-cycle semantics.

### 20.2 Recommended test pyramid

#### Unit tests

Highest priority pure functions:

- frequentCategories and frequentSubcategories;
- forecastMonthlyExpenses;
- monthTransactions, totals, accountBalances, and safeToSpend;
- advanceRecurringDate, normalizedNextDueOn, recurringCycleKey, and findRecurringPayment;
- calendar aggregation;
- percent delta and monthly budget overlay.

Required edge cases:

- empty data;
- first and last day of a month;
- leap-year February;
- future-dated transactions;
- 0, 1, 2, and 3 eligible historical months;
- outlier spending;
- no historical baseline;
- recurring and manual separation;
- weekly/biweekly multiple occurrences;
- overdue and paid-early rules;
- explicit vs legacy payment links;
- category/subcategory ranking ties and 90-day cutoff.

#### Component tests

- Quick Add validation, default ranking, selection stability, and submit/close behavior.
- Report filtering and month comparison.
- Recurring paid and undo states.
- Offline/sync banners.
- Push setting states and permission errors.
- Dashboard historical-vs-current projection presentation.

#### Integration tests

- Supabase CRUD mapping against a disposable project or local Supabase.
- Schema migration compatibility.
- Offline optimistic write, reload, reconnect, replay, and canonical refetch.
- Mark-paid atomic replacement once implemented as an RPC.
- Push subscription create/delete and stale cleanup.

#### End-to-end tests

- New expense appears in dashboard, report, budget, balance, and calendar.
- PWA shortcut opens Quick Add.
- Offline transaction survives reload and synchronizes after reconnect.
- Recurring payment advances once and undo restores it.
- An authenticated user cannot read or write another user’s data.
- A signed-out visitor sees the demo, and attempting to save raises the sign-up prompt without issuing a network request.
- Signing out clears the cached snapshot, so a second account on the same browser cannot see the first account’s data.

### 20.3 CI quality gates

A production CI pipeline should run:

1. dependency installation from package-lock;
2. formatting/whitespace validation;
3. lint;
4. typecheck;
5. unit and component tests;
6. production builds for web and landing;
7. migration validation;
8. end-to-end smoke tests against an ephemeral environment.

## 21. Architectural decisions and rationale

| Decision | Rationale | Trade-off |
|---|---|---|
| npm workspaces monorepo | Share theme/domain code across two apps | Coupled dependency graph |
| Direct Supabase browser CRUD | Minimal backend code and fast iteration | Security relies entirely on correct RLS |
| Central useAppState hook | Simple mental model and typed context | Large ownership surface and broad rerenders |
| Client-side derived metrics | Instant updates and explainability | Full-history transfer and browser CPU cost |
| localStorage offline queue | Small implementation and broad support | Weak durability, privacy, and capacity |
| Client-generated UUID for queued creates | Stable identity before synchronization | Requires UUID-capable browsers for DB compatibility |
| Explicit recurring links plus legacy fallback | Reliable new behavior without breaking old data | More complex matching logic |
| Explainable weighted forecast | Easy to audit and maintain | Limited seasonality/outlier handling |
| Separate Quick Add ranking arrays | Preserve global ordering and display colors | Additional derived state |
| Separate landing app | Independent marketing deployment | Two builds and duplicated app-shell concerns |

## 22. Priority design debt

### P0 — required before multi-user production

- Review local financial-data storage/privacy: the per-user snapshot and queue are still unencrypted in localStorage.
- Decide whether signup stays open, and whether email confirmation is required.

### P1 — data integrity and reliability

- Atomic database operation for mark paid and undo.
- Durable offline store with visible failed-mutation recovery.
- Cross-tab synchronization and optimistic concurrency.
- Automated tests for recurrence, forecasting, and offline replay.
- Migration version/health checking.

### P2 — scale and maintainability

- Paginated transactions and server-side aggregates.
- Split useAppState by domain.
- Structured observability and audit history.
- Category-level forecast refinement and accuracy measurement.
- Implement or remove auto-create.
- Align database and TypeScript transaction types.
- Decide whether app_users.currency and month_start_day become functional.
- Implement or remove unused tag tables.

## 23. Key invariants for future changes

Engineers should preserve these behaviors unless a deliberate migration changes them:

1. Amounts are non-negative; direction comes from transaction type.
2. Account balance is derived, not stored.
3. A subcategory must belong to its selected category.
4. Month-specific budgets override the category fallback.
5. Quick Add rankings must not reorder the canonical category list or change category colors.
6. Recurring payments should identify both their rule and billing cycle.
7. Future-dated transactions are not actual-to-date forecast spending.
8. Remaining recurring expenses must include every occurrence through month end.
9. A queued create must retain one stable ID from optimistic creation through replay.
10. A non-empty mutation queue must not be overwritten by a stale network snapshot.
11. Historical dashboard months must show actual data rather than current-month recurring projections.
12. Server secrets must never use NEXT_PUBLIC names.

## 24. Glossary

| Term | Meaning |
|---|---|
| Actual-to-date | Expense transactions dated from the current month start through today |
| Canonical snapshot | Latest successfully fetched Supabase dataset |
| Completed month | A prior month considered fully tracked and eligible for forecast history |
| Cycle | One scheduled occurrence of a recurring rule |
| Demo mode | Signed-out browsing backed by generated sample data; reads are local and writes are refused |
| Legacy demo user | The fixed shared UUID used before auth, retired by claim_legacy_data |
| Derived state | A value computed from loaded entities rather than stored independently |
| Mutation queue | FIFO list of offline writes awaiting replay |
| PWA | Installable web application using a manifest and service worker |
| Recurring due | Outstanding expense-rule occurrences through current month end |
| RLS | PostgreSQL/Supabase row-level security |
| Variable spending | Expenses not marked or linked as recurring |
| VAPID | Key-based identity used by Web Push application servers |

## 25. Source-of-truth index

For implementation questions, start with:

- **Domain and schema:** [packages/shared/src/types.ts](../packages/shared/src/types.ts), [supabase](../supabase/)
- **Database mapping:** [packages/shared/src/supabase-data.ts](../packages/shared/src/supabase-data.ts)
- **Client commands and derived data:** [apps/web/components/use-app-state.ts](../apps/web/components/use-app-state.ts)
- **Offline behavior and demo gating:** [apps/web/lib/offline-data.ts](../apps/web/lib/offline-data.ts)
- **Session, auth UI, and demo routing:** [apps/web/components/use-session.ts](../apps/web/components/use-session.ts), [apps/web/components/app-gate.tsx](../apps/web/components/app-gate.tsx), [apps/web/lib/demo-data.ts](../apps/web/lib/demo-data.ts)
- **Financial calculations:** [packages/shared/src/metrics.ts](../packages/shared/src/metrics.ts)
- **Recurring semantics:** [packages/shared/src/recurring.ts](../packages/shared/src/recurring.ts)
- **PWA behavior:** [apps/web/app/manifest.ts](../apps/web/app/manifest.ts), [apps/web/app/sw.ts](../apps/web/app/sw.ts)
- **Push dispatch:** [apps/web/app/api/push/dispatch/route.ts](../apps/web/app/api/push/dispatch/route.ts)
- **UI shell and routes:** [apps/web/components/expense-tracker-app.tsx](../apps/web/components/expense-tracker-app.tsx)
- **Landing site:** [apps/landing](../apps/landing/)
