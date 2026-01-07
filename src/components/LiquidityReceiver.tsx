'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type { WeeklyBalance, WeeklyDelta, WeeklyEstimate, ConfidenceLevel, DailyBalancePoint, InferredAnchorResult } from '@/lib/calc';
import * as calc from '@/lib/calc';

// ============================================
// TYPES
// ============================================

export interface LiquidityReceiverProps {
  balances: WeeklyBalance[];
  deltas: WeeklyDelta[];
  lyEstimates: WeeklyEstimate[];
  // Continuity V2: merged series
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
  velocity: number;
  safeToSpend: number;
  cashNow: number;
  asOfDate: string;
  confidence: ConfidenceLevel;
}

type PresetKey = 'NOW' | '6W' | '3M' | 'YTD' | '12M';

interface WindowState {
  centerWeekIndex: number;
  visibleWeeks: number;
}

// ============================================
// HELPERS
// ============================================

function formatMonthLabel(dateStr: string): string {
  if (!dateStr) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const [, month] = dateStr.split('-').map(Number);
  return months[month - 1] || '';
}

function formatStationLabel(dateStr: string): string {
  if (!dateStr) return '';
  const [, month, day] = dateStr.split('-');
  return `${parseInt(month)}|${day}`;
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================
// COMPONENT
// ============================================

export function LiquidityReceiver({
  balances,
  deltas,
  lyEstimates,
  mergedBalanceSeries,
  actualBalanceSeries,
  anchor,
  continuityStats,
  operatingFloor,
  targetReserve,
  velocity,
  safeToSpend,
  cashNow,
  asOfDate,
  confidence,
}: LiquidityReceiverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [activePreset, setActivePreset] = useState<PresetKey>('NOW');
  
  // Window state: use lyEstimates as primary (always has data from ReferenceMonth)
  // Fall back to balances if lyEstimates is empty
  const totalWeeks = Math.max(lyEstimates.length, balances.length, 1);
  const [window, setWindow] = useState<WindowState>({
    centerWeekIndex: totalWeeks - 1, // Start at NOW
    visibleWeeks: Math.min(8, totalWeeks), // Default visible weeks in tuning window
  });

  // Preset configurations
  const presets: Record<PresetKey, { label: string; weeksBack: number; visibleWeeks: number }> = {
    'NOW': { label: '1', weeksBack: 0, visibleWeeks: Math.min(8, totalWeeks) },
    '6W': { label: '2', weeksBack: Math.min(6, totalWeeks - 1), visibleWeeks: Math.min(8, totalWeeks) },
    '3M': { label: '3', weeksBack: Math.min(13, totalWeeks - 1), visibleWeeks: Math.min(16, totalWeeks) },
    'YTD': { label: '4', weeksBack: Math.min(52, totalWeeks - 1), visibleWeeks: Math.min(24, totalWeeks) },
    '12M': { label: '5', weeksBack: Math.min(52, totalWeeks - 1), visibleWeeks: Math.min(52, totalWeeks) },
  };

  // Calculate window bounds
  const windowStart = Math.max(0, window.centerWeekIndex - Math.floor(window.visibleWeeks / 2));
  const windowEnd = Math.min(totalWeeks - 1, windowStart + window.visibleWeeks - 1);
  const visibleBalances = balances.slice(windowStart, Math.min(windowEnd + 1, balances.length));
  const visibleDeltas = deltas.slice(windowStart, Math.min(windowEnd + 1, deltas.length));
  const visibleLY = lyEstimates.slice(windowStart, Math.min(windowEnd + 1, lyEstimates.length));

  // Calculate scale for balance lane (use LY estimates if no balances)
  const balanceRange = useMemo(() => {
    // Prefer balance data if available
    if (visibleBalances.length > 0) {
      const values = visibleBalances.map(b => b.balance);
      const min = Math.min(...values, operatingFloor || 0);
      const max = Math.max(...values, targetReserve || 100000);
      const padding = (max - min) * 0.1 || 10000;
      return { min: min - padding, max: max + padding };
    }
    // Fall back to LY estimates for scale
    if (visibleLY.length > 0) {
      const values = visibleLY.map(ly => ly.value);
      const min = Math.min(...values, 0);
      const max = Math.max(...values, 50000);
      const padding = (max - min) * 0.1 || 5000;
      return { min: min - padding, max: max + padding };
    }
    return { min: 0, max: 100000 };
  }, [visibleBalances, visibleLY, operatingFloor, targetReserve]);

  // Calculate scale for delta lane
  const deltaRange = useMemo(() => {
    if (visibleDeltas.length === 0) return { max: 5000 };
    const maxAbs = Math.max(...visibleDeltas.map(d => Math.abs(d.delta)), 1000);
    return { max: maxAbs };
  }, [visibleDeltas]);

  // Handle preset click
  const handlePresetClick = (key: PresetKey) => {
    setActivePreset(key);
    const preset = presets[key];
    const targetIndex = totalWeeks - 1 - preset.weeksBack;
    setWindow({
      centerWeekIndex: Math.max(Math.floor(preset.visibleWeeks / 2), targetIndex),
      visibleWeeks: preset.visibleWeeks,
    });
  };

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const deltaX = e.clientX - dragStartX;
    const containerWidth = containerRef.current.offsetWidth;
    const weekWidth = containerWidth / window.visibleWeeks;
    const weeksDelta = Math.round(deltaX / weekWidth);
    
    if (weeksDelta !== 0) {
      setDragStartX(e.clientX);
      setWindow(prev => ({
        ...prev,
        centerWeekIndex: Math.max(
          Math.floor(prev.visibleWeeks / 2),
          Math.min(totalWeeks - 1 - Math.floor(prev.visibleWeeks / 2), prev.centerWeekIndex - weeksDelta)
        ),
      }));
      setActivePreset('NOW'); // Clear preset when manually dragging
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Sync window state when data changes
  useEffect(() => {
    if (totalWeeks > 0) {
      setWindow(prev => ({
        ...prev,
        centerWeekIndex: Math.min(prev.centerWeekIndex, totalWeeks - 1),
        visibleWeeks: Math.min(prev.visibleWeeks, totalWeeks),
      }));
    }
  }, [totalWeeks]);

  // Window change effect removed - using continuity series instead

  // Normalize value to SVG y coordinate
  const normalizeBalance = (value: number, height: number): number => {
    const { min, max } = balanceRange;
    const range = max - min;
    if (range === 0) return height / 2;
    return height - ((value - min) / range) * height;
  };

  const normalizeDelta = (value: number, height: number): number => {
    const { max } = deltaRange;
    const normalized = (value / max) * (height / 2);
    return height / 2 - normalized; // Center baseline
  };

  // Calculate threshold positions
  const floorY = normalizeBalance(operatingFloor, 60);
  const targetY = normalizeBalance(targetReserve, 60);

  // Check if current week is in view
  const nowWeekIndex = totalWeeks - 1;
  const nowInView = nowWeekIndex >= windowStart && nowWeekIndex <= windowEnd;
  const visibleWeekCount = windowEnd - windowStart + 1;
  const nowPosition = nowInView && visibleWeekCount > 0 
    ? ((nowWeekIndex - windowStart) / visibleWeekCount) * 100 
    : null;

  // Confidence dimming - clamp minimum so chart is always visible
  const dialOpacity = Math.max(0.75, confidence === 'HIGH' ? 1 : confidence === 'MEDIUM' ? 0.85 : 0.75);

  // Debug flag (toggle to true to show debug overlay)
  const showDebug = process.env.NODE_ENV === 'development' && true;

  // Use LY data for station labels if no balances
  const stationData = visibleBalances.length > 0 ? visibleBalances : visibleLY;

  // Calculate min/max for debug and scaling
  const balMin = visibleBalances.length > 0 ? Math.min(...visibleBalances.map(b => b.balance)) : 0;
  const balMax = visibleBalances.length > 0 ? Math.max(...visibleBalances.map(b => b.balance)) : 0;
  const deltaMin = visibleDeltas.length > 0 ? Math.min(...visibleDeltas.map(d => d.delta)) : 0;
  const deltaMax = visibleDeltas.length > 0 ? Math.max(...visibleDeltas.map(d => d.delta)) : 0;
  const refMin = visibleLY.length > 0 ? Math.min(...visibleLY.map(ly => ly.value)) : 0;
  const refMax = visibleLY.length > 0 ? Math.max(...visibleLY.map(ly => ly.value)) : 0;

  // Normalize REF to its own 0-1 lane (not cash axis)
  const normalizeRef = (val: number, laneHeight: number): number => {
    const range = refMax - refMin;
    if (range === 0) return laneHeight / 2;
    return laneHeight - ((val - refMin) / range) * laneHeight;
  };

  // Get zone color for balance value
  const getBalanceColor = (val: number): string => {
    if (operatingFloor > 0 && val < operatingFloor) return '#ef4444'; // red - below floor
    if (targetReserve > 0 && val >= targetReserve) return '#10b981'; // emerald - above target
    return '#22d3ee'; // cyan - between
  };

  // SVG dimensions
  const SVG_W = 400;
  const RAIL_TOP = { y: 0, h: 20 };      // Station ticks rail
  const RAIL_BAL = { y: 20, h: 45 };     // Balance lane
  const RAIL_DEL = { y: 68, h: 30 };     // Delta lane
  const SVG_H = 100;

  // NOW needle is always at 50% (center)
  const needleX = SVG_W / 2;

  return (
    <div className="relative">
      {/* Debug overlay */}
      {showDebug && (
        <div className="absolute -top-32 left-0 right-0 bg-zinc-900/95 text-[8px] font-mono text-cyan-400 p-2 rounded z-50 border border-cyan-800/50">
          <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
            <div>bal: {balances.length} | vis: {visibleBalances.length}</div>
            <div>del: {deltas.length} | vis: {visibleDeltas.length}</div>
            <div>ref: {lyEstimates.length} | vis: {visibleLY.length}</div>
            <div>balMin: {balMin.toFixed(0)}</div>
            <div>balMax: {balMax.toFixed(0)}</div>
            <div>cashNow: {cashNow.toFixed(0)}</div>
            <div>delMin: {deltaMin.toFixed(0)}</div>
            <div>delMax: {deltaMax.toFixed(0)}</div>
            <div>range: {balanceRange.min.toFixed(0)}-{balanceRange.max.toFixed(0)}</div>
            <div>refMin: {refMin.toFixed(0)}</div>
            <div>refMax: {refMax.toFixed(0)}</div>
            <div>preset: {activePreset}</div>
            <div>window: [{windowStart}, {windowEnd}]</div>
            <div>total: {totalWeeks}</div>
            <div>asOf: {asOfDate}</div>
            <div className="text-amber-400">merged: {continuityStats.mergedCount}</div>
            <div className="text-amber-400">actual: {continuityStats.actualCount}</div>
            <div className="text-amber-400">anchor: {anchor.isInferred ? 'inferred' : 'user'}</div>
          </div>
        </div>
      )}

      {/* Dial container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg cursor-grab active:cursor-grabbing select-none"
        style={{
          background: 'linear-gradient(180deg, #050505 0%, #0a0f14 50%, #050505 100%)',
          border: '1px solid rgba(34, 211, 238, 0.15)',
          boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.7)',
          opacity: dialOpacity,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Main dial area - 3 stacked rails */}
        <div className="relative h-40 px-1">
          {/* SVG Visualization - Radio Dial with stacked rails */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="cyanGlow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="nowGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* ═══ RAIL 1: Station Ticks (top) ═══ */}
            <g>
              {/* Rail background line */}
              <line x1={0} y1={RAIL_TOP.h} x2={SVG_W} y2={RAIL_TOP.h} stroke="#27272a" strokeWidth={0.5} />
              
              {/* Dense tick marks for visible weeks */}
              {stationData.map((item, i) => {
                const x = (i / Math.max(1, stationData.length - 1)) * (SVG_W - 20) + 10;
                const dateStr = getDateStr(item);
                const [, month, day] = dateStr.split('-').map(Number);
                const isMonthStart = day <= 7;
                const isWeekTick = i % 1 === 0;
                
                return (
                  <g key={`tick-${i}`}>
                    {/* Weekly tick */}
                    <line
                      x1={x}
                      y1={isMonthStart ? 2 : 8}
                      x2={x}
                      y2={RAIL_TOP.h}
                      stroke={isMonthStart ? '#22d3ee' : '#3f3f46'}
                      strokeWidth={isMonthStart ? 1.5 : 0.5}
                      opacity={isMonthStart ? 0.8 : 0.4}
                    />
                    {/* Month label for month starts */}
                    {isMonthStart && (
                      <text
                        x={x}
                        y={8}
                        fill="#22d3ee"
                        fontSize={6}
                        fontWeight="bold"
                        textAnchor="middle"
                        opacity={0.9}
                      >
                        {formatMonthLabel(dateStr)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* ═══ RAIL 2: Balance Lane (middle) ═══ */}
            <g>
              {/* Lane separator */}
              <line x1={0} y1={RAIL_BAL.y} x2={SVG_W} y2={RAIL_BAL.y} stroke="#27272a" strokeWidth={0.5} opacity={0.3} />
              <line x1={0} y1={RAIL_BAL.y + RAIL_BAL.h} x2={SVG_W} y2={RAIL_BAL.y + RAIL_BAL.h} stroke="#27272a" strokeWidth={0.5} opacity={0.3} />
              
              {/* Floor threshold line */}
              {operatingFloor > 0 && (
                <line
                  x1={0}
                  y1={RAIL_BAL.y + safeNum(normalizeBalance(operatingFloor, RAIL_BAL.h), RAIL_BAL.h)}
                  x2={SVG_W}
                  y2={RAIL_BAL.y + safeNum(normalizeBalance(operatingFloor, RAIL_BAL.h), RAIL_BAL.h)}
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  opacity={0.4}
                />
              )}
              
              {/* Target threshold line */}
              {targetReserve > 0 && (
                <line
                  x1={0}
                  y1={RAIL_BAL.y + safeNum(normalizeBalance(targetReserve, RAIL_BAL.h), 0)}
                  x2={SVG_W}
                  y2={RAIL_BAL.y + safeNum(normalizeBalance(targetReserve, RAIL_BAL.h), 0)}
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  opacity={0.4}
                />
              )}

              {/* REF Ghost layer - violet, in its own normalized space */}
              {visibleLY.length > 0 && (
                <path
                  d={visibleLY.map((ly, i) => {
                    const x = (i / Math.max(1, visibleLY.length - 1)) * (SVG_W - 20) + 10;
                    const y = RAIL_BAL.y + safeNum(normalizeRef(ly.value, RAIL_BAL.h), RAIL_BAL.h / 2);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  strokeDasharray="2,3"
                  opacity={0.5}
                />
              )}

              {/* ═══ CONTINUITY V2: Merged Balance Line ═══ */}
              {mergedBalanceSeries.length > 1 && (
                <path
                  d={mergedBalanceSeries.map((pt: DailyBalancePoint, i: number) => {
                    const x = (i / Math.max(1, mergedBalanceSeries.length - 1)) * (SVG_W - 20) + 10;
                    const y = RAIL_BAL.y + safeNum(normalizeBalance(pt.balance, RAIL_BAL.h), RAIL_BAL.h / 2);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                  opacity={0.4}
                />
              )}

              {/* Balance LED ticks - vertical bars per data point (ACTUAL overrides EST) */}
              {visibleBalances.map((b, i) => {
                const x = (i / Math.max(1, visibleBalances.length - 1)) * (SVG_W - 20) + 10;
                const y = RAIL_BAL.y + safeNum(normalizeBalance(b.balance, RAIL_BAL.h), RAIL_BAL.h / 2);
                const color = getBalanceColor(b.balance);
                const barH = 8;
                
                return (
                  <rect
                    key={`bal-${i}`}
                    x={x - 2}
                    y={y - barH / 2}
                    width={4}
                    height={barH}
                    fill={color}
                    opacity={Math.max(0.35, b.isEstimate ? 0.5 : 0.85)}
                    rx={1}
                    filter="url(#cyanGlow)"
                  />
                );
              })}

              {/* cashNow marker - brighter, at rightmost position */}
              {visibleBalances.length > 0 && (
                <circle
                  cx={(SVG_W - 20) + 10}
                  cy={RAIL_BAL.y + safeNum(normalizeBalance(cashNow, RAIL_BAL.h), RAIL_BAL.h / 2)}
                  r={5}
                  fill={getBalanceColor(cashNow)}
                  stroke="#fff"
                  strokeWidth={1}
                  opacity={0.9}
                  filter="url(#cyanGlow)"
                />
              )}
            </g>

            {/* ═══ RAIL 3: Delta Lane (bottom) ═══ */}
            <g>
              {/* Baseline at center of delta lane */}
              <line
                x1={0}
                y1={RAIL_DEL.y + RAIL_DEL.h / 2}
                x2={SVG_W}
                y2={RAIL_DEL.y + RAIL_DEL.h / 2}
                stroke="#3f3f46"
                strokeWidth={0.5}
              />
              
              {/* Delta bars */}
              {visibleDeltas.map((d, i) => {
                const x = (i / Math.max(1, visibleDeltas.length - 1)) * (SVG_W - 20) + 10;
                const maxBarH = RAIL_DEL.h / 2 - 2;
                const barH = Math.max(2, (Math.abs(d.delta) / Math.max(deltaRange.max, 1)) * maxBarH);
                const isPositive = d.delta >= 0;
                const baseline = RAIL_DEL.y + RAIL_DEL.h / 2;
                const y = isPositive ? baseline - barH : baseline;
                
                // Color by magnitude: red → amber → cyan
                const magnitude = Math.abs(d.delta) / Math.max(deltaRange.max, 1);
                let color = '#22d3ee'; // cyan
                if (magnitude < 0.33) color = '#ef4444'; // red (low)
                else if (magnitude < 0.66) color = '#f59e0b'; // amber (mid)
                
                return (
                  <rect
                    key={`delta-${i}`}
                    x={x - 2}
                    y={y}
                    width={4}
                    height={barH}
                    fill={d.hasData ? color : '#27272a'}
                    opacity={d.hasData ? 0.7 : 0.2}
                    rx={1}
                  />
                );
              })}
            </g>

            {/* ═══ NOW NEEDLE - always at center (50%) ═══ */}
            <line
              x1={needleX}
              y1={0}
              x2={needleX}
              y2={SVG_H}
              stroke="#f59e0b"
              strokeWidth={2}
              filter="url(#nowGlow)"
              opacity={0.9}
            />
            <line
              x1={needleX}
              y1={0}
              x2={needleX}
              y2={SVG_H}
              stroke="#fcd34d"
              strokeWidth={0.5}
              opacity={1}
            />
          </svg>

          {/* REF label */}
          {visibleLY.length > 0 && (
            <div
              className="absolute top-6 left-1 text-[6px] uppercase tracking-wider px-1 rounded"
              style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }}
            >
              REF 2025
            </div>
          )}

          {/* Continuity Mode label */}
          {anchor.isInferred && (
            <div
              className="absolute top-6 right-1 text-[6px] uppercase tracking-wider px-1 rounded"
              style={{ color: '#22d3ee', background: 'rgba(34, 211, 238, 0.1)' }}
            >
              EST
            </div>
          )}

          {/* Lane labels (right side) */}
          <div className="absolute right-1 top-12 text-[6px] text-zinc-600 uppercase">BAL</div>
          <div className="absolute right-1 top-24 text-[6px] text-zinc-600 uppercase">Δ</div>
        </div>

        {/* Preset buttons */}
        <div
          className="flex items-center justify-center gap-2 py-2 border-t"
          style={{
            borderColor: 'rgba(34, 211, 238, 0.1)',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #0f1419 100%)',
          }}
        >
          {(Object.entries(presets) as [PresetKey, typeof presets[PresetKey]][]).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetClick(key)}
              className={`
                w-6 h-6 rounded-full text-[10px] font-mono font-bold
                transition-all duration-200
                ${activePreset === key
                  ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50'
                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                }
              `}
              title={key}
            >
              {preset.label}
            </button>
          ))}
          
          {/* NOW snap button */}
          <button
            onClick={() => handlePresetClick('NOW')}
            className={`
              ml-2 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-medium
              transition-all duration-200
              ${activePreset === 'NOW'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-zinc-800/50 text-zinc-500 hover:text-amber-400'
              }
            `}
          >
            NOW
          </button>
        </div>
      </div>

      {/* Confidence indicator - top right outside dial */}
      {confidence !== 'HIGH' && (
        <div className="absolute -top-2 right-0 px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wider bg-amber-500/20 text-amber-500 z-20">
          EST
        </div>
      )}
    </div>
  );
}
