/**
 * TrueGauge - Design System
 * 
 * Locked-in design tokens and styles for consistent site-wide appearance.
 * All new components should use these values.
 */

// Color Palette
export const colors = {
  // Primary accent - cyan
  cyan: '#22d3ee',
  cyanLight: '#bae6fd',
  cyanGlow: 'rgba(34, 211, 238, 0.4)',
  
  // Warning - amber/mustard
  amber: '#f59e0b',
  amberGlow: 'rgba(245, 158, 11, 0.4)',
  
  // Danger - red
  red: '#ef4444',
  redGlow: 'rgba(239, 68, 68, 0.4)',
  
  // Success - emerald
  emerald: '#10b981',
  emeraldGlow: 'rgba(16, 185, 129, 0.4)',
  
  // Premium accent - violet
  violet: '#8b5cf6',
  violetGlow: 'rgba(139, 92, 246, 0.4)',
  
  // Neutrals
  zinc900: '#18181b',
  zinc800: '#27272a',
  zinc700: '#3f3f46',
  zinc600: '#52525b',
  zinc500: '#71717a',
  zinc400: '#a1a1aa',
} as const;

// Status colors mapping
export const statusColors = {
  good: colors.cyan,
  warning: colors.amber,
  danger: colors.red,
  neutral: colors.zinc400,
  positive: colors.cyan,
  negative: colors.red,
} as const;

// Gradient definitions
export const gradients = {
  // Month progress: icy blue → cyan → emerald
  monthProgress: {
    start: colors.cyanLight,
    middle: colors.cyan,
    end: colors.emerald,
  },
  
  // Health meters: red → amber → cyan
  healthMeter: {
    start: colors.red,
    middle: colors.amber,
    end: colors.cyan,
  },
  
  // Main gauge zones
  gauge: {
    danger: colors.red,      // 0-50%
    warning: colors.amber,   // 50-75%
    good: colors.cyan,       // 75%+
  },
} as const;

// Glass card styles (Tailwind classes)
export const glassCard = {
  base: 'relative overflow-hidden rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 backdrop-blur-md',
  shine: 'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent',
  overlay: 'pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent',
} as const;

// Ambient background configuration
export const ambientBackground = {
  primary: 'bg-cyan-500/5',
  accent1: 'bg-violet-500/8',
  accent2: 'bg-violet-600/10',
  accent3: 'bg-violet-500/5',
} as const;

// Button styles
export const buttonStyles = {
  primary: 'flex items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 font-light tracking-wide text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20',
  secondary: 'flex items-center justify-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/30 font-light tracking-wide text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-300',
} as const;

// Typography
export const typography = {
  label: 'text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500',
  labelWide: 'text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500',
  value: 'text-lg font-bold',
  heading: 'text-xs font-bold uppercase tracking-[0.25em] text-zinc-400',
} as const;

// Page layout
export const pageLayout = {
  wrapper: 'min-h-screen bg-black',
  container: 'relative z-10 mx-auto max-w-6xl px-6 py-8',
  header: 'mb-8 flex items-center justify-between',
  backButton: 'flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500 transition-colors hover:text-cyan-400',
} as const;

// Animation settings
export const animations = {
  gaugeSweepDuration: 1500, // ms
  easing: 'cubic-bezier(0.33, 1, 0.68, 1)', // ease-out cubic
} as const;

/**
 * Get text shadow for glowing text effect
 */
export function getTextShadow(color: string, intensity: number = 0.4): string {
  return `0 0 ${Math.round(intensity * 30)}px ${color}`;
}

/**
 * Get box shadow for glowing elements
 */
export function getGlowShadow(color: string, size: number = 8): string {
  return `0 0 ${size}px ${color}`;
}
