# TrueGauge - Roadmap

Source of truth for phases, principles, and AI collaboration rules.

---

## AI Context Requirements

**Before ANY work, read these files in order:**

1. `CONTRACTS.md` — Non-negotiables (math, dates, units)
2. `DESIGN.md` — Visual language (colors, components, spacing)
3. `Project.md` — Spec and definitions (how things work)
4. `CHECKLIST.md` — Current work queue (what to do now)
5. `ROADMAP.md` — This file (phases, guardrails)

**Loop rule:** If uncertain, re-read the relevant doc before proceeding.

---

## Guardrails (Never Break These)

### Code
- [ ] Never delete tests. Add tests, fix tests, never remove.
- [ ] Never change `calc.ts` math without updating tests first.
- [ ] All date logic uses UTC. Never `new Date('YYYY-MM-DD')`.
- [ ] Rates are 0-1, not percentages. UI converts for display.
- [ ] `asOfDate` is the truth. Never penalize unentered days.

### UI
- [ ] Follow `DESIGN.md` exactly. No improvised colors or spacing.
- [ ] Labels must match definitions in `CONTRACTS.md`.
- [ ] Missing data shows "not logged" or "estimated", never 0.
- [ ] Dark theme only. No light mode.
- [ ] Mobile-first. All layouts must work on small screens.

### Data
- [ ] Cloud-first with Supabase (PostgreSQL) and Google OAuth.
- [ ] Multi-tenant: each user gets isolated data via organizationId.
- [ ] Schema changes require Prisma migration.

### Documentation
- [ ] Update `CHECKLIST.md` when completing work (move to Done with date).
- [ ] Update `Project.md` changelog for milestones.
- [ ] Never delete completed items. Archive with dates.

---

## Phases

### Phase 0: Foundation ✅ COMPLETE
Core dashboard with basic survival tracking.

**Delivered:**
- Prisma + PostgreSQL data model (Supabase)
- Settings page (nut breakdown, targets, store hours)
- Dashboard with survival gauge (0-200%)
- Diary page for daily sales entry
- Expense tracking (COGS, OPEX, CAPEX)
- Spread purchases (True Health normalization)
- 51 unit tests for calc.ts

### Phase 1: Trust Layer ✅ COMPLETE
Make dashboard immediately actionable and emotionally honest.

**Delivered:**
- Pit Board: Daily Needed, Remaining, Remaining Open Days
- `dailyNeededFromHere()` function with hours-weighted logic
- `asOfDate` contract enforced everywhere
- "Sales not entered" indicator when today > asOfDate
- Confidence model: HIGH/MEDIUM/LOW with score (0-100)
- COGS/OPEX show "Est" or "not logged" when appropriate
- Cash Logged labeled with confidence warning
- Last Year Reference with pace estimate
- Mobile layout with 4-corner instruments
- Startup animation (headlight flicker)
- 54 unit tests passing

**Milestone date:** 2026-01-02

### Milestone 2: Burn Analysis & Runway Clarity ✅ COMPLETE
Make cash runway immediately visible and actionable.

**Delivered:**
- Burn Analysis panel in Liquidity Card header (Monthly, Annual, Floor|Zero, Gap to BE)
- Speech bubble tooltips with detailed explanations for each metric
- Emergency Floor setting (operatingFloorCash) in Settings
- Floor|Zero date calculation using LY burn rate when velocity positive
- FLOOR label on right-side scale in Liquidity Receiver
- Calendar-aligned tick marks (daily/weekly)
- Smooth panning with full year data visibility
- estBalance (violet dashed line) formula documented and validated

**Milestone date:** 2026-01-04

### Phase 2: Polish & Export 🔄 IN PROGRESS
Quality of life improvements and data safety.

**Scope:**
- [x] Export backup (JSON/CSV one-click download) ✓
- [x] Cash on Hand snapshot (liquidity instrument) ✓
- [x] Burn Analysis panel ✓
- [x] Emergency Floor setting ✓
- [ ] Vendor templates (recurring expenses)
- [ ] Cockpit indicators polish (engine lights for warnings)
- [ ] Last-year entry UX improvements
- [ ] Import helpers (optional)

**Not in scope:**
- No new pages unless absolutely required
- No external integrations

**Completed (Jan 2026):**
- ✅ Google/GitHub OAuth via Supabase Auth
- ✅ Multi-tenant architecture (per-user organizations)

### Milestone 3: Scenario Planning 📋 PLANNED
What-if analysis and forecasting tools.

**Scope:**
- [ ] "What if" burn rate scenarios (adjust velocity to see floor date change)
- [ ] Target line on Liquidity Receiver (show path to target reserve)
- [ ] Monthly NUT breakdown visualization in burn analysis
- [ ] Seasonal pattern overlay (LY months on future projection)
- [ ] Break-even countdown (days until next survival goal reset)

**Not started**

### Phase 3: Calendar & Insights 📋 PLANNED
Month-level views and historical analysis.

**Scope:**
- [ ] Calendar month view with daily breakdown
- [ ] Month-over-month comparison
- [ ] Annual summary view
- [ ] True Health toggle (cash vs normalized detail)

### Phase 4: Future 🔮 BACKLOG
Ideas parked for later consideration.

- Multi-store support
- Bank/POS integrations (maybe never)
- Shared team access (maybe never)
- Mobile native app

---

## Current Status

**Phase:** 2 (Polish & Export)
**Tests:** 141+ passing
**Last milestone:** Burn Analysis Panel (2026-01-04)

**Next priority:** Milestone 2 planning, then Expense vendor templates

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-04 | Floor|Zero always shows date | User wants to see "looming date" even when gaining cash - uses LY burn rate |
| 2026-01-04 | Burn Analysis panel | Quick-glance runway metrics in Liquidity Card header |
| 2026-01-04 | operatingFloorCash setting | Emergency fund threshold - burn analysis calculates days to floor |
| 2026-01-02 | UTC-only date math | Avoids DST bugs, consistent across timezones |
| 2026-01-02 | Rates as 0-1 | Prevents confusion between 35 and 0.35 |
| 2026-01-02 | asOfDate contract | Midnight shouldn't cause panic |
| 2026-01-02 | Confidence model | Missing data must never look like success |

---

## Doc Index

| File | Purpose | When to read |
|------|---------|--------------|
| `README.md` | Quick start, external face | First visit, setup |
| `ROADMAP.md` | Phases, AI rules, status | Before any work session |
| `Project.md` | Spec, definitions, changelog | When building features |
| `CONTRACTS.md` | Non-negotiables | Before touching math or labels |
| `CHECKLIST.md` | Work queue | To find next task |
| `DESIGN.md` | Visual system | Before any UI work |

---

## For AI Assistants

You are building a **cockpit dashboard for a small business owner**.

**Your job:**
- Reduce anxiety without lying
- Make the math trustworthy
- Keep the UI premium and calm
- Never break what's working

**Before you start:**
1. Read all 6 root docs
2. Check `CHECKLIST.md` for current priority
3. Run `npm test -- --run` to verify baseline
4. Make changes incrementally
5. Update docs when done

**If you're unsure:**
- Re-read `CONTRACTS.md`
- Ask the user
- Don't guess

**Codeword:** When ready to proceed after documentation review, say "Pancakes".
