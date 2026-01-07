# TrueGauge

A cockpit-style dashboard for tracking business health. Premium Porsche/Mercedes-inspired UI with an old-school speedometer gauge. Now multi-tenant with Google sign-in.

## 🏎️ Features

- **Cockpit Dashboard** - Premium speedometer gauge showing survival progress (0-200%)
- **Cash Health & True Health** - Two lenses visible at a glance
- **Daily Diary** - Quick entry for Net Sales and expenses
- **Spread Purchases** - Amortize lumpy COGS/CAPEX across months for True Health
- **Cloud-First** - Data stored securely in Supabase with Google sign-in
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
  schema.prisma       # Database models
  dev.db              # SQLite database file
  
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

## 💾 Backup Your Data

### Option 1: Copy SQLite file
```bash
cp prisma/dev.db ~/Dropbox/TrueGauge_Backups/
```

### Option 2: Export CSV
Visit `/api/export` to download a CSV backup of all data.

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

## ⚠️ Local-First Notice

This app stores all data locally in `prisma/dev.db`. 

**Your data stays on your device.** Back it up regularly to Dropbox/iCloud.

---

Built by TrueGauge • January 2026 • truegauge.app
