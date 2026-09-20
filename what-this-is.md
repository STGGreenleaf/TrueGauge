# What this is

_Written 2026-09-20. It describes what is here, for somebody who has never opened this repo. Every figure
was read from this codebase or run against it on that date, not recalled. Where something is half-built
it says so; a description that flatters is a description nobody can use._

**One line:** an instrument panel for a small business — it turns one number the owner already knows,
the monthly overhead, into a daily answer to *"am I going to make it this month?"*, and it is honest
about which of its readings are estimates.

---

## The end purpose

Built for the operator who checks the bank balance at 2am. You enter today's sales in ten seconds; the
panel tells you where you stand. No bank linking, no subscription, no data sold — the owner types their
own numbers and they stay in their own space.

Everything hangs off **the NUT**: monthly fixed overhead, the amount the business must clear before
anything else is true. From it:

- **Survival %** — how much of the month's required sales are in.
- **Pace** — ahead or behind, measured against the hours the shop is actually open.
- **The pit board** — what each remaining open day has to bring in.
- **Cash, velocity, runway** — what is on hand, how fast it is moving, and the date it crosses a floor.

The stated design rule is *truth over vibes*: an estimate is labelled an estimate, and missing data shows
as missing.

## The stack

Next.js 16 · React 19 · TypeScript · Prisma 5 over Supabase Postgres · Supabase Auth (Google) · Tailwind ·
Vercel. 20 runtime dependencies.

**320 commits — 268 of them in January 2026.** About 28,000 lines. 14 pages, 29 API routes, 18 data
models. **141 tests in 2 files, all passing on 2026-09-20.** Live at truegauge.app.

## The engine — `src/lib/calc.ts`

1,885 lines of pure functions, with 1,289 lines of tests beside it. Money is plain dollars, rates are
0–1, and **dates are `YYYY-MM-DD` strings compared as strings** — a `Date` object appears only to find the
day of the week, in UTC, so a timezone can never move a sale into the wrong day.

**The goal is sales needed, not costs.**

```
keepRate      = 1 − targetCogs% − targetFees%          calc.ts:45
survivalGoal  = round( NUT / keepRate )                calc.ts:53     Infinity if keepRate ≤ 0
idealGoal     = round( (NUT + roofFund + ownerDraw) / keepRate )      calc.ts:67
survival %    = mtdSales / survivalGoal × 100, one decimal, clamped 0–200     calc.ts:84
```

A shop with a $10,000 NUT that keeps 60 cents of each dollar does not need $10,000 — it needs $16,667.
Dividing by the keep rate is the whole idea.

**Pace is weighted by open hours, not by the calendar.** The week is a template of hours per day. A day's
share of the month's goal is `dayHours / totalOpenHoursInMonth` (`calc.ts:107`); the target-to-date is the
sum of those shares; pace is sales minus that (`calc.ts:146`). A closed Monday contributes zero, so it
can never make you "behind", and a long Saturday carries more than a short Tuesday.

**The pit board** — `dailyNeededFromHere` (`calc.ts:398`): what is left, divided by the open days
*strictly after* the last day with sales. `Infinity` when there are none left and you are short.

**"As of" is the last day you entered, not today.** Every gauge computes to the latest date that has
sales (`src/app/api/dashboard/route.ts:60-79`), so a day nobody has typed in yet never reads as a bad
day. *Sales not entered* appears only once the shop's closing hour has passed.

**One big purchase does not wreck a month.** A spread expense is charged `amount / months` for each month
it covers (`calc.ts:190-262`). That gives two results side by side: **Cash Logged** — what actually left
the account — and **True Health**, with lumpy buys smoothed (`calc.ts:273-304`).

**Readings carry their confidence.** A 0–100 score from how many days have data, whether expenses are
recent, and whether there are sales at all (`calc.ts:456`). It is not decoration: at MEDIUM the date the
cash crosses a threshold gets a ±20% band, at LOW ±40% (`calc.ts:852-928`). Every point in a series is
tagged `ACTUAL`, `ESTIMATED` or `RECONCILED`.

**Estimates are bent to fit the truth.** With no daily history, a cash line is built from last year's
reference months, distributed by open hours — then **rescaled so it passes exactly through every known
balance** (`reconcileSeriesToSnapshot`, `calc.ts:1219`). Real points override estimated ones by date. A
starting balance that had to be inferred says how: `USER_PROVIDED`, `BACK_CALCULATED` or `DEFAULT`, each
with its own confidence (`calc.ts:1298`).

**Runway** — `floor(cash / dailyBurn)`, `Infinity` when not burning (`calc.ts:1766`). **Safe to spend** —
cash above an operating floor the owner sets (`calc.ts:1616`). **Overhead has a history** — a change to
the NUT takes effect from a date and is never applied backwards (`prisma/schema.prisma:60-71`).

One composite **health score**: pace 50, cost of goods 20, operating costs 15, confidence 15
(`calc.ts:486`).

## What makes it unusual

**An API built to be driven by an assistant, with an undo.** One route, `?action=`, 14 reads and 11
writes (`src/app/api/external/truegauge/route.ts`). Every write accepts `preview: true` and answers with
a plain-English statement of its impact and an id good for five minutes; `confirm` performs it; `undo`
reverses it within the hour (`:815-872`, `:1018-1122`). Undo is **data, not code**: each write stores the
before-image in an audit row (`src/lib/api-keys.ts:161-205`).

**Keys done properly.** `tg_sk_` plus 32 hex, shown once; only a SHA-256 hash and a display prefix are
stored; scoped to an organisation; revocable (`src/lib/api-keys.ts:9-77`).

**Alerts from rules, not from a model.** Behind pace, below survival (critical under 80%), cost of goods
two points over target, low confidence, cash under the floor (`route.ts:408-469`).

**A demo that never ages and cannot be vandalised.** The showcase is a real organisation with a frozen
"today", guarded by `assertNotShowcase()` on every write and by a matching read-only database policy
(`src/lib/org.ts:7-20`, `supabase/migrations/20260111_rls_showcase_readonly.sql`).

**An account provisions itself.** A signed-in user with no organisation gets one on first request; a real
user found attached to the demo is detached (`src/lib/org.ts:86-177`).

**A backup that cannot silently go stale.** The list of exported tables is asserted by a unit test, so
adding a table without adding it to the backup fails the suite (`src/lib/export.test.ts:14-33`).

**The operator's view across every store** — activity by hour and weekday, retention cohorts, logging
streaks, a per-store consistency count, feature adoption (`src/app/api/owner/analytics/route.ts:45-221`).
Owner status is decided on the server; the browser is only ever told `isOwner: true`.

**Feedback that answers back** — a widget, an owner reply, an unread dot (`src/components/FeedbackButton.tsx`).

**A printable month** — per day: this year, last year (starred when estimated), goal %, expenses, running
total, pace; from one builder, as a landscape page or a CSV (`src/app/api/calendar/export/route.ts`).

**One daily cron**, and all it does is stop a free-tier database from going to sleep (`vercel.json`).

## What travels

The parts worth lifting into anything that already has sales data: the **keep-rate gross-up**, the
**hours-weighted pace**, the **as-of discipline**, the **pit board**, **spread normalisation**,
**confidence that widens a band** rather than decorating a number, **reconciling an estimate to known
points**, and **preview → confirm → undo** for any write an assistant is allowed to make.

## What is not built

- **Closures and holidays.** Open days come only from a weekly template — no one-off closed day, no
  seasonal hours.
- **Email of any kind.** The alerts and the team invites both sit in the database waiting for a reader.
- **Tap-to-explain is hand-written.** Each number's derivation is inline markup repeated per page
  (`src/app/dashboard/page.tsx:1053-1160`); nothing carries a formula from `calc.ts` to the screen. A
  `{ value, formula, inputs, confidence }` envelope is the refactor that would make it a mechanism.
- **The headline math is untested.** `paceDeltaHoursWeighted`, `mtdTargetToDateHoursWeighted`,
  `targetForDay`, `runwayDays` and `dailyBurnRate` have no test references. `ENGINE_ROOM.md:189` says
  every function has one.
- **CSV import, multi-store, what-if scenarios** — written down in `ROADMAP.md` and `CHECKLIST.md`, not
  started. Vendor recurring-bill columns exist in the schema and nothing reads them.
- Preview ids and the rate limiter both live in one server instance's memory.

## Known drift

- **The printed month and the dashboard disagree.** The export computes its goal as
  `NUT + ownerDraw` — **not divided by the keep rate** — and paces by flat calendar days
  (`src/app/api/calendar/export/route.ts:87-92, 128-133`). The dashboard uses `survivalGoalNetExTax` and
  open hours. `CONTRACTS.md:28-29` promises hours-weighting everywhere.
- `ENGINE_ROOM.md:203-219` documents five function signatures that no longer exist.
- `TRUEGAUGE_OVERVIEW.md:59` says Next.js 14; it is 16.
- `ROADMAP.md:143` lists shared team access as *maybe never*; invites and roles are built.
- `truegauge_fulkit_integration_playbook.md:201-203` describes the external API as an edge function; it is
  a route handler (`src/app/api/external/truegauge/route.ts`).

All logged in `CHECKLIST.md`, not fixed.

## Current state

**Paused, and running.** Last feature work 2026-03-12; two housekeeping commits on 2026-09-07. It serves,
its one cron keeps the database awake, and the test suite is green.
