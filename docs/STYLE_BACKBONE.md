# TrueGauge Style Backbone

Design system mechanics for recreating the premium cockpit UI feel.

---

## Design Philosophy

**Cockpit instrument cluster.** Premium automotive vibes (Porsche, Mercedes).
- Glassy, minimal, calm but information-dense
- Dark theme only
- Glows communicate state, not decoration
- Information-dense without clutter

---

## Color System

### Status Semantics

| Status | Color | Hex | Tailwind | Use Case |
|--------|-------|-----|----------|----------|
| **Good** | Cyan | `#22d3ee` | `cyan-400` | On track, positive, high confidence |
| **Warning** | Amber | `#f59e0b` | `amber-500` | Behind pace, caution, medium confidence |
| **Danger** | Red | `#ef4444` | `red-500` | Critical, way behind, low confidence |
| **Success** | Emerald | `#10b981` | `emerald-500` | Goal achieved, confirmation |
| **Premium** | Violet | `#8b5cf6` | `violet-500` | Ambient glow, estimates, special states |
| **Neutral** | Zinc-400 | `#a1a1aa` | `zinc-400` | Informational, no judgment |

### Neutral Scale (Dark Theme)

| Name | Hex | Tailwind | Use |
|------|-----|----------|-----|
| Black | `#000000` | `black` | Page background |
| Zinc-950 | `#09090b` | `zinc-950` | Card backgrounds |
| Zinc-900 | `#18181b` | `zinc-900` | Elevated surfaces |
| Zinc-800 | `#27272a` | `zinc-800` | Borders, dividers |
| Zinc-700 | `#3f3f46` | `zinc-700` | Hover states |
| Zinc-600 | `#52525b` | `zinc-600` | Secondary text |
| Zinc-500 | `#71717a` | `zinc-500` | Tertiary text, labels |
| Zinc-400 | `#a1a1aa` | `zinc-400` | Body text |
| Zinc-300 | `#d4d4d8` | `zinc-300` | Primary text |

### Glow Effects

```typescript
// Text glow (primary values)
textShadow: '0 0 20px #22d3ee'  // Cyan glow

// Box glow (active elements)
boxShadow: '0 0 8px rgba(34, 211, 238, 0.4)'

// Intensity by status
const glowIntensity = {
  high: 0.6,    // Important, active
  medium: 0.4,  // Standard
  low: 0.2,     // Subtle, ambient
};
```

---

## Typography Hierarchy

### Font Stack
```css
font-family: system-ui, -apple-system, sans-serif;
```

### Scale

| Element | Size | Weight | Tracking | Style |
|---------|------|--------|----------|-------|
| Page title | `text-2xl` | `font-bold` | Normal | Normal case |
| Section label | `text-[10px]` | `font-medium` | `tracking-[0.2em]` | UPPERCASE |
| Card label | `text-xs` | `font-medium` | `tracking-widest` | UPPERCASE |
| Primary value | `text-2xl` to `text-4xl` | `font-bold` | Normal | With glow |
| Secondary value | `text-xl` | `font-light` | Normal | Normal |
| Body text | `text-sm` | `font-normal` | Normal | Normal |
| Subtext | `text-xs` | `font-normal` | Normal | `text-zinc-500` |
| Micro label | `text-[9px]` | `font-medium` | `tracking-wide` | UPPERCASE |

### Label Convention (Non-Negotiable)
All instrument labels use:
```jsx
<span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
  MTD SALES
</span>
```

---

## Layout Rhythm

### Page Structure
```jsx
<main className="min-h-screen bg-black">
  <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
    {/* Content */}
  </div>
</main>
```

### Section Spacing

| Context | Spacing |
|---------|---------|
| Between major sections | `mb-10` |
| Between card rows | `mb-6` or `space-y-6` |
| Between cards in grid | `gap-3` or `gap-4` |
| Card internal padding | `p-4` or `p-5` |
| Label to value | `mt-1` or `mt-2` |

### Grid Patterns

```jsx
// Top metrics row (4 cards)
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

// Mini readouts (5 columns on desktop)
<div className="grid grid-cols-2 gap-3 md:grid-cols-5">

// Action buttons
<div className="grid gap-3 md:grid-cols-4">

// Pit board (3 columns)
<div className="grid grid-cols-3 gap-4 text-center">
```

### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| Mobile (<768px) | 2-column grids, stacked layouts |
| Tablet (768px+) | 3-4 column grids |
| Desktop (1024px+) | Full layouts, side-by-side panels |

---

## Component Primitives

### Glass Card
The foundational container for all content.

```jsx
<div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-5 backdrop-blur-sm">
  {/* Content */}
</div>
```

Variants:
```jsx
// With shine effect
<div className="relative ...">
  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  {/* Content */}
</div>

// Compact
<div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">

// Status-colored border
<div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
```

### Mini Readout
Single metric display.

```jsx
<div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
  <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
    MTD SALES
  </div>
  <div 
    className="text-2xl font-bold text-cyan-400 mt-1"
    style={{ textShadow: '0 0 20px #22d3ee' }}
  >
    $24,500
  </div>
  <div className="text-xs text-zinc-500 mt-1">
    +12% vs target
  </div>
</div>
```

### Badge
Status indicators.

```jsx
// Confidence badge
<span className="rounded-full px-2 py-0.5 text-[9px] font-medium bg-amber-500/20 text-amber-400">
  Medium confidence
</span>

// Warning badge
<span className="rounded-full px-2 py-0.5 text-[9px] font-medium bg-red-500/20 text-red-400">
  Sales not entered
</span>

// Estimate badge
<span className="text-[9px] font-medium text-violet-400/80">
  est
</span>
```

### Button Styles

```jsx
// Primary (cyan)
<button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-400 transition-colors">
  Save
</button>

// Secondary (zinc outline)
<button className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors">
  Cancel
</button>

// Ghost (minimal)
<button className="px-3 py-1.5 text-sm text-zinc-400 hover:text-cyan-400 transition-colors">
  View details
</button>

// Icon button
<button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
  <IconComponent className="w-4 h-4" />
</button>
```

---

## Gauge Zones

### Main Gauge (0-200%)

| Range | Color | Meaning |
|-------|-------|---------|
| 0-50% | Red | Danger zone |
| 50-75% | Amber | Caution zone |
| 75-100% | Cyan | On track |
| 100%+ | Cyan (enhanced glow) | Exceeding goal |

### Arc Gradient
```css
0%:   #ef4444 (red)
50%:  #f59e0b (amber)  
75%:  #22d3ee (cyan)
100%: #22d3ee (cyan with glow)
```

### Side Gauges
Vertical bar arrays (10-20 segments):
- Filled bars glow with gradient color
- Empty bars show `zinc-800`
- Left variant: bars extend right
- Right variant: bars extend left

---

## Animation Timing

### Gauge Sweep (On Load)
```css
transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover States
```css
transition: all 150ms ease;
/* Subtle brightness increase, no movement */
```

### Startup Animation
- Two cyan headlight bars, tilted 6° inward
- Pure `box-shadow` glow (no gradient artifacts)
- Timing: 0.6s dim → 1.2s full brightness → text fade at 1.2s → 3s total

### Page Transitions
```css
/* Fade in content */
opacity: 0 → 1 over 300ms ease-out

/* No jarring movements */
```

---

## Visual Density Rules

### Information Hierarchy
1. **Primary metric**: Large, bold, glowing (e.g., survival %)
2. **Supporting metrics**: Medium size, colored by status
3. **Labels**: Small, uppercase, muted (zinc-500)
4. **Context**: Extra small, zinc-600

### Whitespace Principles
- Dense but not crowded
- Consistent gutters (gap-3, gap-4)
- Breathing room around primary values
- No decorative elements that don't convey meaning

### When to Use Color
| Use Color | Don't Use Color |
|-----------|-----------------|
| Status indication | Decoration |
| Interactive elements | Static labels |
| Primary values | Secondary text |
| Alerts and badges | Borders (use zinc) |

---

## File Reference

| File | Contains |
|------|----------|
| `src/lib/design.ts` | Color constants, style objects, helper functions |
| `src/components/FuturisticGauge.tsx` | Main gauge, side gauges, mini readouts |
| `src/components/StartupAnimation.tsx` | Headlight animation |
| `src/components/LiquidityCard.tsx` | Complex card with sub-components |
| `src/components/MiniInstrument.tsx` | Corner instrument pattern |
| `src/components/ui/button.tsx` | Shadcn button primitive |

---

## Tailwind Classes Cheat Sheet

### Common Patterns

```jsx
// Glass card
"rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-5 backdrop-blur-sm"

// Label
"text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500"

// Primary value with glow
"text-2xl font-bold text-cyan-400" + style={{ textShadow: '0 0 20px #22d3ee' }}

// Status badge
"rounded-full px-2 py-0.5 text-[9px] font-medium bg-{color}-500/20 text-{color}-400"

// Icon container
"flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/50"

// Expandable section
"rounded-lg border border-{color}-500/30 bg-{color}-500/5 p-4"
```

### Status Color Classes

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Good | `bg-cyan-500/10` | `text-cyan-400` | `border-cyan-500/30` |
| Warning | `bg-amber-500/10` | `text-amber-400` | `border-amber-500/30` |
| Danger | `bg-red-500/10` | `text-red-400` | `border-red-500/30` |
| Neutral | `bg-zinc-800/50` | `text-zinc-400` | `border-zinc-700` |

---

## Anti-Patterns (Avoid)

| Don't | Do Instead |
|-------|------------|
| Light backgrounds | Dark only (black, zinc-900, zinc-950) |
| Decorative gradients | Gradients only for status indication |
| Bright borders | Subtle borders (zinc-800, color/30) |
| Random glows | Glow only on primary values and active states |
| Sentence case labels | UPPERCASE with tracking-widest |
| Heavy drop shadows | Subtle backdrop-blur, no shadows |
| Rounded-full cards | rounded-lg or rounded-xl |
| Colorful icons | Zinc icons, color only for status |

---

*See `BLUEPRINT.md` for architecture • `ENGINE_ROOM.md` for technical internals*
