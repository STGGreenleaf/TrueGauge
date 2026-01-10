# TrueGauge

Multi-tenant cockpit dashboard that helps businesses see their health at a glance and log daily numbers with minimal friction. Now cloud-first with Google sign-in.

## Purpose
This is a steering wheel, not accounting software.
It should reduce anxiety without lying.

## Architecture
- Cloud-first with Supabase (PostgreSQL) and Google OAuth
- Multi-tenant: each user gets their own organization
- Default timezone: America/Denver (configurable per org)
- Daily habit: one number by default - Net Sales (ex tax) from POS.
- Optional details exist but stay collapsed by default.
- Dashboard is overview only. Data entry happens in Diary and tool pages.
- Math lives in pure functions and has tests.
- Any estimate must be labeled as estimate.

## Visual direction
Premium cockpit instrument cluster. Porsche and Mercedes vibes.
Glassy speedometer, minimal modern layout, calm but sexy.

See `DESIGN.md` for complete visual system (colors, components, spacing).

## Current status summary
### Today's session
Store Hours fold in Settings:
- 7-day hours editor (Mon-Sun, 0 means closed)
- Closing hour setting (for "sales not entered" warning)
- Collapsed view shows weekly hours summary
- Hours feed weighted pacing calculations

Last Year Reference feature:
- ReferenceMonth table
- /api/reference-months CRUD
- Reference Year editor (12 month inputs, year selector)
- Dashboard shows last year month total and a labeled pace estimate

Mobile layout:
- 4-corner instruments around main gauge
- Mini bar meters with gradient aligned to desktop theme

Previously built:
- Startup animation (headlight flicker, text reveal)
- Dashboard cockpit gauge components
- Expense tracking (COGS, OPEX, CAPEX, spreads)
- Settings page (nut breakdown, targets, survival goal)
- Month View calendar navigation and daily sales entry
- Diary page for sales and expense entry

## Core definitions
### Sales basis
Default input is Net Sales (ex tax).
Do not mix taxes or fees into "profit" numbers unless explicitly labeled.

### asOfDate (critical for sanity)
Dashboard must score "as of" the last completed day, not the system clock.
- asOfDate = latest date with non-null Net Sales entry.
- Day N of 31 and all pacing math uses asOfDate.
- If today > asOfDate and store is open, show "Sales not entered for today" indicator.
- Do not penalize Pace Delta for an unentered day.

### Hours-weighted pacing
Targets are prorated by open hours, not calendar days.
- totalOpenHoursInMonth = sum(hours for each date)
- targetForDay(d) = monthGoal * (hours(d) / totalOpenHoursInMonth)
- mtdTargetToDate(asOfDate) = sum(targetForDay(d)) for dates <= asOfDate

### Survival goal
keepRate = 1 - targetCogsPct - targetFeesPct
survivalGoalNetSales = monthlyFixedNut / keepRate

Current default targets (editable in Settings):
- monthlyFixedNut: 18125
- targetCogsPct: 0.35
- targetFeesPct: 0.03

### True Health spreading
For lumpy purchases, allow "spread over N months".
- Straight-line equal monthly slices
- Starts in purchase month
- True Health uses normalized slices instead of raw cash hits

## Dashboard instruments
### Center gauge
Survival
- Survival percent = MTD Net Sales / survivalGoalNetSales
- Display 0 to 200% with a hard marker at 100%

### Corner and side instruments
Pace Delta
- Pace Delta = MTD Net Sales (to asOfDate) - mtdTargetToDate(asOfDate)
- Label as ahead or behind

Cash Logged (or Cash After Logged)
- Cash Logged = MTD Net Sales - logged expenses (to asOfDate)
- Must be labeled clearly as based on logged expenses
- Must include a confidence indicator

### Liquidity Card (Manual Snapshot)
A separate card below the top cluster showing cash position when a snapshot is set in Settings:
- `cashNow = cashSnapshotAmount + changeSinceSnapshot(asOfDate)`
- `changeSinceSnapshot = (net sales after snapshot) - (logged expenses after snapshot)`
- 7-day mini bar strip showing daily net cash flow (positive=cyan, negative=red, missing=dim dash)
- Runway vs Nut % line: `runwayPct = clamp(cashNow / monthlyFixedNut, 0, 1)`
- Labels "est" when confidence != HIGH
- Empty state with CTA "Set cash snapshot" when no snapshot set
- Top cluster right-side "Cash Logged" instrument unchanged
- Snapshot date is exclusive (changes counted AFTER that date)

Mini readouts
- MTD Sales
- COGS: if no PO logged, show "Est 35% (not logged)" instead of 0%
- OPEX: if none logged, show "Not logged" or show 0 with low confidence
- Remaining to goal
- Confidence

## Last year reference
Store one number per month for last year (month total Net Sales ex tax).
Dashboard shows:
- Last Year month total (ex: Jan 2025)
- This Year MTD
- Optional: pace estimate vs last year month total using hours ratio
Anything that is not backed by daily last-year entries must be labeled estimate.

## Data model (high level)
- Settings (single row)
- DayEntry (date unique, netSalesExTax, notes)
- ExpenseTransaction (date, category, enum, amount, vendor, spreadMonths, memo)
- VendorTemplate (optional)
- ReferenceMonth (year, month, referenceNetSalesExTax)

## Guardrails to prevent drift
- Any math change must update tests.
- Any label must match the underlying definition.
- Missing data must never look like good performance.
Use "not logged" or "estimated" instead of zeros.

## Linked Docs

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Phases, AI guardrails, current status |
| `CONTRACTS.md` | Non-negotiables (math, dates, units) |
| `CHECKLIST.md` | Current work queue (Now/Next/Done) |
| `DESIGN.md` | Visual system (colors, components, spacing) |

See `CHECKLIST.md` for current priorities.
See `ROADMAP.md` for phase status and AI collaboration rules.

## Changelog
- 2026-01-09: **Milestone 3: Brand & Polish** complete
  - Brand Guidelines page with social preview editor, canvas-based export, saved variations (up to 3) with thumbnails
  - Favicon updated to transparent PNG (16, 32, 48, 192, 512px + Apple Touch)
  - og-image.png for social sharing (1200×630) with cache-busting
  - Privacy Policy page (/privacy) and Terms of Service page (/terms)
  - Google OAuth consent screen branded (TrueGauge logo, hello@colsha.co contact)
  - Operator's Manual added to Owner Menu
  - Splash duration configurable via Owner Portal (persists to Supabase)
  - Drawer state persistence in localStorage
- 2026-01-04: **Milestone 2: Burn Analysis & Runway Clarity** complete
  - Burn Analysis panel in Liquidity Card header (Monthly burn, Annual gap, Floor|Zero date, Gap to BE)
  - Speech bubble tooltips with detailed explanations on click
  - Emergency Floor setting (operatingFloorCash) added to Settings
  - Floor|Zero uses LY-based burn rate when velocity positive to show "looming date"
  - FLOOR label on right-side scale in Liquidity Receiver
  - estBalance (violet dashed) formula documented: yearStartCash + Σ(dailySales × 62% - dailyNut)
  - Timeline refinements: calendar-aligned ticks, smooth panning, full year visibility
- 2026-01-02: **Liquidity Receiver V3 Radio Dial Stack** complete - Stacked layout with amber NOW needle, lens window scrub, visible-slice scaling, color-mapped LED blocks, readouts (balance/safe to spend/runway), 141 tests passing
- 2026-01-02: **Cash on Hand Snapshot** complete - Manual cash snapshot in Settings, dashboard liquidity instrument, 77 tests passing
- 2026-01-02: **Export Backup** complete - JSON/CSV export with server-side ZIP, 68 tests passing
- 2026-01-02: **Cash Logged label fix** - renamed from "After Expenses", confidence-aware subtext
- 2026-01-02: **Milestone: No More Wondering** - Dashboard Pit Board + Trust Layer
  - Pit Board: Daily Needed, Remaining, Remaining Open Days wired via dailyNeededFromHere
  - asOfDate contract: dashboard never penalizes unentered day, midnight doesn't flip pacing
  - Confidence UI: HIGH/MEDIUM/LOW badge + score (0-100), badges on Pit Board
  - COGS/OPEX: show "Est" or "not logged" when not logged
  - Cash Logged: labeled "missing expenses?" when confidence LOW
  - 54 unit tests passing (added isOpenDay tests)
- 2026-01-02: Calc module refactor complete (UTC hours, rates 0-1, clamped survivalPercent, manual ISO parsing, dailyNeededFromHere, deprecated funcs moved, tests passing)
