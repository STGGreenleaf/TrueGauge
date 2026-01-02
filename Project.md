# HB Health Machine

Local-first cockpit dashboard that helps HB Beverage Co. see business health at a glance and log daily numbers with minimal friction.

## Purpose
This is a steering wheel, not accounting software.
It should reduce anxiety without lying.

## MVP constraints
- Local-first only (SQLite). No Supabase, no auth, no bank linking, no POS integrations.
- Timezone: America/Denver.
- Daily habit: one number by default - Net Sales (ex tax) from POS.
- Optional details exist but stay collapsed by default.
- Dashboard is overview only. Data entry happens in Diary and tool pages.
- Math lives in pure functions and has tests.
- Any estimate must be labeled as estimate.

## Visual direction
Premium cockpit instrument cluster. Porsche and Mercedes vibes.
Glassy speedometer, minimal modern layout, calm but sexy.

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

## Next priorities
1) Add Daily Needed from Here
- remainingToGoal / remainingOpenDays from asOfDate forward
This is the pit-board line.

2) Confidence model for missing expenses
- High, Medium, Low based on sales completeness and expense logging recency
Use it to dim Cash Logged and annotate COGS and OPEX.

3) Backup export
- One-click export CSV or JSON for DayEntry, ExpenseTransaction, ReferenceMonth, Settings
Optional restore later.

4) Tests for math contract
- survivalGoal math
- hours-weighted target-to-date
- paceDelta with asOfDate
- spread logic for True Health
- last-year pace estimate labeled
