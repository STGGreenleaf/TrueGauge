# TrueGauge Engine Room

Technical internals: API patterns, data flow, testing, and implementation details.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS | Utility-first styling |
| **Icons** | Lucide React | Icon library |
| **Components** | Shadcn/ui | Primitives (button, dialog, etc.) |
| **Database** | PostgreSQL (Supabase) | Data persistence |
| **ORM** | Prisma | Database queries |
| **Auth** | Supabase Auth | Google/GitHub OAuth |
| **Validation** | Zod | Schema validation |
| **Testing** | Vitest | Unit testing |
| **Deployment** | Vercel | Auto-deploy from GitHub |

---

## Data Flow

### Dashboard Load Sequence

```
1. User visits /
2. page.tsx calls fetchDashboard()
3. GET /api/dashboard
   └─ getSession() → validate auth
   └─ getOrganization() → get user's org
   └─ Query Prisma:
      ├─ Settings
      ├─ DayEntries (current month)
      ├─ ExpenseTransactions (current month)
      └─ ReferenceMonths
   └─ calc.ts functions compute:
      ├─ survivalGoal
      ├─ survivalPercent
      ├─ paceDelta
      ├─ dailyNeededFromHere
      └─ confidenceScore
4. Return DashboardData JSON
5. Components render with data
```

### Write Operation Pattern

```
1. User submits form
2. POST/PUT /api/{resource}
3. Route handler:
   └─ getSession() → validate auth
   └─ getOrganization() → get org + verify ownership
   └─ assertNotShowcase(orgId) → prevent demo writes
   └─ Zod schema.parse(body) → validate input
   └─ prisma.{model}.create/update/upsert()
4. Return success/error JSON
```

---

## API Route Patterns

### Standard Route Structure

```typescript
// src/app/api/{resource}/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getOrganization, assertNotShowcase } from '@/lib/org';
import { ResourceSchema } from '@/lib/types';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await getOrganization(user.id);
    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const data = await prisma.resource.findMany({
      where: { organizationId: org.id },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/resource error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await getOrganization(user.id);
    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    assertNotShowcase(org.id); // Throws if showcase

    const body = await request.json();
    const validated = ResourceSchema.parse(body);

    const created = await prisma.resource.create({
      data: {
        ...validated,
        organizationId: org.id,
      },
    });

    return NextResponse.json(created);
  } catch (error) {
    if (error instanceof Error && error.message === 'Showcase read-only') {
      return NextResponse.json({ error: 'Demo mode is read-only' }, { status: 403 });
    }
    console.error('POST /api/resource error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Key Helper Functions

| Function | File | Purpose |
|----------|------|---------|
| `getSession()` | `src/lib/auth.ts` | Get current user from Supabase session |
| `getOrganization(userId)` | `src/lib/org.ts` | Get user's organization with settings |
| `assertNotShowcase(orgId)` | `src/lib/org.ts` | Throw if trying to write to demo org |

---

## API Route Inventory

### Core Data Routes

| Endpoint | Methods | Purpose | File |
|----------|---------|---------|------|
| `/api/dashboard` | GET | Main dashboard data | `src/app/api/dashboard/route.ts` |
| `/api/day-entries` | GET, POST, PUT | Daily sales CRUD | `src/app/api/day-entries/route.ts` |
| `/api/expenses` | GET, POST, PUT, DELETE | Expense transactions | `src/app/api/expenses/route.ts` |
| `/api/settings` | GET, PUT | Organization settings | `src/app/api/settings/route.ts` |
| `/api/vendors` | GET, POST, PUT, DELETE | Vendor templates | `src/app/api/vendors/route.ts` |
| `/api/reference-months` | GET, POST | Last-year totals | `src/app/api/reference-months/route.ts` |

### Calendar Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/calendar/[month]` | GET | Month data with entries |
| `/api/annual` | GET | Year overview data |

### Owner-Only Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/owner/analytics` | GET | Platform-wide metrics |
| `/api/owner/search-console` | GET | Google Search Console data |
| `/api/owner/sync-users` | POST | Sync Supabase users to Prisma |

### Utility Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/auth/me` | GET | Current user + isOwner flag |
| `/api/export/json` | GET | Full data backup |
| `/api/activity` | GET, POST | User activity tracking |

---

## Calculation Module (`src/lib/calc.ts`)

### Architecture Principles

1. **Pure functions only** — No side effects, no database calls
2. **Unit tested** — Every function has corresponding tests
3. **UTC dates** — All date math uses UTC day-of-week
4. **Rates as 0-1** — Never percentages in logic
5. **Explicit types** — Full TypeScript interfaces

### Key Functions

```typescript
// Survival calculations
keepRate(targetCogsPct, targetFeesPct): number
survivalGoalNetExTax(monthlyFixedNut, targetCogsPct, targetFeesPct): number
survivalPercent(mtdNetSales, survivalGoal): number  // Clamped 0-200

// Pacing calculations
hoursForISODate(dateStr, template): number
mtdTargetToDate(settings, openHoursTemplate, asOfDate): number
paceDelta(mtdNetSales, mtdTarget): number
dailyNeededFromHere(remaining, remainingOpenDays, avgDailyHours): number

// Date utilities
getDayOfWeek(isoDateStr): 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
parseISODate(str): { year, month, day }
isOpenDay(dateStr, template): boolean

// Confidence scoring
confidenceScore(factors: ConfidenceFactors): number  // 0-100
confidenceLevel(score): 'HIGH' | 'MEDIUM' | 'LOW'

// Liquidity
changeSinceSnapshot(snapshotDate, dayEntries, expenses): number
cashOnHand(snapshotAmount, changeSince): number
buildContinuitySeries(...): ContinuityPoint[]
```

### Date Handling Rules

```typescript
// NEVER do this (timezone bugs)
const date = new Date('2026-01-15');

// ALWAYS do this (manual parsing)
function parseISODate(str: string): { year: number; month: number; day: number } {
  const [year, month, day] = str.split('-').map(Number);
  return { year, month, day };
}

// Get day of week in UTC
function getDayOfWeek(dateStr: string): DayKey {
  const { year, month, day } = parseISODate(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayIndex = date.getUTCDay();
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex] as DayKey;
}
```

---

## Type System (`src/lib/types.ts`)

### Zod Schema Pattern

```typescript
import { z } from 'zod';

// Define schema
export const DayEntrySchema = z.object({
  id: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  netSalesExTax: z.number().nullable(),
  notes: z.string().nullable().optional(),
});

// Export type
export type DayEntry = z.infer<typeof DayEntrySchema>;

// Use in API route
const validated = DayEntrySchema.parse(body);
```

### Key Types

| Type | Purpose |
|------|---------|
| `Settings` | Organization configuration |
| `DayEntry` | Single day's sales data |
| `ExpenseTransaction` | Single expense record |
| `OpenHoursTemplate` | 7-day hours schedule |
| `DashboardData` | Complete dashboard payload |
| `ConfidenceFactors` | Inputs for confidence scoring |

---

## Testing

### Test Framework: Vitest

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm test

# Run specific test file
npm test -- calc.test.ts
```

### Test File Location

| Source | Test |
|--------|------|
| `src/lib/calc.ts` | `src/lib/calc.test.ts` |
| `src/lib/export.ts` | `src/lib/export.test.ts` |

### Test Count: 141+

### Test Patterns

```typescript
import { describe, it, expect } from 'vitest';
import { survivalGoalNetExTax, survivalPercent } from './calc';

describe('survivalGoalNetExTax', () => {
  it('calculates survival goal correctly', () => {
    // 15500 / (1 - 0.35 - 0.03) = 25000
    expect(survivalGoalNetExTax(15500, 0.35, 0.03)).toBe(25000);
  });

  it('returns Infinity when keep rate is zero', () => {
    expect(survivalGoalNetExTax(15500, 0.5, 0.5)).toBe(Infinity);
  });
});

describe('survivalPercent', () => {
  it('clamps to 0-200 range', () => {
    expect(survivalPercent(75000, 25000)).toBe(200); // 300% clamped to 200
    expect(survivalPercent(-1000, 25000)).toBe(0);   // Negative clamped to 0
  });
});
```

### Test Guardrails

- Never delete tests
- Any calc.ts change requires test update first
- Run `npm run test:run` before every commit
- 141+ tests must pass for build to succeed

---

## Authentication Flow

### Supabase Auth Integration

```
1. User clicks "Sign in with Google"
2. Supabase redirects to Google OAuth
3. Google redirects back to /auth/callback
4. callback/route.ts:
   └─ Exchange code for session
   └─ Check if user exists in Prisma
   └─ If new: create User + Organization
   └─ If invited: join existing Organization
   └─ Redirect to dashboard
```

### Session Management

```typescript
// src/lib/auth.ts
import { createClient } from '@/lib/supabase/server';

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

### Owner Gating

```typescript
// Environment variable
OWNER_USER_ID=<supabase-auth-uuid>

// Check in API route
const isOwner = user.id === process.env.OWNER_USER_ID;
if (!isOwner) {
  return NextResponse.json({ error: 'Owner only' }, { status: 403 });
}
```

---

## Multi-Tenant Architecture

### Data Isolation

```typescript
// Every query includes organizationId filter
const entries = await prisma.dayEntry.findMany({
  where: { organizationId: org.id },
});

// Never query without org filter (except owner endpoints)
```

### Organization Creation (on signup)

```typescript
// src/app/auth/callback/route.ts
const org = await prisma.organization.create({
  data: {
    name: 'My Business',
    users: {
      create: {
        userId: user.id,
        role: 'owner',
      },
    },
    settings: {
      create: {
        businessName: 'My Business',
      },
    },
  },
});
```

### Showcase Mode (Demo Data)

```typescript
const SHOWCASE_ORG_ID = 'showcase-template';

// Check for showcase query param
const useShowcase = url.searchParams.get('showcase') === 'true';

// Prevent writes to showcase
export function assertNotShowcase(orgId: string) {
  if (orgId === SHOWCASE_ORG_ID) {
    throw new Error('Showcase read-only');
  }
}
```

---

## Component Architecture

### Client vs Server Components

| Type | Use For | Marker |
|------|---------|--------|
| Server | Static content, data fetching | Default (no marker) |
| Client | Interactivity, hooks, state | `'use client'` at top |

### Component Hierarchy

```
Layout (server)
└─ Nav (client) - user menu, activity tracker
└─ Page (client) - data fetching, state
   └─ FuturisticGauge - main gauge display
   └─ LiquidityCard - cash position
      └─ LiquidityReceiverV3 - timeline dial
   └─ MiniReadout - single metrics
   └─ StartupAnimation - splash screen
```

### Key Component Files

| Component | File | Purpose |
|-----------|------|---------|
| `FuturisticGauge` | `src/components/FuturisticGauge.tsx` | Main speedometer (0-200%) |
| `SideGauge` | `src/components/FuturisticGauge.tsx` | Vertical bar arrays |
| `MiniReadout` | `src/components/FuturisticGauge.tsx` | Single metric card |
| `LiquidityCard` | `src/components/LiquidityCard.tsx` | Cash position + burn analysis |
| `LiquidityReceiverV3` | `src/components/LiquidityReceiverV3.tsx` | Radio dial timeline |
| `StartupAnimation` | `src/components/StartupAnimation.tsx` | Headlight splash |
| `Nav` | `src/components/Nav.tsx` | Navigation + menus |
| `OwnerMenu` | `src/components/OwnerMenu.tsx` | Owner-only dropdown |

---

## Middleware

### Session Refresh

```typescript
// src/middleware.ts
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|sitemap.xml|robots.txt).*)',
  ],
};
```

---

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma → Supabase PostgreSQL |
| `DIRECT_URL` | Prisma migrations (pooler bypass) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key |
| `OWNER_USER_ID` | Supabase auth UUID for owner |

### Optional

| Variable | Purpose |
|----------|---------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Search Console API |
| `NEXT_PUBLIC_DEV_MODE` | Enable dev mode features |

---

## Build & Deploy

### Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Production Build

```bash
npm run build
# TypeScript check + Next.js build
# Tests run separately: npm run test:run
```

### Deployment (Vercel)

1. Push to `main` branch
2. Vercel auto-deploys
3. Environment variables configured in Vercel dashboard

### Pre-Commit Checklist

- [ ] `npm run test:run` passes (141+ tests)
- [ ] `npm run build` succeeds
- [ ] Docs updated if behavior changed

---

## Debugging Tips

### Common Issues

| Issue | Solution |
|-------|----------|
| Auth redirect loop | Check Supabase URL/keys in .env |
| Prisma type errors | Run `npx prisma generate` |
| Date bugs | Verify using UTC, not local timezone |
| Missing org data | Check organizationId filter in query |
| 500 errors | Check server logs, verify session |

### Logging

```typescript
// API routes log errors
console.error('POST /api/resource error:', error);

// Auth callback logs flow
console.log(`Auth callback for user: ${visitorId}`);
```

---

## Performance Considerations

### Database Queries
- Use `select` to limit returned fields
- Add indexes for frequently queried fields
- Batch queries with `Promise.all` where possible

### Client-Side
- Session storage for splash animation state
- Local storage for user preferences
- Debounce rapid API calls

### Build Optimization
- Next.js App Router with server components
- Dynamic imports for heavy components
- Image optimization via Next.js Image

---

*See `BLUEPRINT.md` for architecture overview • `STYLE_BACKBONE.md` for design system*
