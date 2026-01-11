# TrueGauge

A cockpit-style dashboard for tracking business health. Premium Porsche/Mercedes-inspired UI with an old-school speedometer gauge. Multi-tenant SaaS with Google/GitHub sign-in.

## 🏎️ Features

- **Cockpit Dashboard** - Premium speedometer gauge showing survival progress (0-200%)
- **Cash Health & True Health** - Two lenses visible at a glance
- **Daily Diary** - Quick entry for Net Sales and expenses
- **Spread Purchases** - Amortize lumpy COGS/CAPEX across months for True Health
- **Cloud-First** - Data stored securely in Supabase (PostgreSQL) with OAuth
- **Math Tested** - 54 unit tests for all core calculations

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Default Settings

| Setting | Default Value |
|---------|---------------|
| Monthly Fixed Nut | $15,500 |
| Target COGS % | 35% |
| Target Fees % | 3% |
| **Survival Goal** | **$25,000** |

Formula: `Survival Goal = Monthly Fixed Nut / (1 - COGS% - Fees%)`

## 🧮 Key Calculations

All calculations are in `src/lib/calc.ts` with tests in `src/lib/calc.test.ts`.

```typescript
// Survival Goal = 15500 / (1 - 0.35 - 0.03) = 25000
survivalGoalNetExTax(15500, 0.35, 0.03) // => 25000

// Survival Percent = (MTD Sales / Goal) * 100
survivalPercent(12500, 25000) // => 50

// Spread expense over 10 months
spreadExpenseMonthlyPortion(2500, 10) // => 250
```

## 📁 Project Structure

```
/prisma
  schema.prisma       # Database models (PostgreSQL on Supabase)
  
/src
  /app
    page.tsx          # Dashboard (main cockpit view)
    /settings         # Business settings
    /diary            # Daily entry module
    /api              # API routes
  /components
    Gauge.tsx         # Custom SVG speedometer
    HealthCard.tsx    # Cash/True Health cards
  /lib
    calc.ts           # Pure calculation functions
    calc.test.ts      # Unit tests (51 tests)
    db.ts             # Prisma client
    types.ts          # TypeScript types & Zod schemas
```

## 🧪 Running Tests

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm test
```

## 💾 Your Data

Data is stored securely in Supabase (PostgreSQL). To export your data, visit Settings → Export CSV.

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run db:studio` | Open Prisma Studio |

## 📅 Roadmap

- [x] **Phase 0**: Foundation — Dashboard, Diary, Settings, Expense tracking
- [x] **Phase 1**: Trust Layer — Pit Board, Confidence model, asOfDate contract
- [ ] **Phase 2**: Polish & Export — Backup, Vendor templates, UX improvements
- [ ] **Phase 3**: Calendar & Insights — Month views, Annual summary

See `ROADMAP.md` for full details and AI collaboration rules.

## 📚 Documentation

| File | Purpose |
|------|---------|
| `README.md` | Quick start (this file) |
| `ROADMAP.md` | Phases, AI guardrails, status |
| `Project.md` | Spec, definitions, changelog |
| `CONTRACTS.md` | Non-negotiables (math, dates) |
| `CHECKLIST.md` | Current work queue |
| `DESIGN.md` | Visual system (colors, components) |

## ☁️ Cloud Architecture

This app uses Supabase for authentication and data storage:
- **Auth**: Google/GitHub OAuth via Supabase Auth
- **Database**: PostgreSQL on Supabase
- **Multi-tenant**: Each user gets their own organization

---

## 📦 Archive (Deprecated Jan 2026)

<details>
<summary>Legacy local-first architecture</summary>

Previously, TrueGauge used SQLite (`prisma/dev.db`) for local-only storage. This was replaced with Supabase PostgreSQL for cloud sync and multi-tenant support.

</details>

---

Built by TrueGauge • January 2026 • truegauge.app
