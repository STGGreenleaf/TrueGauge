'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type { WeeklyBalance, WeeklyDelta, WeeklyEstimate, ConfidenceLevel, DailyBalancePoint, InferredAnchorResult } from '@/lib/calc';

// ============================================
// TYPES
// ============================================

export interface LiquidityReceiverProps {
  balances: WeeklyBalance[];
  deltas: WeeklyDelta[];
  lyEstimates: WeeklyEstimate[];
  weeklyActualSales?: Array<{ weekEnd: string; value: number; hasData: boolean }>;
  estBalanceSeries: DailyBalancePoint[];
  mergedBalanceSeries: DailyBalancePoint[];
  actualBalanceSeries: DailyBalancePoint[];
  anchor: InferredAnchorResult;
  continuityStats: {
    estCount: number;
    actualCount: number;
    mergedCount: number;
    yearStartDate: string;
    endDate: string;
  };
  operatingFloor: number;
  targetReserve: number;
  monthlyNut: number;
  velocity: number;
  safeToSpend: number;
  cashNow: number;
  asOfDate: string;
  confidence: ConfidenceLevel;
  timezone?: string; // IANA timezone, defaults to America/Denver
  // Capital tracking
  capitalSeries?: Array<{ weekEnd: string; capital: number }>;
  totalCapitalInvested?: number;
  // NUT history series
  nutSeries?: Array<{ weekEnd: string; nut: number }>;
}

type PresetKey = '2M' | '3M' | '6M' | 'YTD' | 'ALL' | 'TODAY';

// ============================================
// HELPERS
// ============================================

function formatMonthLabel(dateStr: string): string {
  if (!dateStr) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const [, month] = dateStr.split('-').map(Number);
  return months[month - 1] || '';
}

function getDateStr(item: WeeklyBalance | WeeklyEstimate): string {
  if ('weekEnd' in item) return (item as WeeklyBalance).weekEnd;
  return (item as WeeklyEstimate).weekStart;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function safeNum(val: number, fallback = 0): number {
  return isNaN(val) || !isFinite(val) ? fallback : val;
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value.toFixed(0);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Color mapping: negative delta = red, flat = amber, positive = emerald (distinct from week TY cyan)
function getDeltaColor(delta: number, maxDelta: number): string {
  if (maxDelta === 0) return '#f59e0b'; // amber for no data
  const ratio = delta / maxDelta;
  if (ratio < -0.1) return '#ef4444'; // red - negative
  if (ratio > 0.1) return '#10b981';  // emerald - positive (NOT cyan, to avoid confusion with week bars)
  return '#f59e0b'; // amber - flat/neutral
}

// Balance color based on thresholds
function getBalanceColor(val: number, floor: number, target: number): string {
  if (floor > 0 && val < floor) return '#ef4444'; // red - below floor
  if (target > 0 && val >= target) return '#8b5cf6'; // violet - above target
  return '#22d3ee'; // cyan - between
}

// ============================================
// COMPONENT
// ============================================

export function LiquidityReceiverV3({
  balances,
  deltas,
  lyEstimates,
  weeklyActualSales,
  estBalanceSeries,
  mergedBalanceSeries,
  actualBalanceSeries,
  anchor,
  continuityStats,
  operatingFloor,
  targetReserve,
  monthlyNut,
  velocity,
  safeToSpend,
  cashNow,
  asOfDate,
  confidence,
  timezone = 'America/Denver',
  capitalSeries,
  totalCapitalInvested,
  nutSeries,
}: LiquidityReceiverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [activePreset, setActivePreset] = useState<PresetKey>('TODAY');
  const [scrubIndex, setScrubIndex] = useState<number | null>(null); // Scrubbed needle position
  const [isDraggingNeedle, setIsDraggingNeedle] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showRunwayTip, setShowRunwayTip] = useState(false);
  const runwayTipRef = useRef<HTMLDivElement>(null);
  
  // Detect mobile width
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Close runway tooltip when clicking outside
  useEffect(() => {
    if (!showRunwayTip) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (runwayTipRef.current && !runwayTipRef.current.contains(e.target as Node)) {
        setShowRunwayTip(false);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showRunwayTip]);
  
  // Total data points (weeks) - use lyEstimates as authoritative timeline
  const totalWeeks = Math.max(lyEstimates.length, 1);
  
  // Calculate YTD weeks (rolling 52 weeks - one year back from today)
  const ytdWeeks = useMemo(() => {
    // YTD = rolling 52 weeks (one year at a glance)
    return Math.min(52, totalWeeks);
  }, [totalWeeks]);
  
  // Lens width based on preset - narrower on mobile to prevent text compression
  // Mobile shows fewer weeks to maintain readable text
  const lensWidths: Record<PresetKey, number> = useMemo(() => ({
    '2M': Math.min(isMobile ? 8 : 12, totalWeeks),   // Mobile: ~2 months
    '3M': Math.min(isMobile ? 10 : 16, totalWeeks),  // Mobile: ~2.5 months
    '6M': Math.min(isMobile ? 16 : 28, totalWeeks),  // Mobile: ~4 months
    'YTD': Math.min(ytdWeeks, totalWeeks),           // Current year only
    'ALL': totalWeeks,
    'TODAY': Math.min(isMobile ? 8 : 16, totalWeeks), // Mobile: ~2 months focused
  }), [isMobile, totalWeeks, ytdWeeks]);
  
  // Check if in TODAY mode for special rendering
  const isTodayMode = activePreset === 'TODAY';
  
  const [lensWidth, setLensWidth] = useState(lensWidths['TODAY']);
  const [centerIndex, setCenterIndex] = useState(totalWeeks - 1); // Start at NOW
  
  // Sync lensWidth when lensWidths changes (e.g., after mobile detection or data load)
  useEffect(() => {
    setLensWidth(lensWidths[activePreset]);
    setCenterIndex(totalWeeks - 1);
  }, [lensWidths, totalWeeks, activePreset]);
  const [hoveredWeekIdx, setHoveredWeekIdx] = useState<number | null>(null);
  const [hoveredDeltaIdx, setHoveredDeltaIdx] = useState<number | null>(null);
  const [liveHovered, setLiveHovered] = useState(false);
  
  // Calculate visible window bounds
  // For YTD/ALL: show data ending at NOW (not centered)
  // For other modes: center on the current position
  const isFullView = activePreset === 'YTD' || activePreset === 'ALL';
  const halfLens = Math.floor(lensWidth / 2);
  
  let windowStart: number;
  let windowEnd: number;
  
  if (isFullView) {
    // Full view modes: show lensWidth weeks ending at NOW
    windowEnd = Math.min(totalWeeks - 1, centerIndex);
    windowStart = Math.max(0, windowEnd - lensWidth + 1);
  } else {
    // Focused modes: center on current position
    windowStart = Math.max(0, centerIndex - halfLens);
    windowEnd = Math.min(totalWeeks - 1, windowStart + lensWidth - 1);
  }
  
  // Slice visible data - clamp to actual array lengths to avoid empty slices
  const balanceStart = Math.max(0, windowStart - (lyEstimates.length - balances.length));
  const balanceEnd = Math.min(balances.length - 1, windowEnd - (lyEstimates.length - balances.length));
  const visibleBalances = balances.slice(Math.max(0, balanceStart), balanceEnd + 1);
  const visibleDeltas = deltas.slice(windowStart, windowEnd + 1);
  const visibleLY = lyEstimates.slice(windowStart, windowEnd + 1);
  
  // Use estBalanceSeries for green line - shows cash BALANCE trajectory
  // This is the $60K → $0 decline over time (reconciled to snapshot)
  const visibleEstBalance = useMemo(() => {
    const series = estBalanceSeries;
    if (!series || series.length === 0) return [];
    
    // Map series by date for quick lookup
    const balanceByDate = new Map<string, number>();
    for (const point of series) {
      balanceByDate.set(point.date, point.balance);
    }
    
    // Get balance for each visible week's end date
    const result: { date: string; balance: number }[] = [];
    const visibleWeeks = lyEstimates.slice(windowStart, windowEnd + 1);
    
    for (const week of visibleWeeks) {
      const weekEnd = week.weekEnd || week.weekStart;
      const balance = balanceByDate.get(weekEnd);
      if (balance !== undefined) {
        result.push({ date: weekEnd, balance });
      } else {
        // Find closest date in series
        let closest = series[0];
        for (const point of series) {
          if (point.date <= weekEnd) closest = point;
          else break;
        }
        result.push({ date: weekEnd, balance: closest.balance });
      }
    }
    
    return result;
  }, [estBalanceSeries, lyEstimates, windowStart, windowEnd]);
  
  // Capital series for label positioning (total invested)
  const visibleCapital = useMemo(() => {
    if (!capitalSeries || capitalSeries.length === 0) return [];
    return capitalSeries.slice(windowStart, windowEnd + 1);
  }, [capitalSeries, windowStart, windowEnd]);
  
  // NUT series for stepped NUT line
  const visibleNut = useMemo(() => {
    if (!nutSeries || nutSeries.length === 0) return [];
    return nutSeries.slice(windowStart, windowEnd + 1);
  }, [nutSeries, windowStart, windowEnd]);
  
  // Calculate visible-slice scaling for Balance lane
  // Always include FLOOR, NUT, TARGET so all threshold lines are visible
  const balanceScale = useMemo(() => {
    const values: number[] = [];
    visibleBalances.forEach(b => values.push(b.balance));
    if (values.length === 0 && visibleLY.length > 0) {
      visibleLY.forEach(ly => values.push(ly.value));
    }
    if (values.length === 0) return { min: 0, max: 100000, range: 100000 };
    
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    
    // Include FLOOR, NUT and TARGET in scale so all lines are visible
    let min = dataMin;
    let max = dataMax;
    
    if (operatingFloor > 0) min = Math.min(min, operatingFloor);
    if (monthlyNut > 0) min = Math.min(min, monthlyNut);
    if (targetReserve > 0) max = Math.max(max, targetReserve);
    
    // 5% padding top and bottom
    const range = max - min || 10000;
    const padding = range * 0.05;
    min = Math.max(0, min - padding);
    max = max + padding;
    
    return { min, max, range: max - min };
  }, [visibleBalances, visibleLY, operatingFloor, targetReserve, monthlyNut]);
  
  // Calculate visible-slice scaling for Delta lane (symmetric around zero)
  const deltaScale = useMemo(() => {
    if (visibleDeltas.length === 0) return { max: 5000 };
    const maxAbs = Math.max(...visibleDeltas.map(d => Math.abs(d.delta)), 500);
    return { max: maxAbs * 1.1 };
  }, [visibleDeltas]);
  
  // Handle preset click - changes lens width and centers appropriately
  const handlePresetClick = (preset: PresetKey) => {
    setActivePreset(preset);
    const newLensWidth = lensWidths[preset];
    setLensWidth(newLensWidth);
    
    if (preset === 'ALL') {
      // ALL: justify right so most recent activity shows first
      setCenterIndex(totalWeeks - 1);
      setScrubIndex(null);
    } else if (preset === 'YTD') {
      // YTD: rolling 52 weeks with NOW at end
      setCenterIndex(totalWeeks - 1);
      setScrubIndex(null);
    } else if (preset === 'TODAY') {
      setCenterIndex(totalWeeks - 1); // Center on today with focused view
      setScrubIndex(null);
    } else {
      setCenterIndex(totalWeeks - 1); // Keep at NOW
      setScrubIndex(null);
    }
  };
  
  // Click handling - in TODAY mode, clicking pans viewport (not scrub needle)
  const handleNeedleScrub = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const pct = relX / rect.width;
    
    if (isTodayMode) {
      // In TODAY mode: clicking pans the viewport
      // Click left of center = pan back in time (increase centerIndex offset)
      // Click right of center = pan forward toward today
      if (pct < 0.4) {
        // Pan back 1 week - allow going to beginning of data
        setCenterIndex(prev => Math.max(0, prev - 1));
      } else if (pct > 0.6) {
        // Pan forward 1 week (toward today)
        setCenterIndex(prev => Math.min(totalWeeks - 1, prev + 1));
      }
      // Keep needle at today
      setScrubIndex(null);
    } else {
      // Non-TODAY mode: click to scrub needle
      const dataSource = visibleBalances.length > 0 ? visibleBalances : visibleLY;
      const idx = Math.round(pct * (dataSource.length - 1));
      const clampedIdx = Math.max(0, Math.min(dataSource.length - 1, idx));
      const actualIdx = windowStart + clampedIdx;
      setScrubIndex(actualIdx);
    }
  };
  
  // Drag handling for scrubbing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const deltaX = e.clientX - dragStartX;
    const containerWidth = containerRef.current.offsetWidth;
    // More pixels required per week = less sensitive panning
    const pixelsPerWeek = containerWidth / Math.max(8, lensWidth); // At least 8 weeks worth of drag space
    const weeksDelta = Math.round(deltaX / pixelsPerWeek);
    
    if (weeksDelta !== 0) {
      setDragStartX(e.clientX);
      // Clamp to valid range: 0 to totalWeeks-1 (allow panning to beginning)
      setCenterIndex(prev => clamp(prev - weeksDelta, 0, totalWeeks - 1));
    }
  };
  
  const handleMouseUp = () => setIsDragging(false);
  
  // Sync state when data changes
  useEffect(() => {
    if (totalWeeks > 0) {
      setCenterIndex(prev => Math.min(prev, totalWeeks - 1));
      setLensWidth(prev => Math.min(prev, totalWeeks));
    }
  }, [totalWeeks]);
  
  // Update lens width when mobile state changes
  useEffect(() => {
    setLensWidth(lensWidths[activePreset]);
  }, [isMobile, activePreset, lensWidths]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NOW-CENTERED SCALE - Expand middle zone around NOW, compress extremes
  // ═══════════════════════════════════════════════════════════════════════════
  const normalizeBalance = (value: number, laneHeight: number): number => {
    const { min, max } = balanceScale;
    if (max <= min) return laneHeight / 2;
    
    const pct = (value - min) / (max - min);
    
    // Calculate where NOW sits in the value range (use as center point)
    const nowPct = (cashNow - min) / (max - min);
    
    // Define middle zone: ±20% around NOW (but clamped to valid range)
    const zoneRadius = 0.20;
    const middleStart = Math.max(0.05, nowPct - zoneRadius);
    const middleEnd = Math.min(0.95, nowPct + zoneRadius);
    
    // Screen allocation: middle zone gets 60% of screen, centered at 50%
    const middleScreenStart = 0.20; // Bottom edge of middle zone on screen
    const middleScreenEnd = 0.80;   // Top edge of middle zone on screen
    
    let screenPct: number;
    if (pct <= middleStart) {
      // Below middle zone: compress into bottom 20% of screen
      screenPct = (pct / middleStart) * middleScreenStart;
    } else if (pct <= middleEnd) {
      // Middle zone: expand to 60% of screen (20% to 80%)
      const middleProgress = (pct - middleStart) / (middleEnd - middleStart);
      screenPct = middleScreenStart + middleProgress * (middleScreenEnd - middleScreenStart);
    } else {
      // Above middle zone: compress into top 20% of screen
      const topProgress = (pct - middleEnd) / (1 - middleEnd);
      screenPct = middleScreenEnd + topProgress * (1 - middleScreenEnd);
    }
    
    // Higher values = lower Y (top of chart)
    return laneHeight * (1 - screenPct);
  };
  
  const normalizeDelta = (value: number, laneHeight: number): number => {
    const { max } = deltaScale;
    const normalized = (value / max) * (laneHeight / 2);
    return laneHeight / 2 - normalized;
  };
  
  // NOW position in visible window
  const nowWeekIndex = totalWeeks - 1;
  const nowInView = nowWeekIndex >= windowStart && nowWeekIndex <= windowEnd;
  const nowPosition = nowInView ? ((nowWeekIndex - windowStart) / Math.max(1, lensWidth - 1)) * 100 : 50;
  
  // Determine if wide lens (for velocity label)
  const isWideLens = lensWidth >= 20;
  
  // SVG dimensions - wider to show all months in YTD
  const SVG_W = 600;
  const SVG_H = 180;
  
  // Data line padding - ensures labels fit and lines fill space
  const DATA_PAD_L = 4;   // Left padding for data lines
  const DATA_PAD_R = 4;   // Right padding for data lines
  const DATA_WIDTH = SVG_W - DATA_PAD_L - DATA_PAD_R;
  
  // Track how far back we've panned from today (in weeks)
  const defaultCenterIdx = totalWeeks - 1;
  const panOffset = defaultCenterIdx - centerIndex; // 0 = at today, positive = panned back
  
  // Calculate needle/today X position
  // Mobile: 50% centered. Desktop: 75% right. Responsive between.
  const getTodayX = (): number => {
    if (!isTodayMode || scrubIndex !== null) {
      return DATA_WIDTH + DATA_PAD_L; // Right edge in non-TODAY modes
    }
    const needlePercent = isMobile ? 0.50 : 0.75; // 50% mobile, 75% desktop
    const centerX = SVG_W * needlePercent;
    const pixelsPerWeek = DATA_WIDTH / Math.max(1, lensWidth);
    return centerX + (panOffset * pixelsPerWeek);
  };
  
  // Data X position - in TODAY mode, last point aligns with needle
  const getDataX = (idx: number, total: number): number => {
    if (!isTodayMode || scrubIndex !== null || total <= 1) {
      // Non-TODAY mode: fill viewport left-to-right
      return (idx / Math.max(1, total - 1)) * DATA_WIDTH + DATA_PAD_L;
    }
    // TODAY mode: position data so last point aligns with needle
    const todayX = getTodayX();
    const spacing = DATA_WIDTH / Math.max(1, total - 1);
    // Last point at todayX, earlier points spaced to the left
    return todayX - ((total - 1 - idx) * spacing);
  };
  
  // Row heights (stacked) - balance lane extends to just above week blocks
  const ROW_A = { y: 0, h: 32 };    // Big numerals + cash stations - taller for month/date stack
  const ROW_C = { y: 32, h: 102 };  // Balance lane (hero) - starts after ROW_A
  const ROW_D = { y: 134, h: 28 };  // Delta lane (smaller)
  const ROW_B = { y: 162, h: 18 };  // Week blocks (bottom)
  
  // Generate month markers for Row A - use getDataX for alignment with data
  const monthMarkers = useMemo(() => {
    const allMarkers: { x: number; label: string; isFirst: boolean }[] = [];
    const dataSource = visibleBalances.length > 0 ? visibleBalances : visibleLY;
    if (dataSource.length === 0) return allMarkers;
    
    let lastMonth = -1;
    
    // Always add first month at first data point position
    const firstDateStr = getDateStr(dataSource[0]);
    const [, firstMonth] = firstDateStr.split('-').map(Number);
    const firstX = getDataX(0, dataSource.length);
    allMarkers.push({ x: firstX, label: formatMonthLabel(firstDateStr), isFirst: true });
    lastMonth = firstMonth;
    
    // Collect subsequent month transitions
    dataSource.forEach((item, i) => {
      if (i === 0) return; // Skip first, already added
      const dateStr = getDateStr(item);
      const [, month, day] = dateStr.split('-').map(Number);
      if (month !== lastMonth) {
        const x = getDataX(i, dataSource.length);
        allMarkers.push({ x, label: formatMonthLabel(dateStr), isFirst: day <= 7 });
        lastMonth = month;
      }
    });
    
    // Filter out overlapping labels - minimum 40px spacing
    const minSpacing = 40;
    const filtered: typeof allMarkers = [];
    let lastX = -999;
    
    for (const marker of allMarkers) {
      if (marker.x - lastX >= minSpacing) {
        filtered.push(marker);
        lastX = marker.x;
      }
    }
    
    return filtered;
  }, [visibleBalances, visibleLY, getDataX]);
  
  // Cash station markers (10K, 25K, 50K, 100K)
  const cashStations = useMemo(() => {
    const stations = [10000, 25000, 50000, 100000];
    return stations
      .filter(v => v >= balanceScale.min && v <= balanceScale.max)
      .map(v => ({
        value: v,
        y: ROW_C.y + normalizeBalance(v, ROW_C.h),
        label: formatCompact(v),
      }));
  }, [balanceScale]);
  
  // Runway label
  const runwayLabel = useMemo(() => {
    if (velocity >= 0) return { text: 'EXTENDING', isPositive: true };
    const daysToFloor = operatingFloor > 0 && cashNow > operatingFloor
      ? Math.ceil((cashNow - operatingFloor) / Math.abs(velocity))
      : null;
    if (daysToFloor !== null && daysToFloor < 365) {
      return { text: `${daysToFloor}D (est)`, isPositive: false };
    }
    return { text: '---', isPositive: true };
  }, [velocity, operatingFloor, cashNow]);
  
  // Velocity label (per open day or per week based on zoom)
  const velocityLabel = useMemo(() => {
    const val = isWideLens ? velocity * 7 : velocity;
    const unit = isWideLens ? '/WK' : '/DAY';
    const prefix = val >= 0 ? '+' : '';
    return `${prefix}${formatCompact(val)}${unit}`;
  }, [velocity, isWideLens]);

  return (
    <div className="relative z-50">
      {/* Readouts Row - above dial */}
      <div className="flex items-center justify-between mb-2 px-1">
        {/* Primary: Balance */}
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">BALANCE</span>
          <span 
            className="text-lg font-bold"
            style={{ 
              color: getBalanceColor(cashNow, operatingFloor, targetReserve),
              textShadow: `0 0 12px ${getBalanceColor(cashNow, operatingFloor, targetReserve)}40`,
            }}
          >
            {formatCurrency(cashNow)}
          </span>
        </div>
        
        {/* Secondary: Safe to Spend */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">SAFE TO SPEND</span>
          <span className="text-sm font-medium text-zinc-300">
            {formatCurrency(safeToSpend)}
          </span>
        </div>
        
        {/* Tertiary: Runway / Velocity - with tooltip */}
        <div ref={runwayTipRef} className="flex flex-col items-end relative">
          <button
            onClick={() => setShowRunwayTip(!showRunwayTip)}
            className="flex flex-col items-end cursor-pointer hover:bg-zinc-800/30 px-2 py-1 -mx-2 -my-1 rounded transition-colors"
          >
            <span className="text-[9px] uppercase tracking-widest text-zinc-500">RUNWAY</span>
            <span 
              className="text-sm font-medium"
              style={{ color: runwayLabel.isPositive ? '#22d3ee' : '#ef4444' }}
            >
              {runwayLabel.text}
            </span>
            <span className="text-[10px] font-medium text-zinc-400">
              {velocityLabel} {anchor.isInferred && <span className="text-amber-500">(est)</span>}
            </span>
          </button>
          
          {/* Runway Tooltip */}
          {showRunwayTip && (
            <div className="absolute top-full right-0 mt-2 w-72 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-[100] whitespace-pre-line">
              <div className="absolute top-[-6px] right-4 w-3 h-3 bg-zinc-800 border-l border-t border-zinc-700 transform rotate-45"></div>
              <div className="font-medium text-cyan-400 mb-2">Velocity: {velocityLabel}</div>
              {velocity >= 0 ? (
                <>
                  <p className="mb-2"><strong>EXTENDING</strong> means your cash is growing.</p>
                  <p className="mb-2">Based on your recent net sales minus expenses, you're gaining ~${Math.abs(velocity).toFixed(0)} per day.</p>
                  <p className="text-zinc-500">At this pace, your runway extends indefinitely (no floor date).</p>
                </>
              ) : (
                <>
                  <p className="mb-2">Your cash is decreasing at ~${Math.abs(velocity).toFixed(0)} per day.</p>
                  <p className="text-zinc-500">The runway shows estimated days until you hit your operating floor.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dial Container - 5:90:5 layout (labels | data | scale) */}
      <div
        className="flex rounded-lg overflow-hidden"
        style={{
          height: '300px',
          background: 'linear-gradient(180deg, #0a0a0a 0%, #0f1216 30%, #0a0c0f 70%, #050505 100%)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.8), 0 0 30px rgba(245, 158, 11, 0.05)',
        }}
      >
        {/* 5% LEFT - Line Labels (each tracks its line, with collision stacking) */}
        <div 
          className="relative pr-2"
          style={{ width: '5%', minWidth: '55px', borderRight: '1px solid rgba(245, 158, 11, 0.1)' }}
        >
          {(() => {
            // Map SVG coordinates to container pixels (container=300px, SVG_H=180)
            const containerHeight = 300;
            const svgToContainer = (svgY: number) => (svgY / SVG_H) * containerHeight;
            const getY = (val: number) => svgToContainer(ROW_C.y + normalizeBalance(val, ROW_C.h));
            const labelHeight = 11; // Height of label for collision
            const MIN_SEP = 2; // Minimum pixel separation between labels
            
            // Full column bounds (no dates above, no months below - use full height)
            const columnTop = 10; // Small padding from top
            const columnBottom = containerHeight - 20; // Leave room for WEEK label
            
            // Get values (same sources as lines)
            const nutValue = monthlyNut > 0 ? monthlyNut : (visibleNut.length > 0 ? visibleNut[0].nut : 0);
            const firstBalance = visibleBalances.length > 0 ? visibleBalances[0].balance : cashNow;
            const firstCapital = visibleCapital.length > 0 ? visibleCapital[0].capital : 0;
            const firstEst = visibleEstBalance.length > 0 ? visibleEstBalance[0].balance : 0;
            
            // Build labels with raw Y positions, sorted by value (highest first = top)
            const labels: { name: string; color: string; rawY: number; value: number }[] = [];
            if (targetReserve > 0) labels.push({ name: 'TARGET', color: '#8b5cf6', rawY: getY(targetReserve), value: targetReserve });
            if (firstCapital > 0) labels.push({ name: 'CAPITAL', color: '#10b981', rawY: getY(firstCapital), value: firstCapital });
            if (firstEst > 0) labels.push({ name: 'EST', color: '#a1a1aa', rawY: getY(firstEst), value: firstEst });
            if (firstBalance > 0) labels.push({ name: 'NOW', color: '#22d3ee', rawY: getY(firstBalance), value: firstBalance });
            if (nutValue > 0) labels.push({ name: 'NUT', color: '#f59e0b', rawY: getY(nutValue), value: nutValue });
            if (operatingFloor > 0) labels.push({ name: 'FLOOR', color: '#ef4444', rawY: getY(operatingFloor), value: operatingFloor });
            
            // Sort by value descending (highest value = top of chart)
            labels.sort((a, b) => b.value - a.value);
            
            // Collision avoidance: push labels DOWN, use full column height
            const placed: number[] = [];
            const adjustedLabels = labels.map(label => {
              // Clamp raw Y to column bounds first
              let y = Math.max(columnTop, Math.min(label.rawY, columnBottom - labelHeight));
              for (const prevY of placed) {
                if (Math.abs(y - prevY) < labelHeight + MIN_SEP) {
                  // Push this label below the previous one
                  y = prevY + labelHeight + MIN_SEP;
                }
              }
              // Clamp final position to column bounds
              y = Math.min(y, columnBottom - labelHeight);
              placed.push(y);
              return { ...label, adjustedY: y };
            });
            
            // WEEK label position
            const weekY = svgToContainer(ROW_B.y + ROW_B.h / 2);
            
            return (
              <>
                {adjustedLabels.map(label => (
                  <div 
                    key={label.name}
                    className="absolute right-2 text-[9px] font-semibold text-right transition-all duration-300"
                    style={{ top: label.adjustedY - 3, color: label.color }}
                  >
                    {label.name}
                  </div>
                ))}
                
                {/* WEEK label */}
                <div 
                  className="absolute right-2 text-[9px] font-semibold text-right"
                  style={{ top: weekY - 6, color: '#71717a' }}
                >
                  WEEK
                </div>
              </>
            );
          })()}
        </div>

        {/* 90% DATA AREA */}
        <div
          ref={containerRef}
          className="relative cursor-pointer select-none"
          style={{ width: '90%' }}
          onClick={handleNeedleScrub}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >

        {/* Main SVG Dial */}
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Amber glow for NOW needle */}
            <filter id="amberGlow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* LED glow */}
            <filter id="ledGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Tick gradient (vintage dial look) */}
            <linearGradient id="tickGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#27272a" stopOpacity="0.3"/>
              <stop offset="20%" stopColor="#3f3f46" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="#52525b" stopOpacity="1"/>
              <stop offset="80%" stopColor="#3f3f46" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#27272a" stopOpacity="0.3"/>
            </linearGradient>
            {/* Looking glass vignette for TODAY view - dramatic edge darkening */}
            <radialGradient id="lookingGlass" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="transparent" stopOpacity="0"/>
              <stop offset="40%" stopColor="transparent" stopOpacity="0"/>
              <stop offset="70%" stopColor="#000000" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#000000" stopOpacity="0.85"/>
            </radialGradient>
            {/* Spotlight glow for focused view - bright cyan center */}
            <radialGradient id="spotlightGlow" cx="50%" cy="50%" r="40%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15"/>
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.08"/>
              <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.03"/>
              <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
            </radialGradient>
            {/* Future zone fade - matches Looking Glass right edge */}
            <linearGradient id="futureZoneFade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3f3f46" stopOpacity="0.5"/>
              <stop offset="60%" stopColor="#3f3f46" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#3f3f46" stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* Looking Glass Effect - dramatic vignette + spotlight when in TODAY mode */}
          {isTodayMode && (
            <g style={{ pointerEvents: 'none' }}>
              {/* Strong vignette - darkens edges dramatically */}
              <rect
                x={0}
                y={0}
                width={SVG_W}
                height={SVG_H}
                fill="url(#lookingGlass)"
                opacity={1}
              />
              {/* Bright spotlight glow at center - cyan accent */}
              <ellipse
                cx={SVG_W / 2}
                cy={SVG_H / 2}
                rx={SVG_W * 0.25}
                ry={SVG_H * 0.6}
                fill="url(#spotlightGlow)"
                opacity={1}
              />
              {/* Outer glow ring removed - was overlapping content */}
            </g>
          )}

          {/* ═══ ROW A: Big Numerals + Cash Stations ═══ */}
          <g>
            {/* Vertical tick marks - calendar-based daily + weekly ticks */}
            {(() => {
              const dataSource = visibleBalances.length > 0 ? visibleBalances : visibleLY;
              if (dataSource.length < 2) return null;
              
              const ticks: React.ReactElement[] = [];
              
              // Get date range from visible data
              const firstDateStr = getDateStr(dataSource[0]);
              const lastDateStr = getDateStr(dataSource[dataSource.length - 1]);
              const firstDate = new Date(firstDateStr);
              const lastDate = new Date(lastDateStr);
              
              // Get x positions for first and last data points
              const firstX = getDataX(0, dataSource.length);
              const lastX = getDataX(dataSource.length - 1, dataSource.length);
              
              // Calculate pixels per day based on data span
              const totalDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
              const totalPixels = lastX - firstX;
              const pixelsPerDay = totalPixels / totalDays;
              
              // Generate a tick for each day
              let tickIdx = 0;
              const currentDate = new Date(firstDate);
              while (currentDate <= lastDate) {
                const daysSinceStart = Math.round((currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                const x = firstX + (daysSinceStart * pixelsPerDay);
                
                // Skip if off-screen
                if (x < -10 || x > SVG_W + 10) {
                  currentDate.setDate(currentDate.getDate() + 1);
                  tickIdx++;
                  continue;
                }
                
                const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon
                const dayOfMonth = currentDate.getDate();
                
                // Longer tick for week start (Monday), short for daily
                // Month labels already show month starts, so no special tick needed
                const isWeekStart = dayOfWeek === 1;
                const tickH = isWeekStart ? 10 : 4;
                
                // Fade based on distance from center
                const distFromCenter = Math.abs(x - SVG_W / 2);
                const edgeFade = Math.max(0.3, 1 - (distFromCenter / (SVG_W / 2)) * 0.7);
                
                ticks.push(
                  <line
                    key={`tick-${tickIdx}`}
                    x1={x}
                    y1={ROW_A.y + 20}
                    x2={x}
                    y2={ROW_A.y + 20 + tickH}
                    stroke={isWeekStart ? '#a1a1aa' : '#52525b'}
                    strokeWidth={isWeekStart ? 1.5 : 0.75}
                    opacity={edgeFade * (isWeekStart ? 0.9 : 0.5)}
                  />
                );
                
                currentDate.setDate(currentDate.getDate() + 1);
                tickIdx++;
              }
              
              return ticks;
            })()}
            
            {/* Month labels - big, uppercase with symmetric Looking Glass fade */}
            {/* Use scaleX to counteract horizontal compression from preserveAspectRatio="none" */}
            {monthMarkers.map((m, i) => {
              // Skip if completely off-screen
              if (m.x < -50 || m.x > SVG_W + 50) return null;
              
              // Clamp x position so labels don't get cut off at edges
              const minX = 25;
              const maxX = SVG_W - 25;
              const clampedX = Math.max(minX, Math.min(maxX, m.x));
              
              // Symmetric fade: both edges fade (lighting effect only)
              const centerX = SVG_W / 2;
              const distFromCenter = Math.abs(m.x - centerX);
              const maxDist = SVG_W / 2;
              const edgeFade = Math.max(0, 1 - (distFromCenter / maxDist) * 0.6);
              
              // Scale factor to counteract horizontal compression (SVG viewBox is wider than mobile container)
              const textScaleX = isMobile ? 1.8 : 1;
              
              return (
                <text
                  key={`month-${i}`}
                  x={clampedX}
                  y={ROW_A.y + 15}
                  fill="#f59e0b"
                  fontSize={m.isFirst ? 11 : 9}
                  fontWeight="bold"
                  textAnchor="middle"
                  opacity={Math.max(0.4, edgeFade * 0.95)}
                  style={{ letterSpacing: '0.1em', transform: `scaleX(${textScaleX})`, transformOrigin: `${clampedX}px ${ROW_A.y + 15}px` }}
                >
                  {m.label}
                </text>
              );
            })}
            
            {/* Future months in TODAY mode - FEB, MAR positioned right of needle */}
            {isTodayMode && scrubIndex === null && (() => {
              const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
              const currentMonth = parseInt(asOfDate.split('-')[1], 10) - 1;
              const todayX = getTodayX();
              const pixelsPerWeek = DATA_WIDTH / Math.max(1, lensWidth - 1);
              const weeksPerMonth = 4.3;
              
              // Next 2 months
              return [1, 2].map(offset => {
                const futureMonthIdx = (currentMonth + offset) % 12;
                const x = todayX + (offset * weeksPerMonth * pixelsPerWeek);
                if (x > SVG_W + 20) return null;
                
                const distFromCenter = Math.abs(x - SVG_W / 2);
                const edgeFade = Math.max(0, 1 - (distFromCenter / (SVG_W / 2)) * 0.7);
                
                return (
                  <text
                    key={`future-month-${offset}`}
                    x={x}
                    y={ROW_A.y + 15}
                    fill="#a1a1aa"
                    fontSize={9}
                    fontWeight="bold"
                    textAnchor="middle"
                    opacity={Math.max(0.5, edgeFade * 0.8)}
                    style={{ letterSpacing: '0.1em' }}
                  >
                    {months[futureMonthIdx]}
                  </text>
                );
              });
            })()}
            
          </g>

          {/* ═══ ROW C: Balance Lane (Hero) ═══ */}
          <g>
            {/* Lane background */}
            <rect
              x={0}
              y={ROW_C.y}
              width={SVG_W}
              height={ROW_C.h}
              fill="#0a0a0a"
              opacity={0.5}
            />
            
            {/* Threshold lines with collision avoidance (2px min separation) */}
            {(() => {
              const MIN_SEP = 2; // Minimum pixel separation between lines
              const nutValue = monthlyNut > 0 ? monthlyNut : (visibleNut.length > 0 ? visibleNut[0].nut : 0);
              const firstCapital = visibleCapital.length > 0 ? visibleCapital[0].capital : 0;
              
              // Calculate raw Y positions for horizontal threshold lines
              const rawTargetY = targetReserve > 0 ? ROW_C.y + safeNum(normalizeBalance(targetReserve, ROW_C.h), 0) : null;
              const rawCapitalY = firstCapital > 0 ? ROW_C.y + safeNum(normalizeBalance(firstCapital, ROW_C.h), 0) : null;
              const rawNutY = nutValue > 0 ? ROW_C.y + safeNum(normalizeBalance(nutValue, ROW_C.h), ROW_C.h / 2) : null;
              const rawFloorY = operatingFloor > 0 ? ROW_C.y + safeNum(normalizeBalance(operatingFloor, ROW_C.h), ROW_C.h) : null;
              
              // Build list of lines sorted by value (highest first = top of chart)
              const lines: { name: string; rawY: number; value: number }[] = [];
              if (rawTargetY !== null) lines.push({ name: 'target', rawY: rawTargetY, value: targetReserve });
              if (rawCapitalY !== null) lines.push({ name: 'capital', rawY: rawCapitalY, value: firstCapital });
              if (rawNutY !== null) lines.push({ name: 'nut', rawY: rawNutY, value: nutValue });
              if (rawFloorY !== null) lines.push({ name: 'floor', rawY: rawFloorY, value: operatingFloor });
              
              lines.sort((a, b) => b.value - a.value); // Highest value first (top)
              
              // Collision avoidance: push lines DOWN if overlapping
              const placed: number[] = [];
              const adjustedLines: Record<string, number> = {};
              for (const line of lines) {
                let y = line.rawY;
                for (const prevY of placed) {
                  if (Math.abs(y - prevY) < MIN_SEP) {
                    y = prevY + MIN_SEP;
                  }
                }
                placed.push(y);
                adjustedLines[line.name] = y;
              }
              
              const targetY = adjustedLines['target'];
              const capitalY = adjustedLines['capital'];
              const nutY = adjustedLines['nut'];
              const floorY = adjustedLines['floor'];
              
              return (
                <>
                  {/* TARGET threshold line (violet dashed) */}
                  {targetY !== undefined && (
                    <line
                      x1={8}
                      y1={targetY}
                      x2={SVG_W - 8}
                      y2={targetY}
                      stroke="#8b5cf6"
                      strokeWidth={1}
                      strokeDasharray="6,4"
                      opacity={0.6}
                    />
                  )}
                  
                  {/* CAPITAL threshold line (green dashed) */}
                  {capitalY !== undefined && visibleCapital.length > 0 && (
                    <>
                      <path
                        d={visibleCapital.map((c, i) => {
                          const x = getDataX(i, visibleCapital.length);
                          const baseY = ROW_C.y + safeNum(normalizeBalance(c.capital, ROW_C.h), ROW_C.h / 2);
                          const offset = capitalY - (rawCapitalY ?? 0);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${baseY + offset}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={1}
                        strokeDasharray="4,3"
                        opacity={0.7}
                      />
                      {visibleCapital.length > 1 && (
                        <circle
                          cx={getDataX(visibleCapital.length - 1, visibleCapital.length)}
                          cy={ROW_C.y + safeNum(normalizeBalance(visibleCapital[visibleCapital.length - 1].capital, ROW_C.h), ROW_C.h / 2) + (capitalY - (rawCapitalY ?? 0))}
                          r={3}
                          fill="#10b981"
                        />
                      )}
                    </>
                  )}
                  
                  {/* NUT threshold line (amber dashed) - always render if monthlyNut > 0 */}
                  {nutY !== undefined && (
                    <line
                      x1={8}
                      y1={nutY}
                      x2={isTodayMode && scrubIndex === null ? Math.min(getTodayX(), SVG_W) : SVG_W - 8}
                      y2={nutY}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="6,4"
                      opacity={0.6}
                    />
                  )}
                  
                  {/* FLOOR threshold line (red solid) */}
                  {floorY !== undefined && (
                    <line
                      x1={8}
                      y1={floorY}
                      x2={SVG_W - 8}
                      y2={floorY}
                      stroke="#ef4444"
                      strokeWidth={1}
                      opacity={0.6}
                    />
                  )}
                </>
              );
            })()}

            {/* Estimated Balance Reference line (BEHIND balance, gray dashed) - actual data */}
            {visibleEstBalance.length > 1 && (
              <>
                <path
                  d={visibleEstBalance.map((est, i) => {
                    const x = getDataX(i, visibleEstBalance.length);
                    const y = ROW_C.y + safeNum(normalizeBalance(est.balance, ROW_C.h), ROW_C.h / 2);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth={1}
                  strokeDasharray="2,3"
                  opacity={0.6}
                />
              </>
            )}

            {/* Balance line (data visualization) - actual data */}
            {visibleBalances.length >= 1 && (
              <>
                <path
                  d={visibleBalances.map((b, i) => {
                    const x = getDataX(i, visibleBalances.length);
                    const y = ROW_C.y + safeNum(normalizeBalance(b.balance, ROW_C.h), ROW_C.h / 2);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={1}
                  opacity={0.8}
                />
              </>
            )}


            {/* Week indicator blocks removed from balance lane - moved to ROW_B */}

            {/* Future Zone - grayed projection lines starting at "today" position */}
            {isTodayMode && scrubIndex === null && (() => {
              // Gray zone starts at "today" and extends to right edge
              const todayX = getTodayX();
              
              // Don't render if today is off screen to the right
              if (todayX > SVG_W) return null;
              
              return (
                <g style={{ pointerEvents: 'none' }}>
                  {/* Grayed TARGET line - future portion */}
                  <line
                    x1={todayX}
                    y1={ROW_C.y + safeNum(normalizeBalance(targetReserve, ROW_C.h), 0)}
                    x2={SVG_W}
                    y2={ROW_C.y + safeNum(normalizeBalance(targetReserve, ROW_C.h), 0)}
                    stroke="#3f3f46"
                    strokeWidth={1}
                    strokeDasharray="6,4"
                    opacity={0.5}
                  />
                  {/* Grayed NUT line - future portion */}
                  <line
                    x1={todayX}
                    y1={ROW_C.y + safeNum(normalizeBalance(monthlyNut, ROW_C.h), ROW_C.h / 2)}
                    x2={SVG_W}
                    y2={ROW_C.y + safeNum(normalizeBalance(monthlyNut, ROW_C.h), ROW_C.h / 2)}
                    stroke="#3f3f46"
                    strokeWidth={1}
                    strokeDasharray="4,3"
                    opacity={0.5}
                  />
                  {/* Grayed balance flat line - future portion */}
                  {visibleBalances.length > 0 && (() => {
                    const lastBalance = visibleBalances[visibleBalances.length - 1]?.balance || 0;
                    const lastY = ROW_C.y + safeNum(normalizeBalance(lastBalance, ROW_C.h), ROW_C.h / 2);
                    return (
                      <line
                        x1={todayX}
                        y1={lastY}
                        x2={SVG_W}
                        y2={lastY}
                        stroke="#3f3f46"
                        strokeWidth={1}
                        opacity={0.5}
                      />
                    );
                  })()}
                  {/* "EST" label in future zone */}
                  <text
                    x={(todayX + SVG_W) / 2}
                    y={ROW_C.y + ROW_C.h / 2}
                    fill="#3f3f46"
                    fontSize={10}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ letterSpacing: '0.2em' }}
                    opacity={0.4}
                  >
                    EST
                  </text>
                </g>
              );
            })()}

          </g>

          {/* ═══ ROW D: Delta Lane ═══ */}
          <g>
            {/* Baseline (zero line) */}
            <line
              x1={8}
              y1={ROW_D.y + ROW_D.h / 2}
              x2={SVG_W - 8}
              y2={ROW_D.y + ROW_D.h / 2}
              stroke="#3f3f46"
              strokeWidth={0.5}
              opacity={0.6}
            />
            
            {/* Delta bars - actual data, clipped at needle in TODAY mode */}
            {visibleDeltas.map((d, i, arr) => {
              const x = getDataX(i, arr.length);
              const baseline = ROW_D.y + ROW_D.h / 2;
              const maxBarH = ROW_D.h / 2 - 3;
              const barH = Math.max(2, (Math.abs(d.delta) / Math.max(deltaScale.max, 1)) * maxBarH);
              const isPos = d.delta >= 0;
              const y = isPos ? baseline - barH : baseline;
              const color = getDeltaColor(d.delta, deltaScale.max);
              let barW = Math.max(1, (SVG_W - 24) / arr.length * 0.25);
              let barX = x - barW / 2;
              
              // In TODAY mode, clip bar at "today" position (which slides when scrubbing)
              if (isTodayMode) {
                const todayX = getTodayX();
                if (barX + barW > todayX) {
                  barW = Math.max(0, todayX - barX);
                }
                if (barX >= todayX) return null; // Completely past today
              }
              
              const isHovered = hoveredDeltaIdx === i;
              const weekDate = d.weekEnd;
              const [, month, day] = weekDate ? weekDate.split('-').map(Number) : [0, 0, 0];
              
              return (
                <g
                  key={`delta-${i}`}
                  onMouseEnter={() => setHoveredDeltaIdx(i)}
                  onMouseLeave={() => setHoveredDeltaIdx(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={barX}
                    y={y}
                    width={barW}
                    height={barH}
                    fill={d.hasData ? color : '#1f1f23'}
                    opacity={isHovered ? 1 : (d.hasData ? 0.75 : 0.2)}
                    rx={1}
                  />
                  {/* Tooltip moved to end of SVG for z-index */}
                </g>
              );
            })}
            
            {/* Lane label */}
            <text x={SVG_W - 6} y={ROW_D.y + ROW_D.h / 2} fill="#52525b" fontSize={7} textAnchor="end" dominantBaseline="middle">Δ</text>
          </g>

          {/* Visual separator between delta lane and week timeline */}
          <line
            x1={8}
            y1={ROW_D.y + ROW_D.h + 2}
            x2={SVG_W - 8}
            y2={ROW_D.y + ROW_D.h + 2}
            stroke="#27272a"
            strokeWidth={1}
            opacity={0.5}
          />

          {/* ═══ ROW B: Week Timeline - Paired bars (LY gray left, TY cyan right) ═══ */}
          <g>
            {/* Side-by-side week comparison bars */}
            {(() => {
              // Use longer array for iteration
              const dataLen = Math.max(visibleBalances.length, visibleLY.length);
              if (dataLen === 0) return null;
              
              // Calculate SHARED scale for bar heights (so LY and TY are directly comparable)
              const allLYValues = visibleLY.map(ly => ly.value).filter(v => v > 0);
              const allTYValues = visibleDeltas.map(d => d.delta).filter(v => v > 0);
              // Use combined max/min so both bars use same scale
              const allValues = [...allLYValues, ...allTYValues];
              const maxVal = Math.max(...allValues, 1);
              const minVal = Math.min(...allValues.filter(v => v > 0), 0);
              const valRange = maxVal - minVal || 1;
              
              const minH = 3;
              const maxH = 14;
              const blockBottom = ROW_B.y - 2;
              
              return Array.from({ length: dataLen }, (_, i) => {
                const x = getDataX(i, dataLen);
                // Each pair takes up space, with gap between pairs
                const pairW = Math.max(6, DATA_WIDTH / dataLen * 0.6);
                const barW = pairW / 2 - 1; // Each bar is half, minus gap
                const gapBetween = 1;
                
                const lyBarX = x - pairW / 2;
                const tyBarX = x - pairW / 2 + barW + gapBetween;
                
                // LY bar height (using shared scale)
                const lyItem = visibleLY[i];
                const lyVal = lyItem ? lyItem.value : 0;
                const lyPct = valRange > 0 ? (lyVal - minVal) / valRange : 0;
                const lyH = minH + (lyPct * (maxH - minH));
                
                // TY bar height - use actual weekly sales, same shared scale
                const tyActualItem = weeklyActualSales?.[windowStart + i];
                const tyVal = tyActualItem?.hasData ? tyActualItem.value : 0;
                const tyPct = valRange > 0 ? (tyVal - minVal) / valRange : 0;
                const tyH = tyVal > 0 ? minH + (tyPct * (maxH - minH)) : 0;
                
                // Date label - adaptive based on zoom level
                const dateStr = lyItem ? getDateStr(lyItem) : (tyActualItem ? tyActualItem.weekEnd : '');
                const [year, month, day] = dateStr ? dateStr.split('-').map(Number) : [0, 0, 0];
                
                // For ALL view with lots of data, show year labels; otherwise month|day
                const isAllView = activePreset === 'ALL' && dataLen > 60;
                const labelFreq = isAllView 
                  ? Math.ceil(dataLen / 8) // ~8 labels for ALL view
                  : dataLen <= 12 ? 2 : dataLen <= 26 ? 3 : 4;
                
                // For ALL view, show label at year boundaries or spread evenly
                const prevDateStr = i > 0 ? (visibleLY[i-1] ? getDateStr(visibleLY[i-1]) : '') : '';
                const prevYear = prevDateStr ? parseInt(prevDateStr.split('-')[0]) : 0;
                const isYearStart = year !== prevYear && prevYear > 0;
                const showLabel = isAllView 
                  ? (isYearStart || i === 0 || i === dataLen - 1)
                  : (i === 0 || i === dataLen - 1 || i % labelFreq === 0);
                
                // In TODAY mode, clip at "today" position
                let lyBarWClipped = barW;
                let tyBarWClipped = barW;
                let skipLY = false;
                let skipTY = false;
                
                if (isTodayMode) {
                  const todayX = getTodayX();
                  if (lyBarX >= todayX) skipLY = true;
                  else if (lyBarX + barW > todayX) lyBarWClipped = Math.max(0, todayX - lyBarX);
                  
                  if (tyBarX >= todayX) skipTY = true;
                  else if (tyBarX + barW > todayX) tyBarWClipped = Math.max(0, todayX - tyBarX);
                  
                  if (skipLY && skipTY) return null;
                }
                
                // tyVal already has TY weekly sales from delta above
                const isHovered = hoveredWeekIdx === i;
                
                return (
                  <g 
                    key={`week-pair-${i}`}
                    onMouseEnter={() => setHoveredWeekIdx(i)}
                    onMouseLeave={() => setHoveredWeekIdx(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Invisible hit area for easier hover detection */}
                    <rect
                      x={lyBarX - 4}
                      y={blockBottom - maxH - 4}
                      width={pairW + 8}
                      height={maxH + ROW_B.h + 8}
                      fill="transparent"
                    />
                    {/* Hover highlight background - nav header style */}
                    {isHovered && (
                      <rect
                        x={lyBarX - 3}
                        y={blockBottom - maxH - 2}
                        width={pairW + 6}
                        height={maxH + 4}
                        fill="#27272a"
                        opacity={0.9}
                        rx={3}
                        stroke="#3f3f46"
                        strokeWidth={0.5}
                      />
                    )}
                    {/* PY bar (zinc, left) - more opaque */}
                    {!skipLY && lyVal > 0 && (
                      <rect
                        x={lyBarX}
                        y={blockBottom - lyH}
                        width={lyBarWClipped}
                        height={lyH}
                        fill="#71717a"
                        opacity={isHovered ? 1 : 0.85}
                        rx={1}
                      />
                    )}
                    {/* TY bar (cyan, right) - more opaque */}
                    {!skipTY && (
                      tyVal > 0 ? (
                        <rect
                          x={tyBarX}
                          y={blockBottom - tyH}
                          width={tyBarWClipped}
                          height={tyH}
                          fill="#22d3ee"
                          opacity={isHovered ? 1 : 0.9}
                          rx={1}
                        />
                      ) : (
                        <rect
                          x={tyBarX}
                          y={blockBottom - lyH}
                          width={tyBarWClipped}
                          height={lyH}
                          fill="#27272a"
                          stroke="#22d3ee"
                          strokeWidth={0.5}
                          strokeDasharray="2,2"
                          opacity={0.6}
                          rx={1}
                        />
                      )
                    )}
                    {/* Hover tooltip - rendered separately at end for z-index */}
                    {/* Date label - year for ALL view, month|day otherwise */}
                    {showLabel && month > 0 && (
                      <text
                        x={x}
                        y={ROW_B.y + 16}
                        fill={isHovered ? '#22d3ee' : '#71717a'}
                        fontSize={isAllView ? 10 : 9}
                        fontWeight={isHovered || isAllView ? 'bold' : 'normal'}
                        textAnchor="middle"
                      >
                        {isAllView ? (
                          // Year label for ALL view
                          <tspan>{year}</tspan>
                        ) : (
                          // Month|day for zoomed views
                          <>
                            <tspan>{month}</tspan>
                            <tspan fontSize={11} dy={-2}>|</tspan>
                            <tspan dy={2}>{day}</tspan>
                          </>
                        )}
                      </text>
                    )}
                  </g>
                );
              });
            })()}
            {/* Week bar tooltip moved to end of SVG for z-index */}
          </g>

          {/* TODAY needle - vertical line at actual calendar date (radio style) */}
          {/* Also supports scrubbing - click to move needle */}
          {(() => {
            const dataSource = visibleBalances.length > 0 ? visibleBalances : visibleLY;
            
            // Determine needle position - scrubbed or today
            let needleIdx: number;
            let isScrubbed = false;
            let needleX: number;
            
            if (scrubIndex !== null) {
              // Scrubbing (clicked a day) - cyan needle at scrubbed position
              needleIdx = Math.max(0, Math.min(scrubIndex - windowStart, dataSource.length - 1));
              isScrubbed = true;
              needleX = getDataX(needleIdx, dataSource.length);
            } else {
              // Not scrubbing - TODAY needle follows "today" position
              needleIdx = dataSource.findIndex(item => {
                const dateStr = getDateStr(item);
                return dateStr >= asOfDate;
              });
              if (needleIdx < 0) needleIdx = dataSource.length - 1;
              
              // In TODAY mode, needle follows today (pans with data)
              if (isTodayMode) {
                needleX = getTodayX(); // Pans right when dragging to older data
              } else {
                needleX = getDataX(needleIdx, dataSource.length);
              }
            }
            
            if (needleIdx < 0) needleIdx = dataSource.length - 1;
            
            // Get date info for needle label
            // In TODAY mode (not scrubbing): show actual current date in MST
            // When scrubbing: show the scrubbed data point's date
            let needleDate: string;
            if (isScrubbed) {
              const scrubItem = dataSource[needleIdx];
              needleDate = scrubItem ? getDateStr(scrubItem) : asOfDate;
            } else {
              // Use asOfDate from API (frozen for showcase) instead of current date
              needleDate = asOfDate;
            }
            
            return (
              <g style={{ pointerEvents: 'none' }}>
                {/* Needle glow */}
                <line
                  x1={needleX}
                  y1={ROW_A.y + ROW_A.h}
                  x2={needleX}
                  y2={ROW_D.y + ROW_D.h}
                  stroke={isScrubbed ? '#22d3ee' : '#f59e0b'}
                  strokeWidth={2}
                  filter={isScrubbed ? 'url(#ledGlow)' : 'url(#amberGlow)'}
                  opacity={0.8}
                />
                {/* Needle core */}
                <line
                  x1={needleX}
                  y1={ROW_A.y + ROW_A.h}
                  x2={needleX}
                  y2={ROW_D.y + ROW_D.h}
                  stroke={isScrubbed ? '#67e8f9' : '#fcd34d'}
                  strokeWidth={1}
                  opacity={1}
                />
                {/* Date label (M|D) - month name is in Row A markers */}
                <text
                  x={needleX}
                  y={ROW_A.y + 28}
                  fill={isScrubbed ? '#22d3ee' : '#f59e0b'}
                  fontSize={9}
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ transform: isMobile ? 'scaleX(1.8)' : 'none', transformOrigin: `${needleX}px ${ROW_A.y + 28}px` }}
                >
                  {parseInt(needleDate.split('-')[1], 10)}|{parseInt(needleDate.split('-')[2], 10)}
                </text>
                {/* Triangle pointer */}
                <polygon
                  points={`${needleX - 4},${ROW_A.y + ROW_A.h} ${needleX + 4},${ROW_A.y + ROW_A.h} ${needleX},${ROW_A.y + ROW_A.h + 6}`}
                  fill={isScrubbed ? '#22d3ee' : '#f59e0b'}
                />
              </g>
            );
          })()}

          {/* LINE ENDPOINT DOTS - rendered last to appear above needle */}
          <g style={{ pointerEvents: 'none' }}>
            {/* TARGET dot */}
            {targetReserve > 0 && (
              <circle
                cx={isTodayMode && scrubIndex === null ? Math.min(getTodayX(), SVG_W) : SVG_W - 8}
                cy={ROW_C.y + safeNum(normalizeBalance(targetReserve, ROW_C.h), 0)}
                r={3}
                fill="#8b5cf6"
              />
            )}
            {/* NUT dot - render when monthlyNut > 0 */}
            {monthlyNut > 0 && (
              <circle
                cx={isTodayMode && scrubIndex === null ? Math.min(getTodayX(), SVG_W) : SVG_W - 8}
                cy={ROW_C.y + safeNum(normalizeBalance(monthlyNut, ROW_C.h), ROW_C.h / 2)}
                r={3}
                fill="#f59e0b"
              />
            )}
            {/* FLOOR dot */}
            {operatingFloor > 0 && (
              <circle
                cx={isTodayMode && scrubIndex === null ? Math.min(getTodayX(), SVG_W) : SVG_W - 8}
                cy={ROW_C.y + safeNum(normalizeBalance(operatingFloor, ROW_C.h), ROW_C.h)}
                r={3}
                fill="#ef4444"
              />
            )}
            {/* EST dot */}
            {visibleEstBalance.length > 1 && (
              <circle
                cx={getDataX(visibleEstBalance.length - 1, visibleEstBalance.length)}
                cy={ROW_C.y + safeNum(normalizeBalance(visibleEstBalance[visibleEstBalance.length - 1].balance, ROW_C.h), ROW_C.h / 2)}
                r={3}
                fill="#a1a1aa"
              />
            )}
            {/* NOW dot */}
            {visibleBalances.length >= 1 && (
              <circle
                cx={getDataX(visibleBalances.length - 1, visibleBalances.length)}
                cy={ROW_C.y + safeNum(normalizeBalance(visibleBalances[visibleBalances.length - 1].balance, ROW_C.h), ROW_C.h / 2)}
                r={3}
                fill="#22d3ee"
              />
            )}
          </g>

        </svg>
        
        {/* Tooltip state passed to portal below */}


        {/* TODAY Mode Info Overlay - positioned to the RIGHT of needle, compact for mobile */}
        {isTodayMode && (() => {
          const todayX = getTodayX();
          const todayPct = (todayX / SVG_W) * 95; // needle position as % of data area
          // Position LIVE box to the RIGHT of needle with small gap
          const liveLeft = todayPct + 8; // 8% gap to the right of needle
          
          // Hide when LIVE would be off screen (needle too far right)
          if (liveLeft > 85) return null;
          
          // Fade when near edge
          const distFromEdge = 95 - liveLeft;
          const fadeOpacity = Math.min(1, distFromEdge / 20);
          
          // Calculate additional metrics for expanded view
          const toTarget = targetReserve > 0 ? targetReserve - cashNow : 0;
          const aboveFloor = operatingFloor > 0 ? cashNow - operatingFloor : cashNow;
          
          return (
            <div
              className="absolute top-1/2 flex flex-col gap-0.5 p-2 rounded-md transition-all duration-200 ease-out cursor-pointer"
              style={{
                left: `${liveLeft}%`,
                transform: liveHovered ? 'translateY(calc(-50% - 20px))' : 'translateY(calc(-50% - 10px))',
                background: liveHovered 
                  ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.25) 0%, rgba(139, 92, 246, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: liveHovered ? '1px solid rgba(34, 211, 238, 0.5)' : '1px solid rgba(34, 211, 238, 0.35)',
                backdropFilter: 'blur(12px)',
                boxShadow: liveHovered ? '0 0 30px rgba(34, 211, 238, 0.25)' : '0 0 20px rgba(34, 211, 238, 0.15)',
                opacity: fadeOpacity,
                maxWidth: liveHovered ? '160px' : '110px',
                zIndex: liveHovered ? 50 : 10,
              }}
              onMouseEnter={() => setLiveHovered(true)}
              onMouseLeave={() => setLiveHovered(false)}
            >
              <div className="text-[8px] uppercase tracking-[0.15em] text-cyan-400 font-semibold">
                ● LIVE
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[8px] text-zinc-500 uppercase">Cash</span>
                <span className="text-sm font-bold text-cyan-300" style={{ textShadow: '0 0 8px rgba(34, 211, 238, 0.5)' }}>
                  ${cashNow.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[8px] text-zinc-500 uppercase">Safe</span>
                <span className="text-xs font-semibold text-emerald-400">
                  ${safeToSpend.toLocaleString()}
                </span>
              </div>
              {/* Expanded details on hover */}
              {liveHovered && (
                <div className="mt-1 pt-1 border-t border-cyan-500/20 space-y-0.5">
                  {operatingFloor > 0 && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[7px] text-zinc-500 uppercase">Above Floor</span>
                      <span className={`text-[10px] font-medium ${aboveFloor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${aboveFloor.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {targetReserve > 0 && toTarget > 0 && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[7px] text-zinc-500 uppercase">To Target</span>
                      <span className="text-[10px] font-medium text-violet-400">
                        ${toTarget.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[7px] text-zinc-500 uppercase">Velocity</span>
                    <span className={`text-[10px] font-medium ${velocity >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {velocity >= 0 ? '+' : ''}${Math.round(velocity)}/day
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        </div>{/* Close 95% DATA AREA */}
        
        {/* 5% FINANCIAL SCALE - right side (left-justified, weighted positions) */}
        <div 
          className="relative pl-1"
          style={{ width: '5%', minWidth: '44px', borderLeft: '1px solid rgba(245, 158, 11, 0.1)' }}
        >
          {(() => {
            // Map SVG coordinates to container pixels (container=300px, SVG_H=180)
            const containerHeight = 300;
            const svgToContainer = (svgY: number) => (svgY / SVG_H) * containerHeight;
            const getY = (val: number) => svgToContainer(ROW_C.y + normalizeBalance(val, ROW_C.h));
            
            // Show scale labels based on actual balanceScale range
            const { min, max } = balanceScale;
            const mid = min + (max - min) * 0.5;
            const q1 = min + (max - min) * 0.25;
            const q3 = min + (max - min) * 0.75;
            
            return (
              <>
                <div className="absolute text-[10px] font-medium text-zinc-400 left-1" style={{ top: getY(max) - 6 }}>{Math.round(max / 1000)}K</div>
                <div className="absolute text-[10px] font-medium text-zinc-400 left-1" style={{ top: getY(q3) - 6 }}>{Math.round(q3 / 1000)}K</div>
                <div className="absolute text-[10px] font-medium text-zinc-400 left-1" style={{ top: getY(mid) - 6 }}>{Math.round(mid / 1000)}K</div>
                <div className="absolute text-[10px] font-medium text-zinc-400 left-1" style={{ top: getY(q1) - 6 }}>{Math.round(q1 / 1000)}K</div>
                <div className="absolute text-[10px] font-medium text-zinc-400 left-1" style={{ top: getY(min) - 6 }}>{Math.round(min / 1000)}K</div>
              </>
            );
          })()}
        </div>
      </div>{/* Close flex container */}

      {/* Preset Buttons */}
      <div
        className="flex items-center justify-center gap-2 py-2.5 mt-1 rounded-b-lg"
        style={{
          background: 'linear-gradient(180deg, #0a0a0a 0%, #0f1419 100%)',
          borderTop: '1px solid rgba(245, 158, 11, 0.1)',
        }}
      >
        {/* TODAY button - first (most focused view) */}
        <button
          onClick={() => handlePresetClick('TODAY')}
          className={`
            px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider
            transition-all duration-200
            ${activePreset === 'TODAY'
              ? 'bg-cyan-500/25 text-cyan-400 ring-1 ring-cyan-500/40'
              : 'bg-zinc-800/60 text-zinc-500 hover:text-cyan-300 hover:bg-zinc-700/60'
            }
          `}
        >
          TODAY
        </button>
        {(['2M', '3M', '6M', 'YTD', 'ALL'] as PresetKey[]).map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={`
              px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider
              transition-all duration-200
              ${activePreset === preset
                ? 'bg-amber-500/25 text-amber-400 ring-1 ring-amber-500/40'
                : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60'
              }
            `}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* ═══ UNIFIED TOOLTIP - Absolute under week bars, high z-index ═══ */}
      {(hoveredDeltaIdx !== null || hoveredWeekIdx !== null) && (() => {
        const idx = hoveredWeekIdx ?? hoveredDeltaIdx;
        if (idx === null) return null;
        
        const dataLen = Math.max(visibleBalances.length, visibleLY.length, visibleDeltas.length);
        // Use same positioning logic as the bars - getDataX returns SVG x coordinate
        const barX = getDataX(idx, dataLen);
        // Convert SVG x to percentage of container (SVG_W = 600, but we're in 95% data area)
        const xPct = (barX / SVG_W) * 100;
        
        const lyItem = visibleLY[idx];
        const lyVal = lyItem ? lyItem.value : 0;
        // Use weeklyActualSales for TY if available, otherwise fall back to deltas
        const actualSalesItem = weeklyActualSales?.[windowStart + idx];
        const tyVal = actualSalesItem?.hasData ? actualSalesItem.value : 0;
        const dateStr = lyItem ? getDateStr(lyItem) : (actualSalesItem ? actualSalesItem.weekEnd : '');
        const [, month, day] = dateStr ? dateStr.split('-').map(Number) : [0, 0, 0];
        const vsLY = tyVal - lyVal;
        
        const prevActualItem = weeklyActualSales?.[windowStart + idx - 1];
        const prevTyVal = prevActualItem?.hasData ? prevActualItem.value : 0;
        const wow = tyVal - prevTyVal;
        
        return (
          <div 
            className="absolute pointer-events-none"
            style={{ 
              left: `${Math.max(10, Math.min(xPct, 90))}%`,
              top: 'calc(100% - 48px)',
              transform: 'translateX(-50%)',
              zIndex: 9999,
            }}
          >
            <div className="bg-zinc-950 border border-cyan-500/40 rounded-lg px-4 py-2.5 shadow-2xl">
              <div className="text-zinc-400 text-[11px] text-center mb-1.5 font-medium tracking-wide">
                WEEK {month}/{day}
              </div>
              <div className="flex gap-5 text-center">
                <div>
                  <div className="text-zinc-500 text-[9px]">PY</div>
                  <div className="text-zinc-300 text-sm font-semibold">${Math.round(lyVal / 1000)}k</div>
                </div>
                <div>
                  <div className="text-cyan-500 text-[9px]">TY</div>
                  <div className="text-cyan-400 text-sm font-semibold">${Math.round(tyVal / 1000)}k</div>
                </div>
                <div>
                  <div className={`text-[9px] ${vsLY >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>vs LY</div>
                  <div className={`text-sm font-semibold ${vsLY >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {vsLY >= 0 ? '+' : ''}{Math.round(vsLY / 1000)}k
                  </div>
                </div>
                <div>
                  <div className={`text-[9px] ${wow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>WoW</div>
                  <div className={`text-sm font-semibold ${wow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {wow >= 0 ? '+' : ''}{Math.round(wow / 1000)}k
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-800 mt-2 pt-2 text-[10px] text-zinc-500 grid grid-cols-2 gap-x-3 gap-y-0.5">
                <div><span className="text-zinc-400">PY</span> Prior Year</div>
                <div><span className="text-cyan-500">TY</span> This Year</div>
                <div><span className="text-zinc-400">vs LY</span> vs Last Year</div>
                <div><span className="text-zinc-400">WoW</span> Week over Week</div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
