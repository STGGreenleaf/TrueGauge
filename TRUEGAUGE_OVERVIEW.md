# TrueGauge

**URL:** https://www.truegauge.app  
**Tagline:** Your cockpit view for business health.

---

## What It Is

TrueGauge is a lightweight business health dashboard designed for small business owners and operators. It provides a real-time "instrument panel" view of key financial metrics — survival rate, pace tracking, cash position — without the complexity of spreadsheets or full accounting software.

The design philosophy is inspired by car dashboard indicators: minimal, functional, and instantly readable at a glance.

---

## Core Concept: The NUT

The central metric is the **NUT** (monthly overhead) — the minimum revenue needed to cover fixed expenses. TrueGauge calculates:

- **Survival %** — How much of your NUT you've covered this month
- **Pace Delta** — Whether you're ahead or behind based on actual open days (not calendar math)
- **Velocity** — Your current daily revenue rate
- **Runway** — How long your cash reserves will last

---

## Key Features

### 1. Daily Sales Logging
Enter today's sales in 10 seconds. The dashboard updates instantly.

### 2. Pace Tracking
Unlike simple calendar-based projections, TrueGauge weighs actual business days. A Tuesday isn't the same as a Saturday.

### 3. Tap-to-Explain
Every metric is clickable. Tap any number to see exactly how it's calculated — revenue breakdown, margin math, runway projections.

### 4. Year-over-Year Comparison
Compare current month performance against last year's actuals.

### 5. No Bank Linking
Users enter their own numbers. No Plaid, no bank credentials, no data harvesting. Simple, secure, and in the user's control.

### 6. Demo Mode
Explore with sample data before entering real numbers.

---

## Target Users

- Small business owners (retail, restaurants, service businesses)
- Operators who check their bank balance at 2am
- Anyone who wants daily financial clarity without spreadsheet complexity

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with Google OAuth
- **Styling:** Tailwind CSS
- **Hosting:** Vercel
- **Icons:** Lucide React

---

## Design Philosophy

- **Instrument cluster aesthetic** — Like car dashboard gauges and indicators
- **Dark mode only** — Black background with cyan/violet accents
- **Icons over text** — Minimal UI, maximum signal
- **Truth over vibes** — Estimates are labeled as estimates; missing data shows as missing

---

## Privacy

- Free to use
- No subscription
- No bank linking
- No data selling
- User data stored in isolated Supabase spaces
- Essential cookies only (auth/session)

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with product overview |
| `/login` | Google OAuth login |
| `/dashboard` | Main instrument panel |
| `/manual` | Operator's manual / help guide |
| `/settings` | NUT configuration, team invites |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

---

## Contact

hello@colsha.co
