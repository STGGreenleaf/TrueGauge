'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FuturisticGauge, SideGauge, MonthProgressBar, MiniReadout } from '@/components/FuturisticGauge';
import { LiquidityCard } from '@/components/LiquidityCard';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Plus, CalendarDays, Play } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import StartupAnimation from '@/components/StartupAnimation';
import { OwnerMenu } from '@/components/OwnerMenu';

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false); // Only show via easter egg
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [userViewEnabled, setUserViewEnabled] = useState(false);

  const fetchDashboard = async (useShowcase = false) => {
    try {
      const url = useShowcase ? '/api/dashboard?showcase=true' : '/api/dashboard';
      const res = await fetch(url);
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(userViewEnabled);
    
    // Re-fetch when tab becomes visible (user returns from Settings)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard(userViewEnabled);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Also re-fetch on window focus
    const handleFocus = () => fetchDashboard(userViewEnabled);
    window.addEventListener('focus', handleFocus);
    
    // Listen for splash page trigger from owner menu
    const handleShowSplash = () => setShowAnimation(true);
    window.addEventListener('show-splash', handleShowSplash);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('show-splash', handleShowSplash);
    };
  }, [userViewEnabled]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard(userViewEnabled);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-xs tracking-widest text-zinc-600">LOADING...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <div className="text-zinc-400">Failed to load dashboard</div>
          <Button onClick={handleRefresh} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const cogsStatus = data.actualCogsRate <= data.settings.targetCogsPct ? 'good' : 
    data.actualCogsRate <= data.settings.targetCogsPct + 0.05 ? 'warning' : 'danger';
  
  const cashStatus = data.cashHealthResult >= 0 ? 'positive' : 'negative';
  const trueStatus = data.trueHealthResult >= 0 ? 'positive' : 'negative';
  
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = monthNames[new Date().getMonth()];

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background - violet accent for premium feel */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute left-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-violet-500/5 blur-[80px]" />
      </div>

      {/* Header - minimal luxury */}
      <header className="relative z-10 border-b border-zinc-800/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg uppercase tracking-[0.25em] text-zinc-400"><span className="font-bold text-cyan-400" style={{ textShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee50' }}>TRUE</span><span className="font-light">GAUGE</span></h1>
          </div>
          <div className="flex items-center gap-1">
            <OwnerMenu 
              onToggleUserView={setUserViewEnabled} 
              userViewEnabled={userViewEnabled} 
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-zinc-500 hover:text-cyan-400"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/settings')}
              className="text-zinc-500 hover:text-cyan-400"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-8" onClick={() => setActiveTip(null)}>
        
        {/* As-of Date Header */}
        <section className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest text-zinc-500">
                As of {new Date(data.asOfDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-xs text-zinc-600">
                (Day {data.asOfDay} of {data.daysInMonth})
              </span>
              {data.salesNotEntered && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  Sales not entered for today
                </span>
              )}
            </div>
            {data.liquidityReceiver?.daysInBusiness && (
              <span className="text-xs text-zinc-600">
                Day <span className="text-cyan-400 font-medium">{data.liquidityReceiver.daysInBusiness.toLocaleString()}</span> in business
              </span>
            )}
          </div>
        </section>

        {/* Month Progress Bar */}
        <section className="mb-8">
          <MonthProgressBar
            current={data.asOfDay}
            total={data.daysInMonth}
            label={`${currentMonth} Progress`}
            year={new Date().getFullYear()}
            month={new Date().getMonth() + 1}
            openHoursTemplate={data.settings?.openHoursTemplate}
            onDayClick={(day) => {
              const year = new Date().getFullYear();
              const month = new Date().getMonth() + 1;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              router.push(`/diary?date=${dateStr}`);
            }}
          />
        </section>

        {/* Main Cockpit Display */}
        <section className="mb-4">
          {/* Desktop layout - side by side with tooltips */}
          <div className="hidden md:flex items-center justify-center gap-16">
            {/* Pace Delta / Ahead - clickable */}
            <div className="relative">
              <button onClick={() => setActiveTip(activeTip === 'pace' ? null : 'pace')}>
                <SideGauge
                  value={Math.abs(data.paceDelta)}
                  label="Pace Delta"
                  subValue={data.paceDelta >= 0 ? 'ahead' : 'behind'}
                  variant="left"
                  status={data.paceDelta >= 0 ? 'positive' : 'negative'}
                />
              </button>
              {activeTip === 'pace' && (
                <div className="absolute bottom-full left-0 mb-2 w-64 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100] whitespace-pre-line">
                  <div className="font-medium text-cyan-400 text-base mb-2">Pace Delta: {data.paceDelta >= 0 ? '+' : ''}{formatCurrency(data.paceDelta)}</div>
                  <p className="text-sm text-zinc-300 mb-2"><strong>{data.paceDelta >= 0 ? 'Ahead' : 'Behind'}</strong> of where you need to be this month.</p>
                  <p className="text-sm text-zinc-300 mb-2">Based on day {new Date().getDate()} of the month, you should have ~{formatCurrency(data.survivalGoal * (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()))} by now.</p>
                  <p className="text-xs text-zinc-500">MTD: {formatCurrency(data.mtdNetSales)}</p>
                </div>
              )}
            </div>
            
            {/* Survival gauge - clickable */}
            <div className="relative">
              <button onClick={() => setActiveTip(activeTip === 'survival' ? null : 'survival')}>
                <FuturisticGauge
                  value={Math.min(200, data.survivalPercent)}
                  label="Survival"
                  subLabel={`Goal: ${formatCurrency(data.survivalGoal)}`}
                  size={340}
                  nutTotal={data.settings.monthlyFixedNut}
                  nutRemaining={Math.max(0, data.settings.monthlyFixedNut - (data.mtdNetSales * (1 - data.settings.targetCogsPct - data.settings.targetFeesPct)))}
                />
              </button>
              {activeTip === 'survival' && (() => {
                const profitMargin = 1 - data.settings.targetCogsPct - data.settings.targetFeesPct;
                const grossProfit = data.mtdNetSales * profitMargin;
                const nutRemaining = Math.max(0, data.settings.monthlyFixedNut - grossProfit);
                const nutPct = Math.round((1 - nutRemaining / data.settings.monthlyFixedNut) * 100);
                const overage = grossProfit > data.settings.monthlyFixedNut ? grossProfit - data.settings.monthlyFixedNut : 0;
                
                return (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100]">
                    <div className="font-medium text-cyan-400 text-base mb-2">Survival: {Math.round(data.survivalPercent)}%</div>
                    <p className="text-sm text-zinc-300 mb-3">This is how much of your <strong>monthly survival goal</strong> you&apos;ve hit so far. 100% = you&apos;ve covered all fixed costs for the month.</p>
                    <div className="mb-2 p-2 rounded bg-zinc-800/50">
                      <div className="text-zinc-400 text-xs mb-1">Month-to-Date Sales:</div>
                      <div className="text-white text-sm font-medium">{formatCurrency(data.mtdNetSales)}</div>
                    </div>
                    <div className="mb-2 p-2 rounded bg-zinc-800/50">
                      <div className="text-zinc-400 text-xs mb-1">Monthly Goal:</div>
                      <div className="text-white text-sm font-medium">{formatCurrency(data.survivalGoal)}</div>
                    </div>
                    <div className="mb-2 p-2 rounded bg-amber-900/30 border border-amber-700/50">
                      <div className="text-amber-400 text-xs mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        NUT Remaining (inner arc):
                      </div>
                      <div className="text-white text-sm font-medium">{formatCurrency(nutRemaining)} <span className="text-zinc-500 text-xs">({nutPct}% covered)</span></div>
                      <div className="text-xs text-zinc-500">of {formatCurrency(data.settings.monthlyFixedNut)} fixed costs</div>
                    </div>
                    {overage > 0 && (
                      <div className="mb-2 p-2 rounded bg-emerald-900/30 border border-emerald-700/50">
                        <div className="text-emerald-400 text-xs mb-1">Profit (above NUT):</div>
                        <div className="text-white text-sm font-medium">+{formatCurrency(overage)}</div>
                      </div>
                    )}
                    <p className="text-xs text-zinc-500">{data.survivalPercent >= 100 
                      ? '✓ You hit your survival goal!' 
                      : `Need ${formatCurrency(data.survivalGoal - data.mtdNetSales)} more sales to hit 100%`}</p>
                  </div>
                );
              })()}
            </div>
            
            {/* Cash Logged - clickable */}
            <div className="relative">
              <button onClick={() => setActiveTip(activeTip === 'logged' ? null : 'logged')}>
                <SideGauge
                  value={Math.abs(data.cashHealthResult)}
                  label="Cash Logged"
                  subValue={data.confidenceLevel === 'LOW' ? 'missing expenses?' : data.cashHealthResult >= 0 ? 'logged' : 'over budget'}
                  variant="right"
                  status={cashStatus}
                />
              </button>
              {activeTip === 'logged' && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100] whitespace-pre-line text-left">
                  <div className="font-medium text-cyan-400 text-base mb-2">Cash Logged: {formatCurrency(data.cashHealthResult)}</div>
                  <p className="text-sm text-zinc-300 mb-2"><strong>Logged</strong> = net sales minus expenses recorded this month.</p>
                  <p className="text-sm text-zinc-300 mb-2">This shows how much cash activity you've tracked.</p>
                  <p className="text-xs text-zinc-500">{data.confidenceLevel === 'LOW' ? '⚠️ Low confidence - missing expense data?' : 'Good data coverage.'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile layout - instruments around dial (4 corners) */}
          <div className="relative md:hidden">
            {/* Main Gauge - centered, clickable for tooltip */}
            <div className="flex justify-center py-4 relative">
              <button onClick={() => setActiveTip(activeTip === 'survival' ? null : 'survival')}>
                <FuturisticGauge
                  value={Math.min(200, data.survivalPercent)}
                  label="Survival"
                  subLabel={`Goal: ${formatCurrency(data.survivalGoal)}`}
                  size={240}
                  nutTotal={data.settings.monthlyFixedNut}
                  nutRemaining={Math.max(0, data.settings.monthlyFixedNut - (data.mtdNetSales * (1 - data.settings.targetCogsPct - data.settings.targetFeesPct)))}
                />
              </button>
              {activeTip === 'survival' && (() => {
                const profitMargin = 1 - data.settings.targetCogsPct - data.settings.targetFeesPct;
                const grossProfit = data.mtdNetSales * profitMargin;
                const nutRemaining = Math.max(0, data.settings.monthlyFixedNut - grossProfit);
                const nutPct = Math.round((1 - nutRemaining / data.settings.monthlyFixedNut) * 100);
                
                return (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100]">
                    <div className="font-medium text-cyan-400 text-base mb-2">Survival: {Math.round(data.survivalPercent)}%</div>
                    <p className="text-sm text-zinc-300 mb-2">How much of your <strong>monthly survival goal</strong> you&apos;ve hit. 100% = fixed costs covered.</p>
                    <div className="mb-2 p-2 rounded bg-zinc-800/50">
                      <div className="text-zinc-400 text-xs">Month-to-Date Sales:</div>
                      <div className="text-white text-sm font-medium">{formatCurrency(data.mtdNetSales)}</div>
                    </div>
                    <div className="mb-2 p-2 rounded bg-amber-900/30 border border-amber-700/50">
                      <div className="text-amber-400 text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        NUT Remaining (inner arc):
                      </div>
                      <div className="text-white text-sm font-medium">{formatCurrency(nutRemaining)} <span className="text-zinc-500 text-xs">({nutPct}% covered)</span></div>
                    </div>
                    <p className="text-xs text-zinc-500">{data.survivalPercent >= 100 
                      ? '✓ Goal reached!' 
                      : `Need ${formatCurrency(data.survivalGoal - data.mtdNetSales)} more sales`}</p>
                  </div>
                );
              })()}
            </div>
            
            {/* Top-left: Pace Delta - clickable */}
            <button 
              className="absolute top-0 left-1"
              onClick={() => setActiveTip(activeTip === 'pace' ? null : 'pace')}
            >
              <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">Pace Delta</div>
              <div className="flex gap-1 items-start" style={{ flexDirection: 'row-reverse' }}>
                {Array.from({ length: 8 }).map((_, i) => {
                  const filled = i < Math.min(8, Math.round((Math.abs(data.paceDelta) / 8000) * 8));
                  const progress = i / 7;
                  let color: string;
                  if (progress < 0.5) {
                    const t = progress / 0.5;
                    color = `rgb(${Math.round(239 + (245-239)*t)}, ${Math.round(68 + (158-68)*t)}, ${Math.round(68 + (11-68)*t)})`;
                  } else {
                    const t = (progress - 0.5) / 0.5;
                    color = `rgb(${Math.round(245 + (34-245)*t)}, ${Math.round(158 + (211-158)*t)}, ${Math.round(11 + (238-11)*t)})`;
                  }
                  return (
                    <div
                      key={i}
                      className="w-2 rounded-sm"
                      style={{
                        height: 12 + i * 3,
                        backgroundColor: filled ? color : '#27272a',
                        boxShadow: filled ? `0 0 6px ${color}` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </button>
            {activeTip === 'pace' && (
              <div className="absolute bottom-full left-1 mb-2 w-64 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100] whitespace-pre-line">
                <div className="font-medium text-cyan-400 text-base mb-2">Pace Delta: {data.paceDelta >= 0 ? '+' : ''}{formatCurrency(data.paceDelta)}</div>
                <p className="text-sm text-zinc-300 mb-2"><strong>{data.paceDelta >= 0 ? 'Ahead' : 'Behind'}</strong> of where you need to be this month.</p>
                <p className="text-sm text-zinc-300 mb-2">Based on today being day {new Date().getDate()} of the month, you should have {formatCurrency(data.survivalGoal * (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()))} by now.</p>
                <p className="text-xs text-zinc-500">MTD: {formatCurrency(data.mtdNetSales)}</p>
              </div>
            )}
            
            {/* Top-right: Cash Logged - clickable */}
            <button 
              className="absolute top-0 right-1 text-right"
              onClick={() => setActiveTip(activeTip === 'logged' ? null : 'logged')}
            >
              <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">Cash Logged</div>
              <div className="flex gap-1 justify-end items-start">
                {Array.from({ length: 8 }).map((_, i) => {
                  const filled = i < Math.min(8, Math.round((Math.abs(data.cashHealthResult) / 8000) * 8));
                  const progress = i / 7;
                  let color: string;
                  if (progress < 0.5) {
                    const t = progress / 0.5;
                    color = `rgb(${Math.round(239 + (245-239)*t)}, ${Math.round(68 + (158-68)*t)}, ${Math.round(68 + (11-68)*t)})`;
                  } else {
                    const t = (progress - 0.5) / 0.5;
                    color = `rgb(${Math.round(245 + (34-245)*t)}, ${Math.round(158 + (211-158)*t)}, ${Math.round(11 + (238-11)*t)})`;
                  }
                  return (
                    <div
                      key={i}
                      className="w-2 rounded-sm"
                      style={{
                        height: 12 + i * 3,
                        backgroundColor: filled ? color : '#27272a',
                        boxShadow: filled ? `0 0 6px ${color}` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </button>
            {activeTip === 'logged' && (
              <div className="absolute bottom-full right-1 mb-2 w-64 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100] whitespace-pre-line text-left">
                <div className="font-medium text-cyan-400 text-base mb-2">Cash Logged: {formatCurrency(data.cashHealthResult)}</div>
                <p className="text-sm text-zinc-300 mb-2"><strong>Logged</strong> means net sales minus expenses you've recorded this month.</p>
                <p className="text-sm text-zinc-300 mb-2">This shows how much cash activity you've tracked.</p>
                <p className="text-xs text-zinc-500">{data.confidenceLevel === 'LOW' ? '⚠️ Low confidence - missing expense data?' : 'Good data coverage.'}</p>
              </div>
            )}
            
            {/* Bottom-left: Pace Delta value */}
            <div className="absolute bottom-0 left-1">
              <div className={`text-lg font-bold ${data.paceDelta >= 0 ? 'text-cyan-400' : 'text-red-400'}`}
                   style={{ textShadow: `0 0 12px ${data.paceDelta >= 0 ? '#22d3ee' : '#ef4444'}` }}>
                {data.paceDelta >= 0 ? '+' : '-'}${(Math.abs(data.paceDelta) / 1000).toFixed(1)}k
              </div>
              <div className="text-[9px] text-zinc-500">{data.paceDelta >= 0 ? 'ahead' : 'behind'}</div>
            </div>
            
            {/* Bottom-right: Cash Logged value */}
            <div className="absolute bottom-0 right-1 text-right">
              <div className={`text-lg font-bold ${cashStatus === 'positive' ? 'text-cyan-400' : 'text-red-400'}`}
                   style={{ textShadow: `0 0 12px ${cashStatus === 'positive' ? '#22d3ee' : '#ef4444'}` }}>
                ${(Math.abs(data.cashHealthResult) / 1000).toFixed(1)}k
              </div>
              <div className="text-[9px] text-zinc-500">
                {data.confidenceLevel === 'LOW' ? 'missing?' : data.cashHealthResult >= 0 ? 'logged' : 'over'}
              </div>
            </div>
          </div>

          {/* Last Year Reference */}
          {data.lastYearReference && (
            <div className="mt-2 flex justify-center">
              <div className="flex items-center gap-4 text-xs">
                <div className="text-zinc-500">
                  <span className="text-zinc-600">LY {data.lastYearReference.year}:</span>{' '}
                  <span className="text-zinc-400">{formatCurrency(data.lastYearReference.netSales)}</span>
                </div>
                <div className={`font-medium ${data.lastYearReference.vsLastYearPace >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {data.lastYearReference.vsLastYearPace >= 0 ? '+' : ''}
                  {formatCurrency(data.lastYearReference.vsLastYearPace)}
                  <span className="text-zinc-600 font-normal ml-1">vs pace (est)</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Liquidity Card - below cluster, above Pit Board */}
        <LiquidityCard
          hasSnapshot={data.cashSnapshot.hasSnapshot}
          snapshotAmount={data.cashSnapshot.snapshotAmount}
          snapshotAsOf={data.cashSnapshot.snapshotAsOf}
          cashNow={data.cashSnapshot.cashNow}
          changeSince={data.cashSnapshot.changeSince}
          isEstimate={data.cashSnapshot.isEstimate}
          runwayPct={data.cashSnapshot.runwayPct}
          monthlyFixedNut={data.settings.monthlyFixedNut}
          asOfDate={data.asOfDate}
          confidenceLevel={data.confidenceLevel}
          liquidityReceiver={data.liquidityReceiver}
          onSetSnapshot={() => router.push('/settings')}
          timezone={data.settings.timezone}
        />

        {/* Pit Board - Daily Needed from Here */}
        <section className="mb-10 relative">
          <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-5 backdrop-blur-sm overflow-visible">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Pit Board</h3>
              {data.confidenceLevel !== 'HIGH' && (
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  data.confidenceLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {data.confidenceLevel === 'MEDIUM' ? 'Medium confidence' : 'Low confidence'}
                </span>
              )}
            </div>
            
            {data.pitBoard.remainingOpenDays === 0 ? (
              <div className="text-center py-2">
                <div className="text-lg font-light text-zinc-400">No open days remaining</div>
                <div className="text-xs text-zinc-600 mt-1">
                  {data.pitBoard.remaining <= 0 ? 'Goal achieved!' : `${formatCurrency(data.pitBoard.remaining)} still needed`}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div 
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'daily' ? null : 'daily'); }}
                >
                  <div className="text-2xl font-bold text-cyan-400" style={{ textShadow: '0 0 20px #22d3ee' }}>
                    {formatCurrency(data.pitBoard.dailyNeeded)}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Daily Needed</div>
                  {activeTip === 'daily' && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                      <div className="text-cyan-400 text-base font-medium mb-1">{formatCurrency(data.pitBoard.remaining)} ÷ {data.pitBoard.remainingOpenDays} days</div>
                      <div className="text-zinc-300 text-sm mb-2">= {formatCurrency(data.pitBoard.dailyNeeded)} per open day</div>
                      <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                        Average needed each open day to reach your {formatCurrency(data.survivalGoal)} survival goal. Closed days excluded.
                      </div>
                    </div>
                  )}
                </div>
                <div 
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'remaining' ? null : 'remaining'); }}
                >
                  <div className="text-xl font-light text-zinc-300">
                    {formatCurrency(data.pitBoard.remaining)}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Remaining</div>
                  {activeTip === 'remaining' && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-56 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-zinc-500">Goal:</span><span className="text-zinc-300">{formatCurrency(data.survivalGoal)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-zinc-500">MTD Sales:</span><span className="text-zinc-300">{formatCurrency(data.mtdNetSales)}</span></div>
                        <div className="border-t border-zinc-700 pt-2 flex justify-between font-medium text-sm"><span className="text-zinc-400">Remaining:</span><span className="text-cyan-400">{formatCurrency(data.pitBoard.remaining)}</span></div>
                        <div className="text-xs text-zinc-500 pt-1">Updates as you enter daily sales.</div>
                      </div>
                    </div>
                  )}
                </div>
                <div 
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'opendays' ? null : 'opendays'); }}
                >
                  <div className="text-xl font-light text-zinc-300">
                    {data.pitBoard.remainingOpenDays}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Open Days Left</div>
                  {activeTip === 'opendays' && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-56 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                      <div className="text-cyan-400 text-base font-medium mb-1">Open Days Left</div>
                      <div className="text-sm text-zinc-300 mb-2">Open days remaining this month</div>
                      <div className="text-xs text-zinc-500">Based on your store hours settings. Closed days (like Mondays) are excluded.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Mini Readouts - with click-to-expand tooltips */}
        <section className="mb-10 relative">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {/* MTD Sales */}
            <div 
              className="group relative flex flex-col items-center overflow-visible rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 px-4 py-3 backdrop-blur-md cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'mtd' ? null : 'mtd'); }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="text-[9px] font-medium uppercase tracking-widest text-zinc-500">MTD Sales</div>
              <div className="text-lg font-light" style={{ color: data.mtdNetSales > 0 ? '#22d3ee' : '#a1a1aa' }}>{formatCurrency(data.mtdNetSales)}</div>
              {data.mtdNetSales === 0 && <div className="text-xs text-zinc-500">no entries</div>}
              {activeTip === 'mtd' && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Month-to-Date Net Sales</div>
                  <div className="text-sm text-zinc-300 mb-2">Sum of all daily net sales entries for {new Date().toLocaleDateString('en-US', { month: 'long' })}.</div>
                  <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                    {data.mtdNetSales > 0 
                      ? `${data.asOfDay} day${data.asOfDay > 1 ? 's' : ''} of data entered. Avg: ${formatCurrency(Math.round(data.mtdNetSales / data.asOfDay))}/day`
                      : 'Enter daily sales in the Diary to track progress.'}
                  </div>
                </div>
              )}
            </div>
            
            {/* COGS */}
            <div 
              className="group relative flex flex-col items-center overflow-visible rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 px-4 py-3 backdrop-blur-md cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'cogs' ? null : 'cogs'); }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="text-[9px] font-medium uppercase tracking-widest text-zinc-500">COGS</div>
              <div className="text-lg font-light" style={{ color: data.hasCogs ? (cogsStatus === 'good' ? '#22d3ee' : cogsStatus === 'warning' ? '#f59e0b' : '#ef4444') : '#a1a1aa' }}>
                {data.hasCogs ? formatPercent(data.actualCogsRate) : `Est ${formatPercent(data.settings.targetCogsPct)}`}
              </div>
              <div className="text-xs text-zinc-500">{data.hasCogs ? `target ${formatPercent(data.settings.targetCogsPct)}` : 'not logged'}</div>
              {activeTip === 'cogs' && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Cost of Goods Sold</div>
                  <div className="text-sm text-zinc-300 mb-2">Direct costs to produce what you sell (inventory, ingredients, supplies).</div>
                  {data.hasCogs ? (
                    <div className="border-t border-zinc-700 pt-2 space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-zinc-500">COGS logged:</span><span className="text-zinc-300">{formatCurrency(data.mtdCogsCash)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-zinc-500">As % of sales:</span><span className="text-zinc-300">{formatPercent(data.actualCogsRate)}</span></div>
                      <div className="text-xs text-zinc-500 mt-1">Target: {formatPercent(data.settings.targetCogsPct)} — {data.actualCogsRate <= data.settings.targetCogsPct ? '✓ On track' : '⚠️ Over target'}</div>
                    </div>
                  ) : (
                    <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                      Using estimated {formatPercent(data.settings.targetCogsPct)}. Log COGS expenses for actual tracking.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* OPEX */}
            <div 
              className="group relative flex flex-col items-center overflow-visible rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 px-4 py-3 backdrop-blur-md cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'opex' ? null : 'opex'); }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="text-[9px] font-medium uppercase tracking-widest text-zinc-500">OPEX</div>
              <div className="text-lg font-light" style={{ color: '#a1a1aa' }}>{data.hasOpex ? formatCurrency(data.mtdOpexCash) : '$0'}</div>
              {!data.hasOpex && <div className="text-xs text-zinc-500">not logged</div>}
              {activeTip === 'opex' && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Operating Expenses</div>
                  <div className="text-sm text-zinc-300 mb-2">Day-to-day costs not tied to products: utilities, supplies, repairs, misc.</div>
                  {data.hasOpex ? (
                    <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                      {formatCurrency(data.mtdOpexCash)} logged this month. These reduce your Cash Health score.
                    </div>
                  ) : (
                    <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                      No OPEX logged yet. Add via Diary → Expenses when you have misc costs.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Cash Logged */}
            <div 
              className="group relative flex flex-col items-center overflow-visible rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 px-4 py-3 backdrop-blur-md cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'cashlogged' ? null : 'cashlogged'); }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="text-[9px] font-medium uppercase tracking-widest text-zinc-500">Cash Logged</div>
              <div className="text-lg font-light" style={{ color: data.cashHealthResult >= 0 ? '#22d3ee' : '#ef4444' }}>{formatCurrency(data.cashHealthResult)}</div>
              <div className="text-xs text-zinc-500">{data.confidenceLevel === 'LOW' ? 'missing expenses?' : 'sales − expenses'}</div>
              {activeTip === 'cashlogged' && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Cash Health (Logged)</div>
                  <div className="text-sm text-zinc-300 mb-2">Net cash flow based on what you've actually recorded.</div>
                  <div className="border-t border-zinc-700 pt-2 space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-zinc-500">MTD Sales:</span><span className="text-zinc-300">{formatCurrency(data.mtdNetSales)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-zinc-500">− COGS:</span><span className="text-zinc-300">{formatCurrency(data.mtdCogsCash)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-zinc-500">− OPEX:</span><span className="text-zinc-300">{formatCurrency(data.mtdOpexCash)}</span></div>
                    <div className="flex justify-between font-medium text-sm pt-1 border-t border-zinc-700"><span className="text-zinc-400">= Cash:</span><span className={data.cashHealthResult >= 0 ? 'text-cyan-400' : 'text-red-400'}>{formatCurrency(data.cashHealthResult)}</span></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Confidence */}
            <div 
              className="group relative flex flex-col items-center overflow-visible rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 px-4 py-3 backdrop-blur-md cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'confidence' ? null : 'confidence'); }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="text-[9px] font-medium uppercase tracking-widest text-zinc-500">Confidence</div>
              <div className="text-lg font-light" style={{ color: data.confidenceLevel === 'HIGH' ? '#22d3ee' : data.confidenceLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444' }}>
                {data.confidenceLevel}
              </div>
              <div className="text-xs text-zinc-500">{data.confidenceLevel === 'HIGH' ? 'data complete' : data.confidenceLevel === 'MEDIUM' ? 'log expenses' : 'needs data'}</div>
              {activeTip === 'confidence' && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Data Confidence: {data.confidenceScore}</div>
                  <div className="text-sm text-zinc-300 mb-2">How complete your logged data is. Higher = more accurate health calculations.</div>
                  <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                    <div className="mb-1 font-medium">Factors:</div>
                    <div>• Sales entries: {data.mtdNetSales > 0 ? '✓' : '✗'}</div>
                    <div>• COGS logged: {data.hasCogs ? '✓' : '✗'}</div>
                    <div>• OPEX logged: {data.hasOpex ? '✓' : '✗'}</div>
                    {data.confidenceLevel !== 'HIGH' && (
                      <div className="mt-2 text-amber-400">Log missing data to improve accuracy.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Quick Actions - glassy dark buttons */}
        <section>
          <div className="grid gap-3 md:grid-cols-4">
            <button
              onClick={() => router.push('/diary')}
              className="group relative h-14 overflow-hidden rounded-lg border border-cyan-500/30 bg-cyan-500/10 font-light tracking-wide text-cyan-300 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-center gap-2">
                <Plus className="h-5 w-5" />
                Enter Sales
              </div>
            </button>
            <button
              onClick={() => router.push('/diary')}
              className="group relative h-14 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/30 font-light tracking-wide text-zinc-400 backdrop-blur-sm transition-all hover:border-zinc-600 hover:text-zinc-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/0 via-zinc-500/5 to-zinc-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative">Add Expense</span>
            </button>
            <button
              onClick={() => router.push('/calendar')}
              className="group relative h-14 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/30 font-light tracking-wide text-zinc-400 backdrop-blur-sm transition-all hover:border-zinc-600 hover:text-zinc-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/0 via-zinc-500/5 to-zinc-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Month View
              </div>
            </button>
            <button
              onClick={() => router.push('/annual')}
              className="group relative h-14 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/30 font-light tracking-wide text-zinc-400 backdrop-blur-sm transition-all hover:border-zinc-600 hover:text-zinc-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/0 via-zinc-500/5 to-zinc-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative">Annual Report</span>
            </button>
          </div>
        </section>
      </main>

      {/* Footer - subtle */}
      <footer className="relative z-10 py-6 px-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={() => setShowAnimation(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700/50 bg-zinc-900/50 text-zinc-500 transition-all hover:border-cyan-500/30 hover:text-cyan-500"
            title="Play startup animation (A)"
          >
            <Play className="h-4 w-4" />
          </button>
          <span className="text-sm tracking-widest text-zinc-700">
            <span className="font-bold">TRUE</span><span className="font-light">GAUGE</span> • LOCAL-FIRST
          </span>
          <div className="w-8" /> {/* Spacer for balance */}
        </div>
      </footer>

      {/* Startup Animation Overlay */}
      {showAnimation && (
        <StartupAnimation 
          loop={true}
          onComplete={() => setShowAnimation(false)}
        />
      )}
    </div>
  );
}
