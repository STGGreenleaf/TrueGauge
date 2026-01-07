'use client';

import { useEffect, useState } from 'react';

interface FuturisticGaugeProps {
  value: number; // 0-200
  label?: string;
  subLabel?: string;
  size?: number;
  // NUT countdown arc (optional)
  nutRemaining?: number; // dollars remaining to cover
  nutTotal?: number; // total NUT amount
}

export function FuturisticGauge({ 
  value, 
  label = 'SURVIVAL', 
  subLabel,
  size = 320,
  nutRemaining,
  nutTotal,
}: FuturisticGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    // Reset to 0 first, then animate up
    setAnimatedValue(0);
    
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();
    const startValue = 0;
    const endValue = value;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: ease-out cubic for that "flooring it" feel
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * eased;
      setAnimatedValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    // Small delay before starting animation
    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [value]);

  const clampedValue = Math.min(200, Math.max(0, animatedValue));
  const percentage = clampedValue / 200;
  
  // Arc configuration - 270 degree sweep
  const startAngle = 135;
  const endAngle = 405;
  const sweepAngle = endAngle - startAngle;
  const currentAngle = startAngle + (sweepAngle * percentage);
  
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const innerRadius = size * 0.32;
  
  // Generate tick marks (segments)
  const totalTicks = 40;
  const ticks = [];
  
  for (let i = 0; i <= totalTicks; i++) {
    const tickAngle = startAngle + (sweepAngle * i / totalTicks);
    const tickRad = (tickAngle * Math.PI) / 180;
    const isActive = tickAngle <= currentAngle;
    const isMajor = i % 10 === 0;
    
    const outerR = radius + (isMajor ? 12 : 6);
    const innerR = radius - 2;
    
    const x1 = cx + innerR * Math.cos(tickRad);
    const y1 = cy + innerR * Math.sin(tickRad);
    const x2 = cx + outerR * Math.cos(tickRad);
    const y2 = cy + outerR * Math.sin(tickRad);
    
    // Color based on position and active state
    let color = '#1e293b'; // inactive
    if (isActive) {
      const tickPercent = i / totalTicks;
      if (tickPercent <= 0.5) {
        color = '#ef4444'; // red zone (0-50%)
      } else if (tickPercent <= 0.75) {
        color = '#f59e0b'; // yellow zone (50-75%)
      } else {
        color = '#22d3ee'; // cyan zone (75%+)
      }
    }
    
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={isMajor ? 3 : 2}
        strokeLinecap="round"
        style={{
          filter: isActive ? `drop-shadow(0 0 ${isMajor ? 8 : 4}px ${color})` : 'none',
          transition: 'all 0.3s ease-out',
        }}
      />
    );
  }
  
  // Outer decorative ring
  const outerRingRadius = radius + 20;
  const outerArcStart = (startAngle * Math.PI) / 180;
  const outerArcEnd = (endAngle * Math.PI) / 180;
  
  const outerArcPath = `
    M ${cx + outerRingRadius * Math.cos(outerArcStart)} ${cy + outerRingRadius * Math.sin(outerArcStart)}
    A ${outerRingRadius} ${outerRingRadius} 0 1 1 ${cx + outerRingRadius * Math.cos(outerArcEnd)} ${cy + outerRingRadius * Math.sin(outerArcEnd)}
  `;
  
  // Inner glow ring
  const glowRadius = innerRadius - 10;
  const glowArcPath = `
    M ${cx + glowRadius * Math.cos(outerArcStart)} ${cy + glowRadius * Math.sin(outerArcStart)}
    A ${glowRadius} ${glowRadius} 0 1 1 ${cx + glowRadius * Math.cos(outerArcEnd)} ${cy + glowRadius * Math.sin(outerArcEnd)}
  `;
  
  // Determine main color based on value
  const mainColor = clampedValue >= 100 ? '#22d3ee' : clampedValue >= 50 ? '#f59e0b' : '#ef4444';
  
  // Crop bottom empty space - fixed 30px crop from bottom
  const croppedHeight = size - 30;
  
  return (
    <div className="relative" style={{ width: size, height: croppedHeight }}>
      {/* Background glow */}
      <div 
        className="absolute inset-0 rounded-full opacity-20 blur-3xl"
        style={{ 
          background: `radial-gradient(circle, ${mainColor} 0%, transparent 70%)`,
        }}
      />
      
      <svg width={size} height={croppedHeight} viewBox={`0 0 ${size} ${croppedHeight}`} className="relative z-10">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
            </feMerge>
          </filter>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          {/* Underlayment glow gradient - brightest at end */}
          <linearGradient id="underlayGradient" gradientUnits="userSpaceOnUse"
            x1={cx + radius * Math.cos((startAngle * Math.PI) / 180)}
            y1={cy + radius * Math.sin((startAngle * Math.PI) / 180)}
            x2={cx + radius * Math.cos((currentAngle * Math.PI) / 180)}
            y2={cy + radius * Math.sin((currentAngle * Math.PI) / 180)}>
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        {/* Subtle underlayment glow behind ticks - soft diffuse glow */}
        {percentage > 0.01 && (
          <path
            d={`M ${cx + radius * Math.cos((startAngle * Math.PI) / 180)} ${cy + radius * Math.sin((startAngle * Math.PI) / 180)} A ${radius} ${radius} 0 ${currentAngle - startAngle > 180 ? 1 : 0} 1 ${cx + radius * Math.cos((currentAngle * Math.PI) / 180)} ${cy + radius * Math.sin((currentAngle * Math.PI) / 180)}`}
            fill="none"
            stroke="url(#underlayGradient)"
            strokeWidth={3}
            strokeLinecap="butt"
            style={{
              filter: 'url(#softGlow)',
              opacity: 1,
            }}
          />
        )}
        
        {/* Outer decorative arc */}
        <path
          d={outerArcPath}
          fill="none"
          stroke="#1e293b"
          strokeWidth="1"
          opacity="0.5"
        />
        
        {/* Inner glow arc - violet accent */}
        <path
          d={glowArcPath}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          opacity="0.4"
          style={{ filter: 'drop-shadow(0 0 12px #8b5cf6)' }}
        />
        
        {/* NUT Countdown Arc - segmented gradient (green tip → yellow → orange → red) */}
        {nutTotal !== undefined && nutTotal > 0 && nutRemaining !== undefined && (() => {
          const nutPct = Math.max(0, Math.min(1, nutRemaining / nutTotal)); // 1 = full NUT, 0 = covered
          const nutRadius = innerRadius - 18;
          const nutArcStartAngle = startAngle;
          const nutArcEndAngle = startAngle + (sweepAngle * nutPct);
          
          if (nutPct <= 0.01) return null;
          
          // Create many segments for smooth blended gradient
          const segments = 50;
          const totalSweep = nutArcEndAngle - nutArcStartAngle;
          
          // Color keyframes with positions (weighted heavily toward red)
          const colorStops = [
            { pos: 0.00, r: 16, g: 185, b: 129 },  // Green
            { pos: 0.03, r: 34, g: 197, b: 94 },   // Light green
            { pos: 0.06, r: 234, g: 179, b: 8 },   // Yellow
            { pos: 0.15, r: 250, g: 204, b: 21 },  // Bright yellow
            { pos: 0.25, r: 245, g: 158, b: 11 },  // Amber
            { pos: 0.38, r: 249, g: 115, b: 22 },  // Orange
            { pos: 0.52, r: 234, g: 88, b: 12 },   // Deep orange
            { pos: 0.70, r: 220, g: 38, b: 38 },   // Red
            { pos: 0.88, r: 239, g: 68, b: 68 },   // Bright red
            { pos: 1.00, r: 248, g: 113, b: 113 }, // Light red
          ];
          
          // Interpolate between color stops
          const getColor = (t: number) => {
            let lower = colorStops[0];
            let upper = colorStops[colorStops.length - 1];
            for (let i = 0; i < colorStops.length - 1; i++) {
              if (t >= colorStops[i].pos && t <= colorStops[i + 1].pos) {
                lower = colorStops[i];
                upper = colorStops[i + 1];
                break;
              }
            }
            const range = upper.pos - lower.pos;
            const blend = range > 0 ? (t - lower.pos) / range : 0;
            const r = Math.round(lower.r + (upper.r - lower.r) * blend);
            const g = Math.round(lower.g + (upper.g - lower.g) * blend);
            const b = Math.round(lower.b + (upper.b - lower.b) * blend);
            return `rgb(${r},${g},${b})`;
          };
          
          return (
            <>
              {Array.from({ length: segments }).map((_, i) => {
                const t0 = i / segments;
                const t1 = (i + 1) / segments;
                const angle0 = nutArcStartAngle + totalSweep * t0;
                const angle1 = nutArcStartAngle + totalSweep * t1;
                const rad0 = (angle0 * Math.PI) / 180;
                const rad1 = (angle1 * Math.PI) / 180;
                
                const segPath = `
                  M ${cx + nutRadius * Math.cos(rad0)} ${cy + nutRadius * Math.sin(rad0)}
                  A ${nutRadius} ${nutRadius} 0 0 1 ${cx + nutRadius * Math.cos(rad1)} ${cy + nutRadius * Math.sin(rad1)}
                `;
                
                const color = getColor(t0);
                
                return (
                  <path
                    key={i}
                    d={segPath}
                    fill="none"
                    stroke={color}
                    strokeWidth={4}
                    strokeLinecap="butt"
                    opacity={0.9}
                    style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
                  />
                );
              })}
            </>
          );
        })()}
        
        {/* Tick marks */}
        {ticks}
        
        {/* Center display */}
        <circle
          cx={cx}
          cy={cy}
          r={innerRadius - 20}
          fill="url(#centerGradient)"
          className="fill-zinc-900/80"
        />
        
        {/* Value display */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          className="fill-white"
          style={{ 
            fontSize: size * 0.18,
            fontWeight: 700,
            fontFamily: 'system-ui',
            filter: `drop-shadow(0 0 20px ${mainColor})`,
          }}
        >
          {Math.round(clampedValue)}%
        </text>
        
        {/* Label */}
        <text
          x={cx}
          y={cy + size * 0.08}
          textAnchor="middle"
          className="fill-zinc-400"
          style={{ 
            fontSize: size * 0.045,
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </text>
        
        {/* Sub label */}
        {subLabel && (
          <text
            x={cx}
            y={cy + size * 0.14}
            textAnchor="middle"
            style={{ 
              fontSize: size * 0.035,
              fill: '#71717a',
            }}
          >
            {subLabel}
          </text>
        )}
        
        {/* Scale labels */}
        <text x={cx - radius - 25} y={cy + radius * 0.7} className="fill-zinc-600" style={{ fontSize: 10 }}>0</text>
        <text x={cx} y={cy - radius - 15} className="fill-zinc-600" style={{ fontSize: 10, textAnchor: 'middle' }}>100</text>
        <text x={cx + radius + 15} y={cy + radius * 0.7} className="fill-zinc-600" style={{ fontSize: 10 }}>200</text>
      </svg>
    </div>
  );
}

interface SideGaugeProps {
  value: number;
  label: string;
  subValue?: string;
  variant: 'left' | 'right';
  status?: 'positive' | 'negative' | 'neutral';
  fillOverride?: number; // 0-1 to override automatic fill calculation
  dimGlow?: boolean; // Reduce glow intensity for low confidence
}

export function SideGauge({ value, label, subValue, variant, status = 'neutral', fillOverride, dimGlow = false }: SideGaugeProps) {
  const barCount = 8;
  // Use fillOverride if provided (0-1), otherwise calculate from value
  const filledBars = fillOverride !== undefined 
    ? Math.min(barCount, Math.max(0, Math.round(fillOverride * barCount)))
    : Math.min(barCount, Math.max(0, Math.round((value / 10000) * barCount)));
  
  // 3-color gradient: red (inner) → amber/yellow (middle) → cyan (outer)
  const getBarColor = (index: number, total: number, isPositive: boolean) => {
    const progress = index / (total - 1);
    if (isPositive) {
      // Red → Amber → Cyan
      if (progress < 0.5) {
        const t = progress / 0.5;
        const r = Math.round(239 + (245 - 239) * t);  // #ef4444 to #f59e0b
        const g = Math.round(68 + (158 - 68) * t);
        const b = Math.round(68 + (11 - 68) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = (progress - 0.5) / 0.5;
        const r = Math.round(245 + (34 - 245) * t);   // #f59e0b to #22d3ee
        const g = Math.round(158 + (211 - 158) * t);
        const b = Math.round(11 + (238 - 11) * t);
        return `rgb(${r}, ${g}, ${b})`;
      }
    } else {
      // Same gradient for negative (red → amber → cyan)
      if (progress < 0.5) {
        const t = progress / 0.5;
        const r = Math.round(239 + (245 - 239) * t);
        const g = Math.round(68 + (158 - 68) * t);
        const b = Math.round(68 + (11 - 68) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = (progress - 0.5) / 0.5;
        const r = Math.round(245 + (34 - 245) * t);
        const g = Math.round(158 + (211 - 158) * t);
        const b = Math.round(11 + (238 - 11) * t);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
  };
  
  const isPositive = status === 'positive';
  const textColor = isPositive ? '#22d3ee' : '#ef4444';
  
  return (
    <div className={`flex flex-col items-center gap-2 ${variant === 'left' ? 'items-end' : 'items-start'}`}>
      <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      
      {/* Vertical bar indicator */}
      <div className="flex gap-1" style={{ flexDirection: variant === 'left' ? 'row-reverse' : 'row' }}>
        {Array.from({ length: barCount }).map((_, i) => {
          const barColor = getBarColor(i, barCount, isPositive);
          const isFilled = i < filledBars;
          return (
            <div
              key={i}
              className="w-2 rounded-sm transition-all duration-300"
              style={{
                height: 20 + i * 4,
                backgroundColor: isFilled ? barColor : '#27272a',
                boxShadow: isFilled ? `0 0 ${dimGlow ? '4px' : '8px'} ${barColor}` : 'none',
                opacity: dimGlow && isFilled ? 0.7 : 1,
              }}
            />
          );
        })}
      </div>
      
      {/* Value */}
      <div 
        className="text-2xl font-bold"
        style={{ color: textColor, textShadow: `0 0 20px ${textColor}` }}
      >
        ${(value / 1000).toFixed(1)}k
      </div>
      
      {subValue && (
        <div className="text-xs text-zinc-500">{subValue}</div>
      )}
    </div>
  );
}

interface OpenHoursTemplate {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  onDayClick?: (day: number) => void;
  year?: number;
  month?: number;
  openHoursTemplate?: OpenHoursTemplate;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_KEYS: (keyof OpenHoursTemplate)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function MonthProgressBar({ current, total, label, onDayClick, year, month, openHoursTemplate }: ProgressBarProps) {
  const segments = total;
  const filled = current;
  
  const now = new Date();
  const displayYear = year ?? now.getFullYear();
  const displayMonth = month ?? (now.getMonth() + 1);
  
  const isClosedDay = (dayOfMonth: number): boolean => {
    if (!openHoursTemplate) return false;
    const date = new Date(displayYear, displayMonth - 1, dayOfMonth);
    const dayKey = DAY_KEYS[date.getDay()];
    return openHoursTemplate[dayKey] === 0;
  };
  
  const getDayName = (dayOfMonth: number): string => {
    const date = new Date(displayYear, displayMonth - 1, dayOfMonth);
    return DAY_NAMES[date.getDay()];
  };
  
  const getTitle = (dayOfMonth: number): string => {
    const dayName = getDayName(dayOfMonth);
    const closed = isClosedDay(dayOfMonth);
    return `${dayName} ${displayMonth}/${dayOfMonth}${closed ? ' - Closed' : ''}`;
  };
  
  const getSegmentColor = (index: number, totalSegments: number) => {
    const progress = index / (totalSegments - 1);
    
    if (progress < 0.5) {
      const t = progress / 0.5;
      const r = Math.round(186 + (34 - 186) * t);
      const g = Math.round(230 + (211 - 230) * t);
      const b = Math.round(253 + (238 - 253) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = (progress - 0.5) / 0.5;
      const r = Math.round(34 + (16 - 34) * t);
      const g = Math.round(211 + (185 - 211) * t);
      const b = Math.round(238 + (129 - 238) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };
  
  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-widest text-zinc-500">{label}</span>
          <span className="text-zinc-400">Day {current} of {total}</span>
        </div>
      )}
      
      <div className="flex gap-0.5">
        {Array.from({ length: Math.min(segments, 31) }).map((_, i) => {
          const dayOfMonth = i + 1;
          const isFilled = i < filled;
          const isToday = i === filled - 1;
          const closed = isClosedDay(dayOfMonth);
          const color = getSegmentColor(i, segments);
          
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick?.(dayOfMonth)}
              className="h-2 flex-1 rounded-sm transition-all duration-300 hover:opacity-80 hover:scale-y-150 cursor-pointer"
              style={{
                backgroundColor: isFilled ? color : '#1e293b',
                boxShadow: isToday ? `0 0 12px ${color}` : isFilled ? `0 0 4px ${color}50` : 'none',
                opacity: closed ? 0.6 : 1,
              }}
              title={getTitle(dayOfMonth)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface MiniReadoutProps {
  label: string;
  value: string;
  subValue?: string;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
}

export function MiniReadout({ label, value, subValue, status = 'neutral' }: MiniReadoutProps) {
  const colors = {
    good: '#22d3ee',
    warning: '#f59e0b',
    danger: '#ef4444',
    neutral: '#a1a1aa',
  };
  
  const color = colors[status];
  
  return (
    <div className="group relative flex flex-col items-center overflow-hidden rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 px-4 py-3 backdrop-blur-md">
      {/* Glass shine effect */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" style={{ height: '40%' }} />
      
      <div className="relative text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div 
        className="relative mt-1 text-lg font-bold"
        style={{ color, textShadow: `0 0 12px ${color}50` }}
      >
        {value}
      </div>
      {subValue && (
        <div className="relative text-[10px] text-zinc-500">{subValue}</div>
      )}
    </div>
  );
}
