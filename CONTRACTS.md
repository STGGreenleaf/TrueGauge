# HB Health Machine - Contracts

These are non-negotiables. If one changes, update tests and Project.md.

## Units and rounding
- Money is stored and computed in dollars as number.
- Rates are always 0-1 (example: 0.35). UI may display percent as rate*100.
- survivalPercent is clamped to 0-200 for gauge stability.

## Dates and time
- All date keys are ISO strings YYYY-MM-DD.
- Day-of-week for ISO dates is computed in UTC only.
- Never use new Date('YYYY-MM-DD') for business logic.
- Timezone setting is display only; date math is UTC-safe.

## Sales basis
- Default daily input is Net Sales (ex tax).
- Taxes are not revenue and must be separate (manual savings bucket is fine).
- Fees can be logged or estimated, but must be labeled when estimated.

## asOfDate
- asOfDate = latest date with a non-null Net Sales entry.
- Pacing, remaining, dailyNeededFromHere, and gauge values are computed to asOfDate.
- If today > asOfDate and store is open, show "Sales not entered" indicator.
- Never mark the business "behind" because the current day is unentered.

## Pacing
- Targets are hours-weighted using store hours template.
- Closed days contribute 0 target and 0 hours.

## Cash Logged vs True Health
- Cash Logged uses only logged expenses. Missing expense data lowers confidence.
- True Health normalizes spread expenses (straight-line monthly slices starting purchase month).
- Any normalization not backed by actual daily entries is labeled estimate.

## Missing data must not look like success
- If COGS/OPEX not logged, show "not logged" or "estimated" instead of 0.
- Confidence score influences UI intensity (dim, warning, indicator).

## Owner gating (Jan 2026)
- Owner is identified by `OWNER_USER_ID` env var (Supabase auth UUID).
- `/api/auth/me` returns `isOwner: true/false` computed server-side.
- Client never sees owner email; only uses `isOwner` boolean for UI gating.
- Owner-only features: OwnerMenu, /owner/brand, /owner-portal, analytics endpoints.

## Multi-tenant model
- Each user gets their own organization on first login.
- Data isolation enforced at application layer via `organizationId` filtering.
- `showcase-template` is a special org used for demo mode (Brightline Supply Co.).

## Showcase mode (read-only)
- Demo mode (`?showcase=true` or `demoModeEnabled`) shows Brightline data.
- All write endpoints call `assertNotShowcase(orgId)` to prevent mutations.
- Normal users can view showcase data but cannot modify it.

---

**Related docs:** `ROADMAP.md` (phases, AI rules) • `DESIGN.md` (visual system) • `CHECKLIST.md` (work queue)
