'use client';

import { Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { LiquidityReceiverV3 } from './LiquidityReceiverV3';
import type { ConfidenceLevel, WeeklyBalance, WeeklyDelta, WeeklyEstimate, DailyBalancePoint, InferredAnchorResult } from '@/lib/calc';

interface LiquidityCardProps {
  hasSnapshot: boolean;
  snapshotAmount: number | null;
  snapshotAsOf: string | null;
  cashNow: number;
  changeSince: number;
  isEstimate: boolean;
  runwayPct: number | null;
  monthlyFixedNut: number;
  asOfDate: string;
  confidenceLevel: ConfidenceLevel;
  // Liquidity Receiver data
  liquidityReceiver: {
    balances: WeeklyBalance[];
    deltas: WeeklyDelta[];
    lyEstimates: WeeklyEstimate[];
    weeklyActualSales?: Array<{ weekEnd: string; value: number; hasData: boolean }>;
    // Continuity V2
    estBalanceSeries: DailyBalancePoint[];
    actualBalanceSeries: DailyBalancePoint[];
    mergedBalanceSeries: DailyBalancePoint[];
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
    survivalGoal: number;
    aboveFloor: number;
    toTarget: number;
    yearStartCashAmount: number | null;
    yearStartCashDate: string;
    // Additional metrics
    dailyBurn?: number;
    runwayDays?: number | null;
    nutCoverage?: number;
    wowChange?: { amount: number; percent: number } | null;
    avgDailySales?: number;
    bestWorst?: { best: { value: number; week: string }; worst: { value: number; week: string } } | null;
    marginTrend?: { direction: 'up' | 'down' | 'flat'; change: number };
    // Capital tracking
    capitalSeries?: Array<{ weekEnd: string; capital: number }>;
    totalCapitalInvested?: number;
    cashInjections?: Array<{ date: string; amount: number; note: string | null }>;
    // NUT history series
    nutSeries?: Array<{ weekEnd: string; nut: number }>;
    nutSnapshots?: Array<{ effectiveDate: string; amount: number; note: string | null }>;
  };
  onSetSnapshot?: () => void;
  timezone?: string;
}

export function LiquidityCard({
  hasSnapshot,
  snapshotAmount,
  snapshotAsOf,
  cashNow,
  changeSince,
  isEstimate,
  runwayPct,
  monthlyFixedNut,
  asOfDate,
  confidenceLevel,
  liquidityReceiver,
  onSetSnapshot,
  timezone,
}: LiquidityCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRunwayTip, setShowRunwayTip] = useState(false);
  const [activeBurnTip, setActiveBurnTip] = useState<string | null>(null);
  const [activeCashTip, setActiveCashTip] = useState<string | null>(null);
  const [activeFooterTip, setActiveFooterTip] = useState<string | null>(null);
  const burnTipRef = useRef<HTMLDivElement>(null);
  const cashTipRef = useRef<HTMLDivElement>(null);
  const footerTipRef = useRef<HTMLDivElement>(null);

  // Close burn tooltip when clicking outside
  useEffect(() => {
    if (!activeBurnTip) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (burnTipRef.current && !burnTipRef.current.contains(e.target as Node)) {
        setActiveBurnTip(null);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeBurnTip]);
  
  // Close cash tooltip when clicking outside
  useEffect(() => {
    if (!activeCashTip) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (cashTipRef.current && !cashTipRef.current.contains(e.target as Node)) {
        setActiveCashTip(null);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeCashTip]);
  
  // Close footer tooltip when clicking outside
  useEffect(() => {
    if (!activeFooterTip) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (footerTipRef.current && !footerTipRef.current.contains(e.target as Node)) {
        setActiveFooterTip(null);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeFooterTip]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Empty state when no snapshot
  if (!hasSnapshot) {
    return (
      <section className="mb-8">
        <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/60 to-zinc-950/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Liquidity</h3>
            </div>
          </div>
          <div className="text-center py-6">
            <p className="text-zinc-600 text-sm mb-3">No cash snapshot set</p>
            <button
              onClick={onSetSnapshot}
              className="text-sm font-medium text-cyan-500 hover:text-cyan-400 transition-colors underline underline-offset-2"
            >
              Set cash snapshot
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/60 to-zinc-950/60 p-3 md:p-5 backdrop-blur-sm">
        {/* Title row with tooltip */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Liquidity</h3>
            <div className="relative">
              <button
                onClick={() => setShowTooltip(!showTooltip)}
                className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <Info className="h-3 w-3" />
              </button>
              {showTooltip && (
                <div className="absolute left-0 top-6 z-10 w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-400 shadow-lg">
                  Cash on hand = snapshot + net sales - logged expenses (to asOfDate). Logged-only. No bank access.
                  <button
                    onClick={() => setShowTooltip(false)}
                    className="absolute top-1 right-1 text-zinc-500 hover:text-zinc-300"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Runway indicator - top right with tooltip */}
          <div className="text-right relative">
            {runwayPct !== null && monthlyFixedNut > 0 ? (
              <>
                <span 
                  className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowRunwayTip(!showRunwayTip)}
                >
                  <span className="text-zinc-500">Runway: </span>
                  <span className={runwayPct >= 1 ? 'text-cyan-400' : runwayPct >= 0.5 ? 'text-amber-400' : 'text-red-400'}>
                    {Math.round(runwayPct * 100)}%
                  </span>
                  {isEstimate && <span className="ml-1 text-amber-500">(est)</span>}
                </span>
                {showRunwayTip && (
                  <div className="absolute right-0 top-6 z-10 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-400 shadow-lg">
                    <div className="font-medium text-zinc-300 mb-2">Runway Coverage: {Math.round(runwayPct * 100)}%</div>
                    <div className="space-y-1">
                      <div>Cash on Hand: <span className="text-zinc-300">${cashNow.toLocaleString()}</span></div>
                      <div>Monthly NUT: <span className="text-zinc-300">${monthlyFixedNut.toLocaleString()}</span></div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px]">
                      {runwayPct >= 1 ? '✓ Can cover 1+ month of fixed costs' : runwayPct >= 0.5 ? '⚠ Can cover ~2 weeks of fixed costs' : '⚠ Low coverage - needs attention'}
                    </div>
                    <button
                      onClick={() => setShowRunwayTip(false)}
                      className="absolute top-1 right-1 text-zinc-500 hover:text-zinc-300"
                    >
                      ×
                    </button>
                  </div>
                )}
              </>
            ) : (
              <span className="text-[9px] text-zinc-600">
                {snapshotAsOf && `snapshot: ${snapshotAsOf}`}
              </span>
            )}
          </div>
        </div>

        {/* Primary number and burn analysis - responsive grid */}
        <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Cash on hand with tooltips */}
          <div ref={cashTipRef}>
            {/* Cash tips - dynamic explanations */}
            {(() => {
              const cashTips: Record<string, string> = {
                cash: `Snapshot: ${formatCurrency(snapshotAmount ?? 0)} (as of ${snapshotAsOf ?? 'not set'})\nChange since: ${changeSince >= 0 ? '+' : ''}${formatCurrency(changeSince)}\n= ${formatCurrency(cashNow)} cash on hand\n\nThis is your snapshot + all logged net sales − expenses since that date.`,
                change: `Net change from ${snapshotAsOf ?? 'snapshot date'} to ${asOfDate}.\n\nSales logged: adds to cash\nExpenses logged: subtracts from cash\n\nCurrent change: ${changeSince >= 0 ? '+' : ''}${formatCurrency(changeSince)}`,
                target: `Target reserve: ${formatCurrency(liquidityReceiver.targetReserve)}\nCurrent cash: ${formatCurrency(cashNow)}\nGap: ${formatCurrency(liquidityReceiver.toTarget)}\n\nThis is how much more you need to reach your target reserve (set in Settings).`,
              };
              
              return (
                <>
                  {/* Cash on hand - clickable */}
                  <div className="relative">
                    {activeCashTip === 'cash' && (
                      <div className="absolute top-full left-0 mt-2 w-72 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                        <div className="absolute top-[-6px] left-8 w-3 h-3 bg-zinc-800 border-l border-t border-zinc-700 transform rotate-45"></div>
                        {cashTips.cash}
                                              </div>
                    )}
                    <div 
                      className="flex items-baseline gap-2 cursor-pointer hover:bg-zinc-800/30 px-1 rounded -ml-1"
                      onClick={() => setActiveCashTip(activeCashTip === 'cash' ? null : 'cash')}
                    >
                      <span
                        className={`text-3xl font-bold ${cashNow >= 0 ? 'text-cyan-400' : 'text-red-400'}`}
                        style={{ textShadow: `0 0 20px ${cashNow >= 0 ? '#22d3ee' : '#ef4444'}` }}
                      >
                        {formatCurrency(cashNow)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        cash on hand
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {/* Change - clickable */}
                    <div className="relative">
                      {activeCashTip === 'change' && (
                        <div className="absolute top-full left-0 mt-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                          <div className="absolute top-[-6px] left-4 w-3 h-3 bg-zinc-800 border-l border-t border-zinc-700 transform rotate-45"></div>
                          {cashTips.change}
                                                  </div>
                      )}
                      <span 
                        className="cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                        onClick={() => setActiveCashTip(activeCashTip === 'change' ? null : 'change')}
                      >
                        change:{' '}
                        <span className={changeSince >= 0 ? 'text-cyan-400' : 'text-red-400'}>
                          {changeSince >= 0 ? '+' : ''}{formatCurrency(changeSince)}
                        </span>
                      </span>
                    </div>
                    
                    {/* To target - clickable */}
                    {liquidityReceiver.targetReserve > 0 && liquidityReceiver.toTarget > 0 && (
                      <div className="relative">
                        {activeCashTip === 'target' && (
                          <div className="absolute top-full left-0 mt-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                            <div className="absolute top-[-6px] left-4 w-3 h-3 bg-zinc-800 border-l border-t border-zinc-700 transform rotate-45"></div>
                            {cashTips.target}
                                                      </div>
                        )}
                        <span 
                          className="cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                          onClick={() => setActiveCashTip(activeCashTip === 'target' ? null : 'target')}
                        >
                          to target:{' '}
                          <span className="text-zinc-400">
                            {formatCurrency(liquidityReceiver.toTarget)}
                          </span>
                        </span>
                      </div>
                    )}
                    {isEstimate && <span className="text-amber-500">(est)</span>}
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Right: Burn Analysis Panel */}
          {(() => {
            const velocity = liquidityReceiver.velocity;
            const monthlyBurn = velocity * 30.4;
            const annualGap = monthlyBurn * 12;
            const survivalGoal = liquidityReceiver.survivalGoal;
            
            // Calculate LY monthly average from lyEstimates
            const lyTotal = liquidityReceiver.lyEstimates.reduce((sum, w) => sum + w.value, 0);
            const lyMonthlyAvg = lyTotal / 12;
            const breakEvenGap = lyMonthlyAvg - survivalGoal;
            
            // Calculate days to floor (emergency fund) - always show a date
            const floor = liquidityReceiver.operatingFloor || 0;
            let floorDateStr = '—';
            let daysToFloor = 0;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            if (floor > 0) {
              if (cashNow <= floor) {
                // Already at or below floor
                floorDateStr = 'NOW (below)';
              } else if (velocity >= 0) {
                // Gaining cash or stable - floor not approaching
                floorDateStr = '∞';
              } else {
                // Actually burning cash - show real ETA
                daysToFloor = Math.ceil((cashNow - floor) / Math.abs(velocity));
                const floorDate = new Date();
                floorDate.setDate(floorDate.getDate() + daysToFloor);
                floorDateStr = `${monthNames[floorDate.getMonth()]} ${floorDate.getFullYear()}`;
              }
            }
            
            const formatCompact = (val: number) => {
              const prefix = val >= 0 ? '+' : '';
              if (Math.abs(val) >= 1000) {
                return `${prefix}$${(val / 1000).toFixed(1)}K`;
              }
              return `${prefix}$${Math.round(val)}`;
            };
            
            const effectiveBurnRate = velocity < 0 ? velocity : (breakEvenGap < 0 ? breakEvenGap / 30.4 : 0);
            const burnTips: Record<string, string> = {
              monthly: `Your actual current pace based on recent logged sales vs expenses. Velocity (${formatCompact(velocity)}/day) × 30.4 days = ${formatCompact(monthlyBurn)}/month. ${monthlyBurn >= 0 ? "You're currently gaining cash." : "You're currently losing cash."}`,
              annual: `Monthly projected over 12 months. ${formatCompact(monthlyBurn)} × 12 = ${formatCompact(annualGap)}/year. This is what happens if current velocity continues unchanged.`,
              floor: floor > 0 
                ? `Emergency floor: ${formatCurrency(floor)}\nCash now: ${formatCurrency(cashNow)}\nVelocity: ${formatCompact(velocity)}/day ${velocity >= 0 ? '(gaining)' : '(burning)'}\n\n${velocity >= 0 ? 'Floor not approaching while gaining cash.' : `At current pace, you'll hit floor in ~${daysToFloor} days (${floorDateStr}).`}`
                : `No floor set. Go to Settings to set your emergency fund threshold.`,
              gap: `LY avg monthly: ${formatCompact(lyMonthlyAvg)}\nSurvival goal: ${formatCompact(survivalGoal)}\nGap: ${formatCompact(breakEvenGap)}/mo\n\n${breakEvenGap >= 0 ? "Your LY pattern exceeds break-even. Good!" : "Your LY pattern is below break-even. You need to outperform LY to stay profitable."}`,
            };
            
            return (
              <div ref={burnTipRef} className="text-sm relative md:text-right">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Burn Analysis</div>
                
                {/* Compact two-column grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {/* Column 1: Monthly + Floor */}
                  <div className="space-y-0.5">
                    {/* Monthly */}
                    <div className="relative">
                      {activeBurnTip === 'monthly' && (
                        <div className="absolute bottom-full right-0 mb-2 w-72 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20">
                          <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                          {burnTips.monthly}
                                                  </div>
                      )}
                      <div className="flex justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 px-1 rounded" onClick={() => setActiveBurnTip(activeBurnTip === 'monthly' ? null : 'monthly')}>
                        <span className="text-zinc-500">Monthly:</span>
                        <span className={`font-medium ${monthlyBurn >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {formatCompact(monthlyBurn)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Annual */}
                    <div className="relative">
                      {activeBurnTip === 'annual' && (
                        <div className="absolute bottom-full right-0 mb-2 w-72 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20">
                          <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                          {burnTips.annual}
                                                  </div>
                      )}
                      <div className="flex justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 px-1 rounded" onClick={() => setActiveBurnTip(activeBurnTip === 'annual' ? null : 'annual')}>
                        <span className="text-zinc-500">Annual:</span>
                        <span className={`font-medium ${annualGap >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {formatCompact(annualGap)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Column 2: Annual + Gap */}
                  <div className="space-y-0.5">
                    {/* Floor (Emergency Fund) */}
                    <div className="relative">
                      {activeBurnTip === 'floor' && (
                        <div className="absolute bottom-full right-0 mb-2 w-72 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                          <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                          {burnTips.floor}
                                                  </div>
                      )}
                      <div className="flex justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 px-1 rounded" onClick={() => setActiveBurnTip(activeBurnTip === 'floor' ? null : 'floor')}>
                        <span className="text-zinc-500">Floor:</span>
                        <span className={`font-medium ${floor > 0 ? (velocity >= 0 ? 'text-amber-400' : 'text-red-400') : 'text-zinc-600'}`}>
                          {floor > 0 ? floorDateStr : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Gap to BE */}
                    <div className="relative">
                      {activeBurnTip === 'gap' && (
                        <div className="absolute bottom-full right-0 mb-2 w-72 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                          <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                          {burnTips.gap}
                                                  </div>
                      )}
                      <div className="flex justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 px-1 rounded" onClick={() => setActiveBurnTip(activeBurnTip === 'gap' ? null : 'gap')}>
                        <span className="text-zinc-500">Gap:</span>
                        <span className={`font-medium ${breakEvenGap >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {formatCompact(breakEvenGap)}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional Metrics Row - aligned with burn analysis */}
                {(() => {
                  // Calculate LY avg/day from lyEstimates
                  const lyTotal = liquidityReceiver.lyEstimates.reduce((sum, w) => sum + w.value, 0);
                  const lyWeeks = liquidityReceiver.lyEstimates.length || 1;
                  const lyAvgDay = Math.round(lyTotal / (lyWeeks * 7));
                  
                  const metricTips: Record<string, string> = {
                    wow: liquidityReceiver.wowChange 
                      ? `Week-over-Week Change\n\nThis week: ${formatCompact(liquidityReceiver.wowChange.amount + (liquidityReceiver.balances[liquidityReceiver.balances.length - 2]?.balance || 0))}\nLast week: ${formatCompact(liquidityReceiver.balances[liquidityReceiver.balances.length - 2]?.balance || 0)}\nChange: ${formatCompact(liquidityReceiver.wowChange.amount)} (${liquidityReceiver.wowChange.percent >= 0 ? '+' : ''}${liquidityReceiver.wowChange.percent}%)\n\nShows how your cash position changed from last week.`
                      : '',
                    avgDay: `Average Daily Sales\n\nCurrent: ${formatCompact(liquidityReceiver.avgDailySales || 0)}/day\nLY Avg: ${formatCompact(lyAvgDay)}/day\n\nBased on your logged sales entries this month vs last year's reference data.`,
                    nut: `NUT Coverage\n\nCash on hand: ${formatCurrency(cashNow)}\nMonthly NUT: ${formatCurrency(monthlyFixedNut)}\nCoverage: ${liquidityReceiver.nutCoverage}%\n\n${(liquidityReceiver.nutCoverage || 0) >= 100 ? 'You can cover this month\'s fixed costs!' : 'You need more cash to cover this month\'s fixed costs.'}`,
                    runway: liquidityReceiver.runwayDays !== null && liquidityReceiver.runwayDays !== undefined
                      ? `Runway Days\n\nAt current burn rate (${formatCompact(liquidityReceiver.dailyBurn || 0)}/day), you have ~${liquidityReceiver.runwayDays} days of cash remaining.\n\n${liquidityReceiver.runwayDays > 90 ? 'Healthy runway!' : liquidityReceiver.runwayDays > 30 ? 'Monitor closely.' : 'Urgent - low runway!'}`
                      : 'Not burning cash - runway extends indefinitely.',
                  };
                  
                  return (
                    <div className="mt-2 pt-2 border-t border-zinc-800/50 grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {/* Row 1: WoW + Avg/Day */}
                      {/* WoW */}
                      <div className="relative">
                        {activeBurnTip === 'wow' && (
                          <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                            <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                            {metricTips.wow}
                                                      </div>
                        )}
                        <div 
                          className="flex justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                          onClick={() => setActiveBurnTip(activeBurnTip === 'wow' ? null : 'wow')}
                        >
                          <span className="text-zinc-500">WoW:</span>
                          <span className="text-right flex flex-col items-end">
                            <span className={`font-medium ${(liquidityReceiver.wowChange?.amount ?? 0) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                              {liquidityReceiver.wowChange ? formatCompact(liquidityReceiver.wowChange.amount) : '—'}
                            </span>
                            {liquidityReceiver.wowChange && (
                              <span className="text-zinc-600 text-[10px]">
                                ({liquidityReceiver.wowChange.percent >= 0 ? '+' : ''}{liquidityReceiver.wowChange.percent}%)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      {/* Avg/Day with LY comparison */}
                      <div className="relative">
                        {activeBurnTip === 'avgDay' && (
                          <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                            <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                            {metricTips.avgDay}
                                                      </div>
                        )}
                        <div 
                          className="flex justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                          onClick={() => setActiveBurnTip(activeBurnTip === 'avgDay' ? null : 'avgDay')}
                        >
                          <span className="text-zinc-500">Avg/Day:</span>
                          <span className="text-right flex flex-col items-end">
                            <span className="font-medium text-zinc-300">{formatCompact(liquidityReceiver.avgDailySales || 0)}</span>
                            <span className="text-zinc-600 text-[10px]">LY: {formatCompact(lyAvgDay)}</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Row 2: NUT + Runway */}
                      {/* NUT */}
                      <div className="relative">
                        {activeBurnTip === 'nut' && (
                          <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                            <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                            {metricTips.nut}
                                                      </div>
                        )}
                        <div 
                          className="flex justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                          onClick={() => setActiveBurnTip(activeBurnTip === 'nut' ? null : 'nut')}
                        >
                          <span className="text-zinc-500">NUT:</span>
                          <span className={`font-medium ${(liquidityReceiver.nutCoverage ?? 0) >= 100 ? 'text-cyan-400' : (liquidityReceiver.nutCoverage ?? 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {liquidityReceiver.nutCoverage ?? 0}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Runway */}
                      <div className="relative">
                        {activeBurnTip === 'runway' && (
                          <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                            <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                            {metricTips.runway}
                                                      </div>
                        )}
                        <div 
                          className="flex justify-between gap-4 cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                          onClick={() => setActiveBurnTip(activeBurnTip === 'runway' ? null : 'runway')}
                        >
                          <span className="text-zinc-500">Runway:</span>
                          <span className={`font-medium ${(liquidityReceiver.runwayDays ?? 999) > 90 ? 'text-cyan-400' : (liquidityReceiver.runwayDays ?? 999) > 30 ? 'text-amber-400' : 'text-red-400'}`}>
                            {liquidityReceiver.runwayDays !== null && liquidityReceiver.runwayDays !== undefined ? `${liquidityReceiver.runwayDays}d` : '∞'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>

        {/* Liquidity Receiver V3 - Radio Dial Stack */}
        <LiquidityReceiverV3
          balances={liquidityReceiver.balances}
          deltas={liquidityReceiver.deltas}
          lyEstimates={liquidityReceiver.lyEstimates}
          weeklyActualSales={liquidityReceiver.weeklyActualSales}
          estBalanceSeries={liquidityReceiver.estBalanceSeries}
          mergedBalanceSeries={liquidityReceiver.mergedBalanceSeries}
          actualBalanceSeries={liquidityReceiver.actualBalanceSeries}
          anchor={liquidityReceiver.anchor}
          continuityStats={liquidityReceiver.continuityStats}
          operatingFloor={liquidityReceiver.operatingFloor}
          targetReserve={liquidityReceiver.targetReserve}
          monthlyNut={liquidityReceiver.survivalGoal}
          velocity={liquidityReceiver.velocity}
          safeToSpend={liquidityReceiver.safeToSpend}
          cashNow={cashNow}
          asOfDate={asOfDate}
          confidence={confidenceLevel}
          timezone={timezone}
          capitalSeries={liquidityReceiver.capitalSeries}
          totalCapitalInvested={liquidityReceiver.totalCapitalInvested}
          nutSeries={liquidityReceiver.nutSeries}
        />

        {/* Footer: Best/Worst left, Capital Invested right */}
        <div ref={footerTipRef} className="mt-3 flex justify-between items-baseline px-1 relative">
          {/* Left: Best/Worst together */}
          <div className="flex gap-4 text-xs">
            {liquidityReceiver.bestWorst && (
              <>
                {/* Best Month */}
                <div className="relative">
                  {activeFooterTip === 'best' && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                      <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                      Best Month: ${Math.round(liquidityReceiver.bestWorst.best.value).toLocaleString()} net sales ({liquidityReceiver.bestWorst.best.week}).{'\n\n'}This is your highest performing month from all reference data.
                    </div>
                  )}
                  <span 
                    className="cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                    onClick={() => setActiveFooterTip(activeFooterTip === 'best' ? null : 'best')}
                  >
                    <span className="text-zinc-500">Best:</span>{' '}
                    <span className="text-cyan-400 font-medium">${Math.round(liquidityReceiver.bestWorst.best.value).toLocaleString()}</span>
                    <span className="text-zinc-600 text-[10px] ml-1">({liquidityReceiver.bestWorst.best.week?.replace('-', ' ') || ''})</span>
                  </span>
                </div>
                
                {/* Worst Month */}
                <div className="relative">
                  {activeFooterTip === 'worst' && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                      <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                      Worst Month: ${Math.round(liquidityReceiver.bestWorst.worst.value).toLocaleString()} net sales ({liquidityReceiver.bestWorst.worst.week}).{'\n\n'}This is your lowest performing month from all reference data.
                    </div>
                  )}
                  <span 
                    className="cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                    onClick={() => setActiveFooterTip(activeFooterTip === 'worst' ? null : 'worst')}
                  >
                    <span className="text-zinc-500">Worst:</span>{' '}
                    <span className="text-red-400 font-medium">${Math.round(liquidityReceiver.bestWorst.worst.value).toLocaleString()}</span>
                    <span className="text-zinc-600 text-[10px] ml-1">({liquidityReceiver.bestWorst.worst.week?.replace('-', ' ') || ''})</span>
                  </span>
                </div>
              </>
            )}
          </div>
          
          {/* Right: Total Capital Invested */}
          {liquidityReceiver.totalCapitalInvested !== undefined && liquidityReceiver.totalCapitalInvested > 0 && (
            <div className="relative">
              {activeFooterTip === 'capital' && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 shadow-lg z-20 whitespace-pre-line">
                  <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
                  Total Capital Invested: ${liquidityReceiver.totalCapitalInvested.toLocaleString()}{'\n\n'}This is the cumulative sum of all cash injections you've made into the business. Add more injections in Settings to track your full investment history.
                </div>
              )}
              <span 
                className="text-xs text-right cursor-pointer hover:bg-zinc-800/30 px-1 rounded"
                onClick={() => setActiveFooterTip(activeFooterTip === 'capital' ? null : 'capital')}
              >
                <span className="text-zinc-500">Capital In:</span>{' '}
                <span className="text-emerald-400 font-medium">${Math.round(liquidityReceiver.totalCapitalInvested / 1000)}K</span>
              </span>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
