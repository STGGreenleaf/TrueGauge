# TrueGauge Blueprint

A complete reference for recreating this app's architecture and premium cockpit UI feel.

---

## Philosophy

**Local-first cockpit dashboard.** This is a steering wheel, not accounting software. It should reduce anxiety without lying.

### Core Intent
- Show business health at a glance with minimal daily friction
- Never let missing data look like success
- Premium instrument cluster aesthetic (Porsche/Mercedes vibes)
- Dark theme only, calm but information-dense

### Truthfulness Constraints
| Constraint | Implementation |
|------------|----------------|
| Missing data ≠ zero | Show "not logged" or "estimated" labels |
| Unentered day ≠ failure | `asOfDate` contract prevents false penalties |
| Estimates labeled | Any normalization shows "est" badge |
| Confidence visible | HIGH/MEDIUM/LOW badges on key metrics |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Next.js 14                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   /app      │  │ /components │  │    /lib     │  │   │
│  │  │  (routes)   │  │    (UI)     │  │   (logic)   │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   │
│  │         │                │                │          │   │
│  │         └────────────────┼────────────────┘          │   │
│  │                          │                           │   │
│  │                    ┌─────┴─────┐                     │   │
│  │                    │  Prisma   │                     │   │
│  │                    │   ORM     │                     │   │
│  │                    └─────┬─────┘                     │   │
│  └──────────────────────────┼───────────────────────────┘   │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │     SUPABASE      │
                    │  ┌─────────────┐  │
                    │  │ PostgreSQL  │  │
                    │  └─────────────┘  │
                    │  ┌─────────────┐  │
                    │  │    Auth     │  │
                    │  │(Google OAuth)│ │
                    │  └─────────────┘  │
                    └───────────────────┘
```

---

## Non-Negotiables vs Preferences

### Non-Negotiables (Never Break)

| Category | Rule |
|----------|------|
| **Math** | Rates are 0-1, not percentages. UI converts for display. |
| **Math** | Money stored as `number` (dollars). Round for display. |
| **Math** | `survivalPercent` clamped to 0-200 for gauge stability. |
| **Dates** | All date keys are ISO `YYYY-MM-DD`. |
| **Dates** | Day-of-week computed in UTC only. Never `new Date('YYYY-MM-DD')`. |
| **Data** | `asOfDate` = latest date with non-null Net Sales entry. |
| **Data** | Never penalize unentered days in pacing. |
| **Data** | Missing data shows "not logged" or "estimated", never 0. |
| **UI** | Dark theme only. No light mode. |
| **UI** | Labels uppercase with `tracking-widest`. |
| **UI** | Glow = meaning, not decoration. |
| **Tests** | Never delete tests. Add or fix, never remove. |
| **Tests** | Any `calc.ts` change requires test update first. |

### Preferences (Strong Conventions)

| Category | Convention |
|----------|------------|
| **Layout** | Mobile-first, max-w-4xl or max-w-6xl containers |
| **Spacing** | `gap-3` or `gap-4` between cards, `p-4` or `p-5` card padding |
| **Colors** | Cyan=good, Amber=warning, Red=danger, Zinc=neutral |
| **Components** | Glass card pattern for all content containers |
| **Animation** | 1.5s gauge sweep, 150ms hover transitions |
| **Typography** | System font stack, no custom fonts |

---

## Folder Structure

```
/prisma
  schema.prisma           # Data models (PostgreSQL via Supabase)

/public
  favicon-*.png           # App icons (16, 32, 48, 192, 512)
  og-image.png            # Social preview (1200×630)

/src
  /app
    page.tsx              # Dashboard (main cockpit view)
    layout.tsx            # Root layout with metadata
    /api                  # API routes (Next.js App Router)
      /dashboard          # Main dashboard data endpoint
      /day-entries        # Daily sales CRUD
      /expenses           # Expense transactions CRUD
      /settings           # Organization settings
      /owner              # Owner-only endpoints
    /settings             # Settings page
    /diary                # Daily entry page
    /vendors              # Vendor management
    /owner-portal         # Owner analytics dashboard
    /owner/brand          # Brand guidelines editor

  /components
    FuturisticGauge.tsx   # Main speedometer gauge (0-200%)
    LiquidityCard.tsx     # Cash position card with burn analysis
    LiquidityReceiverV3.tsx  # Radio dial timeline visualization
    StartupAnimation.tsx  # Headlight flicker animation
    Nav.tsx               # Navigation + user menu
    MiniInstrument.tsx    # Corner instruments
    OwnerMenu.tsx         # Owner-only dropdown menu
    /ui                   # Shadcn primitives (button, dialog, etc.)

  /lib
    calc.ts               # Pure calculation functions (141+ tests)
    calc.test.ts          # Vitest unit tests
    types.ts              # Zod schemas + TypeScript types
    design.ts             # Design tokens (colors, gradients, styles)
    prisma.ts             # Prisma client singleton
    auth.ts               # Session helpers
    org.ts                # Organization context helpers

  /hooks
    useActivityTracker.ts # Client-side activity logging

  middleware.ts           # Supabase session refresh
```

---

## Data Model (Prisma)

### Core Entities

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Supabase auth user | `id` (UUID), `email`, `name` |
| `Organization` | Tenant container | `id`, `name`, `settings` |
| `OrganizationUser` | User-org membership | `userId`, `organizationId`, `role` |
| `Settings` | Per-org configuration | `monthlyFixedNut`, `targetCogsPct`, `openHoursTemplate` |
| `DayEntry` | Daily sales record | `date`, `netSalesExTax`, `notes` |
| `ExpenseTransaction` | Expense record | `date`, `category`, `amount`, `spreadMonths` |
| `ReferenceMonth` | Last-year totals | `year`, `month`, `referenceNetSalesExTax` |
| `VendorTemplate` | Recurring expense preset | `name`, `defaultCategory`, `typicalAmount` |

### Multi-Tenant Isolation
- Every query filters by `organizationId`
- App-layer enforcement (Prisma queries include org filter)
- Future: Supabase RLS for defense-in-depth

---

## Key API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dashboard` | GET | Main cockpit data (survival, pacing, liquidity) |
| `/api/day-entries` | GET/POST/PUT | Daily sales CRUD |
| `/api/expenses` | GET/POST/PUT/DELETE | Expense transactions |
| `/api/settings` | GET/PUT | Organization settings |
| `/api/calendar/[month]` | GET | Month calendar with entries |
| `/api/export/json` | GET | Full data backup |
| `/api/owner/analytics` | GET | Owner-only platform metrics |
| `/api/owner/search-console` | GET | Google Search Console data |

---

## Key Calculations (`src/lib/calc.ts`)

| Function | Formula | Purpose |
|----------|---------|---------|
| `keepRate` | `1 - targetCogsPct - targetFeesPct` | Portion kept after COGS/fees |
| `survivalGoalNetExTax` | `monthlyFixedNut / keepRate` | Monthly survival threshold |
| `survivalPercent` | `(mtdNetSales / survivalGoal) × 100` | Gauge position (0-200) |
| `dailyNeededFromHere` | `remaining / remainingOpenHours × avgDailyHours` | Pacing guidance |
| `confidenceScore` | Weighted factors (0-100) | Data quality indicator |
| `hoursForISODate` | Template lookup by UTC day | Hours-weighted pacing |

---

## Glossary

| Term | Definition |
|------|------------|
| **asOfDate** | Latest date with non-null Net Sales entry. All pacing computed to this date. |
| **Survival Goal** | Net sales needed to cover fixed costs after COGS/fees. |
| **Monthly Fixed Nut** | Total fixed monthly expenses (rent, utilities, payroll, etc.). |
| **Keep Rate** | `1 - COGS% - Fees%`. The portion of each dollar retained. |
| **True Health** | Expenses normalized (spread over months) vs raw cash hits. |
| **Cash Logged** | MTD Net Sales minus logged expenses. |
| **Confidence** | HIGH/MEDIUM/LOW rating of data completeness. |
| **Showcase** | Demo mode showing Brightline Supply Co. sample data. |
| **Organization** | Tenant container. Each user gets one on signup. |
| **Spread** | Amortizing a large expense across multiple months. |

---

## How to Rebuild This Vibe in a New Product

### Step 1: Set Up the Stack
```bash
npx create-next-app@latest --typescript --tailwind --app
npm install prisma @prisma/client zod lucide-react
npm install @supabase/supabase-js @supabase/ssr
npx shadcn-ui@latest init
```

### Step 2: Establish Design Tokens
Create `/src/lib/design.ts` with:
- Color palette (cyan, amber, red, emerald, violet, zinc scale)
- Glass card classes
- Typography hierarchy (label, value, heading)
- Status color mapping

### Step 3: Build the Glass Card Primitive
```tsx
<div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-5 backdrop-blur-sm">
```

### Step 4: Create Instrument Components
1. **Gauge** - SVG arc with zone colors (red→amber→cyan)
2. **MiniReadout** - Label + value + status color
3. **ProgressBar** - Gradient fill with tick marks

### Step 5: Implement Core Math
- All calculations in pure functions
- Unit test every formula
- Rates as 0-1, money as dollars
- Date math in UTC only

### Step 6: Add Truthfulness Layer
- `asOfDate` contract
- Confidence scoring
- "Not logged" / "Estimated" labels
- Never show 0 for missing data

### Step 7: Wire Multi-Tenant Auth
- Supabase Auth with OAuth
- Organization per user
- `organizationId` filter on all queries

### Step 8: Polish Animations
- 1.5s gauge sweep on load
- 150ms hover transitions
- Startup animation (optional)

---

## Quick Start for a New Team

### Checklist

- [ ] Clone and install: `npm install`
- [ ] Set up Supabase project and get credentials
- [ ] Copy `.env.example` to `.env.local` and fill in values
- [ ] Run migrations: `npx prisma migrate dev`
- [ ] Run tests: `npm run test:run` (must pass)
- [ ] Start dev server: `npm run dev`
- [ ] Read docs in order: CONTRACTS → DESIGN → Project → CHECKLIST → ROADMAP
- [ ] Make first change, run tests, commit

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection to Supabase PostgreSQL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key |
| `OWNER_USER_ID` | Supabase auth UUID for owner gating |

---

## Related Documents

| File | Purpose |
|------|---------|
| `STYLE_BACKBONE.md` | Design system mechanics (layout, typography, spacing) |
| `ENGINE_ROOM.md` | Technical internals (API patterns, data flow, testing) |
| `CONTRACTS.md` | Non-negotiable math and date rules |
| `DESIGN.md` | Visual language specification |
| `ROADMAP.md` | Phases and AI guardrails |

---

*Built by TrueGauge • January 2026*
