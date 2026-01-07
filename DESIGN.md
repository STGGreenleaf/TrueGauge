# HB Health Machine - Design System

Visual language locked in. All UI work must follow these specs.

## Philosophy

**Cockpit instrument cluster.** Porsche/Mercedes premium vibes.
Glassy, minimal, calm but sexy. Information-dense without clutter.
Dark theme only. Glows communicate state, not decoration.

## Colors

### Primary Palette
| Name | Hex | Tailwind | Use |
|------|-----|----------|-----|
| **Cyan** | `#22d3ee` | `cyan-400` | Primary accent, success glow, active states |
| **Amber** | `#f59e0b` | `amber-500` | Warning, caution, medium confidence |
| **Red** | `#ef4444` | `red-500` | Danger, behind pace, low confidence |
| **Emerald** | `#10b981` | `emerald-500` | Success confirmation, goal achieved |
| **Violet** | `#8b5cf6` | `violet-500` | Premium accent, ambient glow, special states |

### Neutrals
| Name | Hex | Tailwind | Use |
|------|-----|----------|-----|
| **Black** | `#000000` | `black` | Page background |
| **Zinc 950** | `#09090b` | `zinc-950` | Card backgrounds |
| **Zinc 900** | `#18181b` | `zinc-900` | Elevated surfaces |
| **Zinc 800** | `#27272a` | `zinc-800` | Borders, dividers |
| **Zinc 600** | `#52525b` | `zinc-600` | Secondary text |
| **Zinc 500** | `#71717a` | `zinc-500` | Tertiary text, labels |
| **Zinc 400** | `#a1a1aa` | `zinc-400` | Body text |
| **Zinc 300** | `#d4d4d8` | `zinc-300` | Primary text |

## Gradients

### Gauge Zones (0-200%)
```css
0-50%:   Red zone (danger)
50-75%:  Amber zone (caution)
75-100%: Cyan zone (on track)
100%+:   Cyan with enhanced glow (exceeding)
```

### Mini Bar Meters
```css
Red (#ef4444) → Amber (#f59e0b) → Cyan (#22d3ee)
/* Applied left-to-right as value increases */
```

### Glass Card Background
```css
background: linear-gradient(to bottom, rgba(24,24,27,0.8), rgba(9,9,11,0.8));
/* from-zinc-900/80 to-zinc-950/80 */
```

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, sans-serif;
```

### Hierarchy
| Element | Size | Weight | Style |
|---------|------|--------|-------|
| **Page title** | `text-2xl` | `font-bold` | Normal case |
| **Section label** | `text-[10px]` | `font-medium` | `uppercase tracking-widest` |
| **Card label** | `text-xs` | `font-medium` | `uppercase tracking-widest` |
| **Primary value** | `text-2xl` to `text-4xl` | `font-bold` | Normal, with glow |
| **Secondary value** | `text-xl` | `font-light` | Normal |
| **Body text** | `text-sm` | `font-normal` | Normal |
| **Subtext** | `text-xs` | `font-normal` | `text-zinc-500` |

### Label Convention
- All instrument labels: **UPPERCASE, tracking-widest, zinc-500**
- Example: `MTD SALES`, `PACE DELTA`, `DAILY NEEDED`

## Components

### Glass Card
```jsx
<div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-5 backdrop-blur-sm">
  {/* content */}
</div>
```

### Glow Effect (Primary Values)
```jsx
<span style={{ textShadow: '0 0 20px #22d3ee' }}>
  {value}
</span>
```

### Mini Readout
- Glass card with label (uppercase, tracking-widest, zinc-500)
- Primary value (bold, colored by status)
- Optional subtext (xs, zinc-500)
- Status colors: good=cyan, warning=amber, danger=red, neutral=zinc

### Badges
```jsx
// Confidence badge
<span className="rounded-full px-2 py-0.5 text-[9px] font-medium bg-amber-500/20 text-amber-400">
  Medium confidence
</span>

// Warning badge
<span className="rounded-full px-2 py-0.5 text-[9px] font-medium bg-red-500/20 text-red-400">
  Sales not entered
</span>
```

### Buttons
```jsx
// Primary (cyan)
<button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-400">

// Secondary (zinc)
<button className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50">
```

## Gauge

### Main Gauge (FuturisticGauge)
- Arc sweep: 0-200%
- Hard marker at 100% (survival threshold)
- Zone colors follow gradient (red → amber → cyan)
- Center displays: primary value + label
- Ambient glow behind ticks

### Side Gauges (SideGauge)
- Vertical bar array (10-20 segments)
- Filled bars glow with gradient color
- Variants: left (bars go right), right (bars go left)

## Animations

### Gauge Sweep
```css
transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);
```

### Startup Animation (StartupAnimation.tsx)
- Two cyan headlight bars, tilted 6° inward
- Pure box-shadow glow (no gradient artifacts)
- Timing: 0.6s dim → 1.2s full brightness → text fade at 1.2s → 3s total
- X exit button top-right

### Hover States
```css
transition: all 150ms ease;
/* Subtle brightness increase, no movement */
```

## Spacing

### Page Layout
```jsx
<main className="min-h-screen bg-black p-4 md:p-8">
  <div className="mx-auto max-w-4xl">
```

### Section Spacing
- Between major sections: `mb-10`
- Between cards in grid: `gap-3` or `gap-4`
- Card padding: `p-4` or `p-5`

### Grid Patterns
```jsx
// Mini readouts
<div className="grid grid-cols-2 gap-3 md:grid-cols-5">

// Action buttons
<div className="grid gap-3 md:grid-cols-4">

// Pit board
<div className="grid grid-cols-3 gap-4 text-center">
```

## Status Colors

| Status | Color | Use |
|--------|-------|-----|
| `good` | Cyan | On track, positive, high confidence |
| `warning` | Amber | Behind, caution, medium confidence |
| `danger` | Red | Critical, way behind, low confidence |
| `neutral` | Zinc-400 | No judgment, informational |

## Rules

1. **Dark only.** No light mode.
2. **Glow = meaning.** Cyan glow on primary values, not decoration.
3. **Labels uppercase.** All instrument labels use `uppercase tracking-widest`.
4. **Status through color.** Use status colors consistently.
5. **Glass cards everywhere.** All content containers use glass card pattern.
6. **No clutter.** Information-dense ≠ busy. White space is intentional.
7. **Mobile-first.** All layouts must work on mobile with graceful scaling.

## File Reference
- `src/lib/design.ts` - Color constants (if created)
- `src/components/FuturisticGauge.tsx` - Main gauge component
- `src/components/StartupAnimation.tsx` - Headlight animation
- `src/app/page.tsx` - Dashboard layout patterns
