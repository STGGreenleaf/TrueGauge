# HB Health Machine - Checklist

Rule: do not delete completed work. Move it to Done with a date.

**Before starting work:** Read `ROADMAP.md` for AI guardrails and context requirements.

## Now (In Progress)
- [ ] Expense vendor templates (recurring bills)
  - Accept: create vendor presets and one-tap add to a date

## Next (Queued)
- [ ] Last-year month totals entry UX polish
  - Accept: 12-month grid, year selector, dashboard shows LY total plus labeled pace estimate
- [ ] Cockpit indicators polish (engine lights)
  - Accept: "Sales not entered" and "Low confidence" indicators are obvious but not panic inducing

## Backlog (Later)
- [ ] Import helpers (CSV for reference months, optional day entries)
- [ ] True Health toggle details (cash vs normalized view)
- [ ] Multi-store support (future)
- [ ] Liquidity Receiver V4: Preset 5 becomes best/worst stretch
- [ ] Liquidity Receiver V4: Micro ticks only when zoom tight
- [ ] Liquidity Receiver V4: Future region shaded and desaturated

## Done (Archive)
- [x] 2026-01-04: **Burn Analysis Panel** complete
  - Right-side panel in Liquidity Card header showing: Monthly burn, Annual gap, Floor|Zero date, Gap to Break-Even
  - Speech bubble tooltips on click with detailed explanations
  - Floor|Zero uses LY-based burn rate when velocity positive to show "looming date"
  - Emergency Floor setting added to Settings page (operatingFloorCash)
  - FLOOR label on right-side scale in Liquidity Receiver
- [x] 2026-01-04: **Liquidity Receiver V3 Timeline Refinements** complete
  - Calendar-based daily/weekly tick marks aligned to actual dates
  - Month labels (DEC, JAN, FEB, MAR) with symmetric fade effect
  - Panning sensitivity adjusted for smooth week-by-week navigation
  - Click behavior in TODAY mode pans viewport (not scrubs needle)
  - Full year data visible when panning back to Jan 1
  - LIVE info box with future zone styling
  - REF 2025 badge showing year reference
- [x] 2026-01-04: **estBalance Tracing** documented
  - Violet dashed line = buildContinuitySeries from calc.ts
  - Formula: yearStartCash + cumulative(dailySales × 62% - dailyNut)
  - Daily nut = monthlyNut / 30.4
  - 60K→40K drop validated against actual settings ($18,125 nut = -$22K/year gap)
- [x] 2026-01-02: **Liquidity Receiver V3 Radio Dial Stack** complete
  - Stacked layout: Row A (month labels + cash stations), Row B (tick rail), Row C (balance LED blocks), Row D (delta bars)
  - Amber NOW needle with glow, positioned at current date
  - Lens window with dimmed edge vignettes for tuning feel
  - Visible-slice scaling: balance and delta lanes scale to visible window only
  - Color mapping: red/amber/cyan based on delta magnitude and floor/target thresholds
  - Readouts above dial: BALANCE, SAFE TO SPEND, RUNWAY with velocity label
  - Velocity label switches per open day vs per week based on lens width
  - LY ghost (violet dashed) always behind balance lane
  - Presets 1-5 adjust lens width only, NOW button snaps to current
  - 16 new unit tests (141 total passing)
- [x] 2026-01-02: **Liquidity Receiver V2 Continuity Mode** complete
  - Always produces continuous balance series from year start to asOfDate
  - Inferred anchor when yearStartCashAmount not set (back-calculates from cashNow)
  - Separate lane scaling: balance, delta, and reference each use own y-scale
  - Merged series: actual overrides estimated where data exists
  - Safe to spend, velocity, and ETA label helpers
  - Debug overlay shows merged/actual counts and anchor method
  - 20 new unit tests (125 total passing)
- [x] 2026-01-02: **Liquidity Card** complete
  - Manual cash snapshot (amount + as-of date) in Settings
  - New Liquidity card below top cluster, above Pit Board
  - 7-day mini bar strip showing daily net cash flow (positive/negative/missing)
  - Runway vs Nut % line with "est" label when confidence != HIGH
  - Empty state with CTA when no snapshot set
  - Top cluster right-side "Cash Logged" unchanged
  - changeSinceSnapshot calc: net sales - logged expenses after snapshot date
  - 9 unit tests (changeSinceSnapshot, cashOnHand, cashFillPct)
  - 77 total tests passing
- [x] 2026-01-02: **Export Backup** complete
  - JSON export: single file with meta, settings, dayEntries, expenseTransactions, referenceMonths
  - CSV export: ZIP with 4 CSVs (server-side archiver)
  - Null stays null, rates stay 0-1, dates stay ISO YYYY-MM-DD
  - Collapsible Backup section in Settings with format selector
  - 14 export tests (drift prevention, shape, null handling)
  - 68 total tests passing
- [x] 2026-01-02: **Cash Logged label fix** - renamed from "After Expenses", removed "cash left" wording
- [x] 2026-01-02: **Milestone: No More Wondering** (Dashboard Pit Board + Trust Layer)
  - Pit Board wired: Daily Needed, Remaining, Remaining Open Days
  - asOfDate contract enforced: dashboard never penalizes unentered day
  - Confidence model in UI: HIGH/MEDIUM/LOW badge + score (0-100)
  - COGS/OPEX show "Est" or "not logged" when appropriate
  - Cash Logged labeled with "missing expenses?" when confidence LOW
  - 54 unit tests passing (isOpenDay, dailyNeededFromHere)
- [x] 2026-01-02: Prisma types synced (storeCloseHour, db push)
- [x] Calc module refactor: UTC day-of-week logic unified
- [x] actualCogsPct renamed to actualCogsRate (rate 0-1)
- [x] survivalPercent clamps 0-200 internally
- [x] Spread expense parsing uses manual ISO parsing (no Date('YYYY-MM-DD'))
- [x] dailyNeededFromHere added
- [x] Deprecated calendar-day pacing moved to calc-deprecated.ts
