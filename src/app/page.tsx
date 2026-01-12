'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FuturisticGauge, SideGauge, MonthProgressBar, MiniReadout } from '@/components/FuturisticGauge';
import { LiquidityCard } from '@/components/LiquidityCard';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, Wallet, X, Receipt, BarChart3 } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import StartupAnimation from '@/components/StartupAnimation';
import { Nav } from '@/components/Nav';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Animation state - check after mount to avoid SSR hydration mismatch
  const [showAnimation, setShowAnimation] = useState(false);
  
  // Check if animation should show after component mounts (client-side only)
  useEffect(() => {
    const shown = sessionStorage.getItem('splashShown');
    if (!shown) {
      sessionStorage.setItem('splashShown', 'true');
      setShowAnimation(true);
    }
  }, []);
  const [animationDuration, setAnimationDuration] = useState(3000);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [userViewEnabled, setUserViewEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userViewEnabled') === 'true';
    }
    return false;
  });
  
  // Demo mode for non-owners (defaults to true for new users)
  const [demoModeEnabled, setDemoModeEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('demoModeEnabled');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });
  
  // Track if settings has been visited for tiered COG indicator
  const [settingsVisited, setSettingsVisited] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('settingsVisited') === 'true';
    }
    return false;
  });
  
  // Cash logging modal state
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashInputRaw, setCashInputRaw] = useState('');
  const [savingCash, setSavingCash] = useState(false);
  
  // Persist userViewEnabled to localStorage
  useEffect(() => {
    localStorage.setItem('userViewEnabled', String(userViewEnabled));
  }, [userViewEnabled]);
  
  // Determine if showcase mode should be used
  // Dev mode: always use demoModeEnabled (no owner access)
  // Production: Owner uses userViewEnabled, non-owner uses demoModeEnabled
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
  const shouldUseShowcase = isDevMode ? demoModeEnabled : (isOwner ? userViewEnabled : demoModeEnabled);

  const fetchDashboard = async (useShowcase = false) => {
    try {
      // In dev mode with demo OFF, show blank (don't fetch real data)
      if (isDevMode && !useShowcase) {
        setData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const url = useShowcase ? '/api/dashboard?showcase=true' : '/api/dashboard';
      const res = await fetch(url);
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      }
      // Fetch global splash duration
      const durationRes = await fetch('/api/settings/splash-duration');
      if (durationRes.ok) {
        const { duration } = await durationRes.json();
        setAnimationDuration(duration);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Check auth first, then fetch with correct showcase mode
    const initDashboard = async () => {
      let useShowcase = shouldUseShowcase;
      
      // Check if user is owner and has their own org (computed server-side)
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          setIsOwner(userData.isOwner === true);
          
          // If user has their own org and hasn't explicitly set demo preference,
          // default to showing their own data (not demo)
          if (userData.hasOwnOrg && localStorage.getItem('demoModeEnabled') === null) {
            setDemoModeEnabled(false);
            localStorage.setItem('demoModeEnabled', 'false');
            useShowcase = false; // Override for this initial fetch
          }
        }
      } catch {
        setIsOwner(false);
      }
      
      // Now fetch dashboard with correct showcase mode
      fetchDashboard(useShowcase);
    };
    initDashboard();
    
    // Re-fetch when tab becomes visible (user returns from Settings)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard(shouldUseShowcase);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Also re-fetch on window focus
    const handleFocus = () => fetchDashboard(shouldUseShowcase);
    window.addEventListener('focus', handleFocus);
    
    // Listen for splash page trigger from owner menu
    const handleShowSplash = () => setShowAnimation(true);
    window.addEventListener('show-splash', handleShowSplash);
    
    // Listen for duration changes from owner menu
    const handleDurationChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setAnimationDuration(customEvent.detail);
    };
    window.addEventListener('splash-duration-change', handleDurationChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('show-splash', handleShowSplash);
      window.removeEventListener('splash-duration-change', handleDurationChange);
    };
  }, [shouldUseShowcase]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard(shouldUseShowcase);
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

  // Auto-decimal cash input: 1114300 becomes 11143.00
  const handleCashInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCashInputRaw(raw);
  };
  
  const cashDisplayValue = cashInputRaw 
    ? (parseInt(cashInputRaw, 10) / 100).toFixed(2)
    : '';
  
  const handleSaveCash = async () => {
    if (!cashInputRaw) return;
    setSavingCash(true);
    try {
      const amount = parseInt(cashInputRaw, 10) / 100;
      const res = await fetch('/api/cash-snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount,
          timestamp: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setShowCashModal(false);
        setCashInputRaw('');
        fetchDashboard(shouldUseShowcase); // Refresh to show new balance
      }
    } catch (error) {
      console.error('Error saving cash:', error);
    } finally {
      setSavingCash(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-xs tracking-widest text-zinc-600">LOADING...</div>
      </div>
    );
  }

  // Check for empty state (dev mode with demo OFF)
  const isEmptyState = isDevMode && !demoModeEnabled;

  // Create empty data for first-time/blank dashboard
  const today = new Date();
  const emptyData: DashboardData = {
    settings: {
      id: 0,
      businessName: '',
      timezone: 'America/Denver',
      salesInputMode: 'NET_SALES_EX_TAX',
      targetCogsPct: 0.30,
      targetFeesPct: 0.03,
      monthlyFixedNut: 0,
      monthlyRoofFund: 0,
      monthlyOwnerDrawGoal: 0,
      openHoursTemplate: { mon: 0, tue: 8, wed: 8, thu: 8, fri: 8, sat: 8, sun: 5 },
      storeCloseHour: 16,
      enableTrueHealth: true,
      enableSpreading: true,
      cashSnapshotAmount: null,
      cashSnapshotAsOf: null,
      yearStartCashAmount: null,
      yearStartCashDate: `${today.getFullYear()}-01-01`,
      operatingFloorCash: 0,
      targetReserveCash: 0,
    },
    mtdNetSales: 0,
    mtdCogsCash: 0,
    mtdOpexCash: 0,
    mtdOwnerDraw: 0,
    mtdCapexCash: 0,
    survivalGoal: 0,
    survivalPercent: 0,
    remainingToGoal: 0,
    dailySalesNeeded: 0,
    cashHealthResult: 0,
    trueHealthResult: 0,
    paceDelta: 0,
    mtdTargetToDate: 0,
    hasCogs: false,
    hasOpex: false,
    actualCogsRate: 0,
    normalizedCogs: 0,
    normalizedCapex: 0,
    confidenceLevel: 'LOW',
    confidenceScore: 0,
    healthScore: 0,
    daysInMonth: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
    currentDay: today.getDate(),
    currentDate: today.toISOString().split('T')[0],
    asOfDate: today.toISOString().split('T')[0],
    asOfDay: today.getDate(),
    salesNotEntered: true,
    avgDailySales: 0,
    pitBoard: { dailyNeeded: 0, remaining: 0, remainingOpenDays: 0 },
    lastYearReference: null,
    cashSnapshot: {
      hasSnapshot: false,
      snapshotAmount: null,
      snapshotAsOf: null,
      changeSince: 0,
      cashNow: 0,
      fillPct: 0,
      isEstimate: true,
      dailyNet90: [],
      runwayPct: null,
    },
    liquidityReceiver: {
      balances: [],
      deltas: [],
      lyEstimates: [],
      estBalanceSeries: [],
      actualBalanceSeries: [],
      mergedBalanceSeries: [],
      anchor: { yearStartCash: 0, isInferred: true, inferenceMethod: 'DEFAULT', confidence: 'LOW' },
      continuityStats: { estCount: 0, actualCount: 0, mergedCount: 0, yearStartDate: `${today.getFullYear()}-01-01`, endDate: today.toISOString().split('T')[0] },
      operatingFloor: 0,
      targetReserve: 0,
      velocity: 0,
      safeToSpend: 0,
      survivalGoal: 0,
      yearStartCashAmount: null,
      yearStartCashDate: `${today.getFullYear()}-01-01`,
      etaToFloor: { etaDays: null, etaMin: null, etaMax: null, isEstimate: true, direction: 'stable' },
      etaToTarget: { etaDays: null, etaMin: null, etaMax: null, isEstimate: true, direction: 'stable' },
      aboveFloor: 0,
      toTarget: 0,
      businessStartDate: null,
      daysInBusiness: null,
    },
  };

  // Calculate setup status for tiered COG indicator
  // When demo is ON: no cog notification (they're viewing demo, not their store)
  // When demo is OFF: show cog notification based on missing data
  const getSetupStatus = (): 'urgent' | 'normal' | 'complete' => {
    // If viewing demo (shouldUseShowcase), don't show setup notifications
    // The hamburger menu will indicate demo mode is active
    if (shouldUseShowcase) {
      return 'complete';
    }
    
    if (!data && isEmptyState) {
      // Blank dashboard - always urgent until settings visited and basics filled
      return 'urgent';
    }
    
    const settings = data?.settings || emptyData.settings;
    const hasBasics = settings.businessName && settings.monthlyFixedNut > 0;
    
    // Urgent: not visited OR missing name/NUT
    if (!settingsVisited || !hasBasics) {
      return 'urgent';
    }
    
    // Check if all sections are filled
    const hasCashSnapshot = settings.cashSnapshotAmount !== null;
    const hasYearStart = settings.yearStartCashAmount !== null;
    const hasLiquidityAnchor = hasCashSnapshot || hasYearStart;
    
    // Normal: has basics but missing other sections
    if (!hasLiquidityAnchor) {
      return 'normal';
    }
    
    // Complete: all critical sections filled
    return 'complete';
  };
  
  const setupStatus = getSetupStatus();
  const needsSetup = setupStatus !== 'complete';

  if (!data && !isEmptyState) {
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
  
  // Use real data or empty data for blank dashboard
  const displayData = data || emptyData;

  const cogsStatus = displayData.actualCogsRate <= displayData.settings.targetCogsPct ? 'good' : 
    displayData.actualCogsRate <= displayData.settings.targetCogsPct + 0.05 ? 'warning' : 'danger';
  
  const cashStatus = displayData.cashHealthResult >= 0 ? 'positive' : 'negative';
  const trueStatus = displayData.trueHealthResult >= 0 ? 'positive' : 'negative';
  
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  // Use asOfDate from API (frozen for showcase) instead of current date
  const asOfDateObj = displayData.asOfDate ? new Date(displayData.asOfDate + 'T12:00:00') : new Date();
  const currentMonth = monthNames[asOfDateObj.getMonth()];

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background - violet accent for premium feel */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute left-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-violet-500/5 blur-[80px]" />
      </div>

      <Nav onRefresh={handleRefresh} refreshing={refreshing} showDashboard={false} setupStatus={setupStatus} />

      <main className="relative z-10 mx-auto max-w-5xl px-3 md:px-6 pt-8 md:pt-8 pb-6 md:pb-8" onClick={() => setActiveTip(null)}>
        
        {/* As-of Date Header - 2x2 grid on mobile, single row on desktop */}
        <section className="mb-4">
          {/* Mobile: 2-column, 2-row grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 md:hidden">
            <span className="text-xs uppercase tracking-widest text-zinc-400">
              {displayData.settings?.businessName || 'TRUEGAUGE'}
            </span>
            <span className="text-xs text-zinc-400 text-right">
              Day {displayData.asOfDay} of {displayData.daysInMonth}
            </span>
            <span className="text-xs uppercase tracking-widest text-zinc-400">
              As of {new Date(displayData.asOfDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {displayData.liquidityReceiver?.daysInBusiness ? (
              <span className="text-xs text-zinc-400 text-right">
                <span className="text-cyan-400 font-medium">{displayData.liquidityReceiver.daysInBusiness.toLocaleString()}</span> Days in Business
              </span>
            ) : <span />}
          </div>
          {displayData.salesNotEntered && (
            <div className="mt-2 md:hidden">
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                Sales not entered for today
              </span>
            </div>
          )}
          
          {/* Desktop: Original single row layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest text-zinc-400">
                {displayData.settings?.businessName || 'TRUEGAUGE'}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-xs uppercase tracking-widest text-zinc-400">
                As of {new Date(displayData.asOfDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-xs text-zinc-400">
                (Day {displayData.asOfDay} of {displayData.daysInMonth})
              </span>
              {displayData.salesNotEntered && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  Sales not entered for today
                </span>
              )}
            </div>
            {displayData.liquidityReceiver?.daysInBusiness && (
              <span className="text-xs text-zinc-400">
                <span className="text-cyan-400 font-medium">{displayData.liquidityReceiver.daysInBusiness.toLocaleString()}</span> Days in Business
              </span>
            )}
          </div>
        </section>

        {/* Month Progress Bar */}
        <section className="mb-8">
          <MonthProgressBar
            current={displayData.asOfDay}
            total={displayData.daysInMonth}
            label={`${currentMonth} Progress`}
            year={asOfDateObj.getFullYear()}
            month={asOfDateObj.getMonth() + 1}
            openHoursTemplate={displayData.settings?.openHoursTemplate}
            onDayClick={(day) => {
              const asOfDateObj = new Date(displayData.asOfDate + 'T12:00:00');
              const year = asOfDateObj.getFullYear();
              const month = asOfDateObj.getMonth() + 1;
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
              <button onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'pace' ? null : 'pace'); }}>
                <SideGauge
                  value={Math.abs(displayData.paceDelta)}
                  label="Pace Delta"
                  subValue={displayData.paceDelta >= 0 ? 'ahead' : 'behind'}
                  variant="left"
                  status={displayData.paceDelta >= 0 ? 'positive' : 'negative'}
                />
              </button>
              {activeTip === 'pace' && (
                <div className="absolute left-full top-0 ml-3 w-64 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100] whitespace-pre-line">
                  <div className="font-medium text-cyan-400 text-base mb-2">Pace Delta: {displayData.paceDelta >= 0 ? '+' : ''}{formatCurrency(displayData.paceDelta)}</div>
                  <p className="text-sm text-zinc-300 mb-2"><strong>{displayData.paceDelta >= 0 ? 'Ahead' : 'Behind'}</strong> of where you need to be this month.</p>
                  <p className="text-sm text-zinc-300 mb-2">Based on day {asOfDateObj.getDate()} of the month, you should have ~{formatCurrency(displayData.mtdTargetToDate)} by now.</p>
                  <p className="text-xs text-zinc-500">MTD: {formatCurrency(displayData.mtdNetSales)}</p>
                </div>
              )}
            </div>
            
            {/* Survival gauge - clickable */}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'survival' ? null : 'survival'); }}>
                <FuturisticGauge
                  value={Math.min(200, displayData.survivalPercent)}
                  label="Survival"
                  subLabel={`Goal: ${formatCurrency(displayData.survivalGoal)}`}
                  size={340}
                  nutTotal={displayData.settings.monthlyFixedNut}
                  nutRemaining={Math.max(0, displayData.settings.monthlyFixedNut - (displayData.mtdNetSales * (1 - displayData.settings.targetCogsPct - displayData.settings.targetFeesPct)))}
                />
              </button>
              {activeTip === 'survival' && (() => {
                const profitMargin = 1 - displayData.settings.targetCogsPct - displayData.settings.targetFeesPct;
                const grossProfit = displayData.mtdNetSales * profitMargin;
                const nutRemaining = Math.max(0, displayData.settings.monthlyFixedNut - grossProfit);
                const nutCovered = Math.min(grossProfit, displayData.settings.monthlyFixedNut);
                const nutPct = Math.round((nutCovered / displayData.settings.monthlyFixedNut) * 100);
                const overage = grossProfit > displayData.settings.monthlyFixedNut ? grossProfit - displayData.settings.monthlyFixedNut : 0;
                const marginPct = Math.round(profitMargin * 100);
                
                return (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[340px] rounded-xl bg-zinc-900/95 border border-cyan-500/20 shadow-2xl z-[100] overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <div className="text-cyan-400 text-lg font-semibold">Survival: {Math.round(displayData.survivalPercent)}%</div>
                      <p className="text-zinc-400 text-xs mt-1">Progress toward covering your monthly fixed costs. At 100%, the business sustains itself.</p>
                    </div>
                    
                    {/* Two Column Layout - Grid aligned */}
                    <div className="grid grid-cols-2 gap-px bg-zinc-800/50">
                      {/* Left Column - Revenue */}
                      <div className="bg-zinc-900/80 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">Revenue</div>
                        
                        <div className="mb-4">
                          <div className="text-zinc-400 text-[11px] font-medium h-4">Month-to-Date Sales</div>
                          <div className="text-white text-xl font-bold">{formatCurrency(displayData.mtdNetSales)}</div>
                        </div>
                        
                        <div>
                          <div className="text-cyan-400 text-[11px] font-medium h-4">Gross Profit</div>
                          <div className="text-zinc-500 text-[10px] h-4">{marginPct}% margin</div>
                          <div className="text-cyan-400 text-xl font-bold">{formatCurrency(grossProfit)}</div>
                        </div>
                      </div>
                      
                      {/* Right Column - Fixed Costs */}
                      <div className="bg-zinc-900/80 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">Fixed Costs</div>
                        
                        <div className="mb-4">
                          <div className="text-zinc-400 text-[11px] font-medium h-4">Monthly NUT</div>
                          <div className="text-white text-xl font-bold">{formatCurrency(displayData.settings.monthlyFixedNut)}</div>
                        </div>
                        
                        <div>
                          <div className="text-emerald-400 text-[11px] font-medium h-4">✓ Covered</div>
                          <div className="text-zinc-500 text-[10px] h-4">{nutPct}% paid</div>
                          <div className="text-emerald-400 text-xl font-bold">{formatCurrency(nutCovered)}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* NUT Remaining - Full Width Cradle */}
                    <div className="px-4 py-3 bg-amber-900/20 border-t border-amber-600/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-amber-400 text-[11px] font-medium uppercase tracking-wider">NUT Remaining (inner arc)</span>
                      </div>
                      <div className="text-amber-400 text-2xl font-bold">{formatCurrency(nutRemaining)}</div>
                      <div className="text-amber-300/60 text-[10px]">Amount still needed to cover this month&apos;s fixed costs</div>
                    </div>
                    
                    {overage > 0 && (
                      <div className="px-4 py-2 bg-emerald-900/30 border-t border-emerald-600/30">
                        <div className="text-emerald-400 text-[11px] font-medium">★ Profit Above NUT</div>
                        <div className="text-emerald-400 text-lg font-bold">+{formatCurrency(overage)}</div>
                      </div>
                    )}
                    
                    {/* Footer */}
                    <div className="px-4 py-3 bg-zinc-800/30 border-t border-zinc-800">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Sales goal (outer arc @ 100%)</span>
                        <span className="text-zinc-300">{formatCurrency(displayData.survivalGoal)}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-zinc-500">Still need to sell</span>
                        <span className="text-cyan-400">{formatCurrency(Math.max(0, displayData.survivalGoal - displayData.mtdNetSales))}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-3 leading-relaxed border-t border-zinc-700/50 pt-2">
                        <span className="text-zinc-300">{formatCurrency(displayData.survivalGoal)}</span> because you only keep <span className="text-cyan-400">{marginPct}%</span> after COGS & fees. That <span className="text-cyan-400">{marginPct}%</span> is your gross profit — it pays the <span className="text-zinc-300">{formatCurrency(displayData.settings.monthlyFixedNut)}</span> NUT.
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* VELOCITY (Operating Speed) - clickable */}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'velocity-gauge' ? null : 'velocity-gauge'); }}>
                <SideGauge
                  value={displayData.avgDailySales || 0}
                  label="VELOCITY"
                  subValue={displayData.avgDailySales ? `$${Math.round(displayData.avgDailySales / 1000 * 10) / 10}k/day` : 'no data'}
                  variant="right"
                  status={displayData.avgDailySales && displayData.avgDailySales > 2000 ? 'positive' : 'neutral'}
                  fillOverride={displayData.avgDailySales ? Math.min(1, displayData.avgDailySales / 5000) : 0}
                />
              </button>
              {activeTip === 'velocity-gauge' && (
                <div className="absolute right-full top-0 mr-3 w-64 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100] whitespace-pre-line text-left">
                  <div className="font-medium text-cyan-400 text-base mb-2">Velocity: {displayData.avgDailySales ? formatCurrency(displayData.avgDailySales) + '/day' : 'N/A'}</div>
                  <p className="text-sm text-zinc-300 mb-2"><strong>Velocity</strong> = your average daily operating speed (sales per open day).</p>
                  <p className="text-sm text-zinc-300 mb-2">Higher velocity means faster cash flow.</p>
                  <p className="text-xs text-zinc-500">Based on {displayData.asOfDay || 0} days of sales data this month.</p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile layout - instruments around dial (4 corners) */}
          <div className="relative md:hidden">
            {/* Main Gauge - centered, clickable for tooltip */}
            <div className="flex justify-center py-4 relative">
              <button onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'survival' ? null : 'survival'); }}>
                <FuturisticGauge
                  value={Math.min(200, displayData.survivalPercent)}
                  label="Survival"
                  subLabel={`Goal: ${formatCurrency(displayData.survivalGoal)}`}
                  size={240}
                  nutTotal={displayData.settings.monthlyFixedNut}
                  nutRemaining={Math.max(0, displayData.settings.monthlyFixedNut - (displayData.mtdNetSales * (1 - displayData.settings.targetCogsPct - displayData.settings.targetFeesPct)))}
                />
              </button>
              {activeTip === 'survival' && (() => {
                const profitMargin = 1 - displayData.settings.targetCogsPct - displayData.settings.targetFeesPct;
                const grossProfit = displayData.mtdNetSales * profitMargin;
                const nutRemaining = Math.max(0, displayData.settings.monthlyFixedNut - grossProfit);
                const nutCovered = Math.min(grossProfit, displayData.settings.monthlyFixedNut);
                const nutPct = Math.round((nutCovered / displayData.settings.monthlyFixedNut) * 100);
                const marginPct = Math.round(profitMargin * 100);
                
                return (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[300px] rounded-xl bg-zinc-900/95 border border-cyan-500/20 shadow-2xl z-[100] overflow-hidden">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <div className="text-cyan-400 text-base font-semibold">Survival: {Math.round(displayData.survivalPercent)}%</div>
                      <p className="text-zinc-400 text-[10px] mt-0.5">Progress toward covering monthly fixed costs.</p>
                    </div>
                    
                    {/* Two Column Layout - Grid aligned */}
                    <div className="grid grid-cols-2 gap-px bg-zinc-800/50">
                      <div className="bg-zinc-900/80 p-2">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-2">Revenue</div>
                        <div className="mb-3">
                          <div className="text-zinc-400 text-[10px] h-3.5">Sales (MTD)</div>
                          <div className="text-white text-base font-bold">{formatCurrency(displayData.mtdNetSales)}</div>
                        </div>
                        <div>
                          <div className="text-cyan-400 text-[10px] h-3.5">Gross Profit</div>
                          <div className="text-zinc-500 text-[9px] h-3">{marginPct}% margin</div>
                          <div className="text-cyan-400 text-base font-bold">{formatCurrency(grossProfit)}</div>
                        </div>
                      </div>
                      <div className="bg-zinc-900/80 p-2">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-2">Fixed Costs</div>
                        <div className="mb-3">
                          <div className="text-zinc-400 text-[10px] h-3.5">Monthly NUT</div>
                          <div className="text-white text-base font-bold">{formatCurrency(displayData.settings.monthlyFixedNut)}</div>
                        </div>
                        <div>
                          <div className="text-emerald-400 text-[10px] h-3.5">✓ Covered</div>
                          <div className="text-zinc-500 text-[9px] h-3">{nutPct}% paid</div>
                          <div className="text-emerald-400 text-base font-bold">{formatCurrency(nutCovered)}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* NUT Remaining - Full Width Cradle */}
                    <div className="px-3 py-2 bg-amber-900/20 border-t border-amber-600/30">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-amber-400 text-[10px] font-medium uppercase tracking-wider">NUT Remaining</span>
                      </div>
                      <div className="text-amber-400 text-xl font-bold">{formatCurrency(nutRemaining)}</div>
                    </div>
                    
                    {/* Footer */}
                    <div className="px-3 py-2 bg-zinc-800/30 border-t border-zinc-800">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-zinc-500">Still need</span>
                        <span className="text-cyan-400">{formatCurrency(Math.max(0, displayData.survivalGoal - displayData.mtdNetSales))}</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 mt-2 leading-relaxed border-t border-zinc-700/50 pt-1.5">
                        <span className="text-zinc-300">{formatCurrency(displayData.survivalGoal)}</span> because you only keep <span className="text-cyan-400">{marginPct}%</span> after COGS & fees.
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Top-left: Pace Delta - clickable */}
            <button 
              className="absolute top-0 left-1"
              onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'pace' ? null : 'pace'); }}
            >
              <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">Pace Delta</div>
              <div className="flex gap-1 items-start" style={{ flexDirection: 'row-reverse' }}>
                {Array.from({ length: 8 }).map((_, i) => {
                  const filled = i < Math.min(8, Math.round((Math.abs(displayData.paceDelta) / 8000) * 8));
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
              <div className="absolute left-0 top-full mt-2 w-64 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100] whitespace-pre-line">
                <div className="font-medium text-cyan-400 text-base mb-2">Pace Delta: {displayData.paceDelta >= 0 ? '+' : ''}{formatCurrency(displayData.paceDelta)}</div>
                <p className="text-sm text-zinc-300 mb-2"><strong>{displayData.paceDelta >= 0 ? 'Ahead' : 'Behind'}</strong> of where you need to be this month.</p>
                <p className="text-sm text-zinc-300 mb-2">Based on day {asOfDateObj.getDate()} of the month, you should have {formatCurrency(displayData.mtdTargetToDate)} by now.</p>
                <p className="text-xs text-zinc-500">MTD: {formatCurrency(displayData.mtdNetSales)}</p>
              </div>
            )}
            
            {/* Top-right: Velocity - clickable */}
            <button 
              className="absolute top-0 right-1 text-right"
              onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'velocity' ? null : 'velocity'); }}
            >
              {(() => {
                // Use asOfDate from API (frozen for showcase) instead of current date
                const asOf = displayData.asOfDate ? new Date(displayData.asOfDate + 'T12:00:00') : new Date();
                const dayOfMonth = asOf.getDate();
                const daysInMonth = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0).getDate();
                const actualDailyAvg = dayOfMonth > 0 ? displayData.mtdNetSales / dayOfMonth : 0;
                const requiredDailyAvg = displayData.survivalGoal / daysInMonth;
                const velocity = requiredDailyAvg > 0 ? actualDailyAvg / requiredDailyAvg : 0;
                const velocityStatus = velocity >= 1 ? 'positive' : 'negative';
                
                return (
                  <>
                    <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">Velocity</div>
                    <div className="flex gap-1 justify-end items-start">
                      {Array.from({ length: 8 }).map((_, i) => {
                        const filled = i < Math.min(8, Math.round(velocity * 4));
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
                  </>
                );
              })()}
            </button>
            {activeTip === 'velocity' && (() => {
              const asOf = displayData.asOfDate ? new Date(displayData.asOfDate + 'T12:00:00') : new Date();
              const dayOfMonth = asOf.getDate();
              const daysInMonth = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0).getDate();
              const actualDailyAvg = dayOfMonth > 0 ? displayData.mtdNetSales / dayOfMonth : 0;
              const requiredDailyAvg = displayData.survivalGoal / daysInMonth;
              const velocity = requiredDailyAvg > 0 ? actualDailyAvg / requiredDailyAvg : 0;
              
              return (
                <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-lg bg-zinc-900/95 border border-cyan-500/30 shadow-lg z-[100] whitespace-pre-line text-left">
                  <div className="font-medium text-cyan-400 text-base mb-2">Velocity: {velocity.toFixed(2)}x</div>
                  <p className="text-sm text-zinc-300 mb-2"><strong>{velocity >= 1 ? 'Revving hot!' : 'Need more throttle'}</strong> — {velocity >= 1 ? 'ahead' : 'behind'} of required pace.</p>
                  <div className="text-xs text-zinc-500 space-y-1 mb-3">
                    <div>Avg/day: {formatCurrency(actualDailyAvg)}</div>
                    <div>Need/day: {formatCurrency(requiredDailyAvg)}</div>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-400">
                    <div className="font-medium mb-1">Gauge Guide:</div>
                    <div className="space-y-0.5">
                      <div><span className="text-cyan-400">4 bars</span> = on pace (1.0x)</div>
                      <div><span className="text-emerald-400">5-8 bars</span> = ahead, crushing it</div>
                      <div><span className="text-red-400">&lt;4 bars</span> = behind, accelerate</div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Bottom-left: Pace Delta value */}
            <div className="absolute bottom-0 left-1">
              <div className={`text-lg font-bold ${displayData.paceDelta >= 0 ? 'text-cyan-400' : 'text-red-400'}`}
                   style={{ textShadow: `0 0 12px ${displayData.paceDelta >= 0 ? '#22d3ee' : '#ef4444'}` }}>
                {displayData.paceDelta >= 0 ? '+' : '-'}${(Math.abs(displayData.paceDelta) / 1000).toFixed(1)}k
              </div>
              <div className="text-[9px] text-zinc-500">{displayData.paceDelta >= 0 ? 'ahead' : 'behind'}</div>
            </div>
            
            {/* Bottom-right: Velocity value */}
            {(() => {
              const asOf = displayData.asOfDate ? new Date(displayData.asOfDate + 'T12:00:00') : new Date();
              const dayOfMonth = asOf.getDate();
              const daysInMonth = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0).getDate();
              const actualDailyAvg = dayOfMonth > 0 ? displayData.mtdNetSales / dayOfMonth : 0;
              const requiredDailyAvg = displayData.survivalGoal / daysInMonth;
              const velocity = requiredDailyAvg > 0 ? actualDailyAvg / requiredDailyAvg : 0;
              const velocityStatus = velocity >= 1 ? 'positive' : 'negative';
              
              return (
                <div className="absolute bottom-0 right-1 text-right">
                  <div className={`text-lg font-bold ${velocityStatus === 'positive' ? 'text-cyan-400' : 'text-red-400'}`}
                       style={{ textShadow: `0 0 12px ${velocityStatus === 'positive' ? '#22d3ee' : '#ef4444'}` }}>
                    {velocity.toFixed(2)}x
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    {velocity >= 1 ? 'on pace' : 'behind'}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Last Year Reference */}
          {displayData.lastYearReference && (
            <div className="mt-2 flex justify-center">
              <div className="flex items-center gap-4 text-xs">
                <div className="text-zinc-500">
                  <span className="text-zinc-600">LY {displayData.lastYearReference.year}:</span>{' '}
                  <span className="text-zinc-400">{formatCurrency(displayData.lastYearReference.netSales)}</span>
                </div>
                <div className={`font-medium ${displayData.lastYearReference.vsLastYearPace >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {displayData.lastYearReference.vsLastYearPace >= 0 ? '+' : ''}
                  {formatCurrency(displayData.lastYearReference.vsLastYearPace)}
                  <span className="text-zinc-600 font-normal ml-1">vs pace (est)</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Liquidity Card - below cluster, above Pit Board */}
        <LiquidityCard
          hasSnapshot={displayData.cashSnapshot.hasSnapshot}
          snapshotAmount={displayData.cashSnapshot.snapshotAmount}
          snapshotAsOf={displayData.cashSnapshot.snapshotAsOf}
          cashNow={displayData.cashSnapshot.cashNow}
          changeSince={displayData.cashSnapshot.changeSince}
          isEstimate={displayData.cashSnapshot.isEstimate}
          runwayPct={displayData.cashSnapshot.runwayPct}
          monthlyFixedNut={displayData.settings.monthlyFixedNut}
          asOfDate={displayData.asOfDate}
          confidenceLevel={displayData.confidenceLevel}
          liquidityReceiver={displayData.liquidityReceiver}
          onSetSnapshot={() => router.push('/settings')}
          timezone={displayData.settings.timezone}
        />

        {/* Pit Board - Daily Needed from Here */}
        <section className="mb-10 relative">
          <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-5 backdrop-blur-sm overflow-visible">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Pit Board</h3>
              {displayData.confidenceLevel !== 'HIGH' && (
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  displayData.confidenceLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {displayData.confidenceLevel === 'MEDIUM' ? 'Medium confidence' : 'Low confidence'}
                </span>
              )}
            </div>
            
            {displayData.pitBoard.remainingOpenDays === 0 ? (
              <div className="text-center py-2">
                <div className="text-lg font-light text-zinc-400">No open days remaining</div>
                <div className="text-xs text-zinc-600 mt-1">
                  {displayData.pitBoard.remaining <= 0 ? 'Goal achieved!' : `${formatCurrency(displayData.pitBoard.remaining)} still needed`}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                {(() => {
                  const isOver = displayData.pitBoard.remaining < 0;
                  const surplus = Math.abs(displayData.pitBoard.remaining);
                  const surplusPerDay = surplus / Math.max(1, displayData.pitBoard.remainingOpenDays);
                  
                  return (
                    <>
                      <div 
                        className="relative cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'daily' ? null : 'daily'); }}
                      >
                        <div className={`text-2xl font-bold ${isOver ? 'text-emerald-400' : 'text-cyan-400'}`} style={{ textShadow: isOver ? '0 0 20px #34d399' : '0 0 20px #22d3ee' }}>
                          {isOver ? '+' + formatCurrency(surplusPerDay) : formatCurrency(displayData.pitBoard.dailyNeeded)}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{isOver ? 'Bonus/Day' : 'Daily Needed'}</div>
                        {activeTip === 'daily' && (
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                            {isOver ? (
                              <>
                                <div className="text-emerald-400 text-base font-medium mb-1">+{formatCurrency(surplus)} over goal</div>
                                <div className="text-zinc-300 text-sm mb-2">÷ {displayData.pitBoard.remainingOpenDays} days = <span className="text-emerald-400">+{formatCurrency(surplusPerDay)}/day</span></div>
                              </>
                            ) : (
                              <>
                                <div className="text-cyan-400 text-base font-medium mb-1">{formatCurrency(displayData.pitBoard.remaining)} ÷ {displayData.pitBoard.remainingOpenDays} days</div>
                                <div className="text-zinc-300 text-sm mb-2">= {formatCurrency(displayData.pitBoard.dailyNeeded)} per open day</div>
                              </>
                            )}
                            <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                              {isOver ? 'Extra earnings above survival goal spread across remaining days.' : `Average needed each open day to reach your ${formatCurrency(displayData.survivalGoal)} survival goal.`}
                            </div>
                          </div>
                        )}
                      </div>
                      <div 
                        className="relative cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'remaining' ? null : 'remaining'); }}
                      >
                        <div className={`text-xl font-light ${isOver ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {isOver ? '+' + formatCurrency(surplus) : formatCurrency(displayData.pitBoard.remaining)}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{isOver ? 'Surplus' : 'Remaining'}</div>
                        {activeTip === 'remaining' && (
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-56 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm"><span className="text-zinc-500">Goal:</span><span className="text-zinc-300">{formatCurrency(displayData.survivalGoal)}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-zinc-500">MTD Sales:</span><span className="text-zinc-300">{formatCurrency(displayData.mtdNetSales)}</span></div>
                              <div className="border-t border-zinc-700 pt-2 flex justify-between font-medium text-sm">
                                <span className="text-zinc-400">{isOver ? 'Surplus:' : 'Remaining:'}</span>
                                <span className={isOver ? 'text-emerald-400' : 'text-cyan-400'}>{isOver ? '+' : ''}{formatCurrency(isOver ? surplus : displayData.pitBoard.remaining)}</span>
                              </div>
                              <div className="text-xs text-zinc-500 pt-1">{isOver ? 'You\'ve exceeded your survival goal!' : 'Updates as you enter daily sales.'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
                <div 
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === 'opendays' ? null : 'opendays'); }}
                >
                  <div className="text-xl font-light text-zinc-300">
                    {displayData.pitBoard.remainingOpenDays}
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
              <div className="text-lg font-light" style={{ color: displayData.mtdNetSales > 0 ? '#22d3ee' : '#a1a1aa' }}>{formatCurrency(displayData.mtdNetSales)}</div>
              {displayData.mtdNetSales === 0 && <div className="text-xs text-zinc-500">no entries</div>}
              {activeTip === 'mtd' && (
                <div className="absolute left-0 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Month-to-Date Net Sales</div>
                  <div className="text-sm text-zinc-300 mb-2">Sum of all daily net sales entries for {asOfDateObj.toLocaleDateString('en-US', { month: 'long' })}.</div>
                  <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                    {displayData.mtdNetSales > 0 
                      ? `${displayData.asOfDay} day${displayData.asOfDay > 1 ? 's' : ''} of data entered. Avg: ${formatCurrency(Math.round(displayData.mtdNetSales / displayData.asOfDay))}/day`
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
              <div className="text-lg font-light" style={{ color: displayData.hasCogs ? (cogsStatus === 'good' ? '#22d3ee' : cogsStatus === 'warning' ? '#f59e0b' : '#ef4444') : '#a1a1aa' }}>
                {displayData.hasCogs ? formatPercent(displayData.actualCogsRate) : `Est ${formatPercent(displayData.settings.targetCogsPct)}`}
              </div>
              <div className="text-xs text-zinc-500">{displayData.hasCogs ? `target ${formatPercent(displayData.settings.targetCogsPct)}` : 'not logged'}</div>
              {activeTip === 'cogs' && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Cost of Goods Sold</div>
                  <div className="text-sm text-zinc-300 mb-2">Direct costs to produce what you sell (inventory, ingredients, supplies).</div>
                  {displayData.hasCogs ? (
                    <div className="border-t border-zinc-700 pt-2 space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-zinc-500">COGS logged:</span><span className="text-zinc-300">{formatCurrency(displayData.mtdCogsCash)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-zinc-500">As % of sales:</span><span className="text-zinc-300">{formatPercent(displayData.actualCogsRate)}</span></div>
                      <div className="text-xs text-zinc-500 mt-1">Target: {formatPercent(displayData.settings.targetCogsPct)} — {displayData.actualCogsRate <= displayData.settings.targetCogsPct ? '✓ On track' : '⚠️ Over target'}</div>
                    </div>
                  ) : (
                    <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                      Using estimated {formatPercent(displayData.settings.targetCogsPct)}. Log COGS expenses for actual tracking.
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
              <div className="text-lg font-light" style={{ color: '#a1a1aa' }}>{displayData.hasOpex ? formatCurrency(displayData.mtdOpexCash) : '$0'}</div>
              {!displayData.hasOpex && <div className="text-xs text-zinc-500">not logged</div>}
              {activeTip === 'opex' && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Operating Expenses</div>
                  <div className="text-sm text-zinc-300 mb-2">Day-to-day costs not tied to products: utilities, supplies, repairs, misc.</div>
                  {displayData.hasOpex ? (
                    <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                      {formatCurrency(displayData.mtdOpexCash)} logged this month. These reduce your Cash Health score.
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
              <div className="text-lg font-light" style={{ color: displayData.cashHealthResult >= 0 ? '#22d3ee' : '#ef4444' }}>{formatCurrency(displayData.cashHealthResult)}</div>
              <div className="text-xs text-zinc-500">{displayData.confidenceLevel === 'LOW' ? 'missing expenses?' : 'sales − expenses'}</div>
              {activeTip === 'cashlogged' && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Cash Health (Logged)</div>
                  <div className="text-sm text-zinc-300 mb-2">Net cash flow based on what you've actually recorded.</div>
                  <div className="border-t border-zinc-700 pt-2 space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-zinc-500">MTD Sales:</span><span className="text-zinc-300">{formatCurrency(displayData.mtdNetSales)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-zinc-500">− COGS:</span><span className="text-zinc-300">{formatCurrency(displayData.mtdCogsCash)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-zinc-500">− OPEX:</span><span className="text-zinc-300">{formatCurrency(displayData.mtdOpexCash)}</span></div>
                    <div className="flex justify-between font-medium text-sm pt-1 border-t border-zinc-700"><span className="text-zinc-400">= Cash:</span><span className={displayData.cashHealthResult >= 0 ? 'text-cyan-400' : 'text-red-400'}>{formatCurrency(displayData.cashHealthResult)}</span></div>
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
              <div className="text-lg font-light" style={{ color: displayData.confidenceLevel === 'HIGH' ? '#22d3ee' : displayData.confidenceLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444' }}>
                {displayData.confidenceLevel}
              </div>
              <div className="text-xs text-zinc-500">{displayData.confidenceLevel === 'HIGH' ? 'data complete' : displayData.confidenceLevel === 'MEDIUM' ? 'log expenses' : 'needs data'}</div>
              {activeTip === 'confidence' && (
                <div className="absolute right-0 bottom-full mb-2 z-[100] w-64 p-4 rounded-lg border border-cyan-500/30 bg-zinc-900/95 shadow-lg text-left">
                  <div className="text-cyan-400 text-base font-medium mb-1">Data Confidence: {displayData.confidenceScore}</div>
                  <div className="text-sm text-zinc-300 mb-2">How complete your logged data is. Higher = more accurate health calculations.</div>
                  <div className="border-t border-zinc-700 pt-2 text-xs text-zinc-500">
                    <div className="mb-1 font-medium">Factors:</div>
                    <div>• Sales entries: {displayData.mtdNetSales > 0 ? '✓' : '✗'}</div>
                    <div>• COGS logged: {displayData.hasCogs ? '✓' : '✗'}</div>
                    <div>• OPEX logged: {displayData.hasOpex ? '✓' : '✗'}</div>
                    {displayData.confidenceLevel !== 'HIGH' && (
                      <div className="mt-2 text-amber-400">Log missing data to improve accuracy.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Quick Actions - 5 column grid matching info section */}
        <section>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
            {/* Enter Sales - bright cyan */}
            <button
              onClick={() => router.push('/diary')}
              className="group relative h-12 md:h-14 overflow-hidden rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-sm font-light tracking-wide text-cyan-300 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Enter Sales
              </div>
            </button>
            {/* Log Cash - emerald */}
            <button
              onClick={() => setShowCashModal(true)}
              className="group relative h-12 md:h-14 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-sm font-light tracking-wide text-emerald-300 backdrop-blur-sm transition-all hover:border-emerald-400/50 hover:bg-emerald-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-center gap-2">
                <Wallet className="h-4 w-4" />
                Log Cash
              </div>
            </button>
            {/* Add Expense - amber */}
            <button
              onClick={() => router.push('/diary')}
              className="group relative h-12 md:h-14 overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm font-light tracking-wide text-amber-300 backdrop-blur-sm transition-all hover:border-amber-400/50 hover:bg-amber-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-center gap-2">
                <Receipt className="h-4 w-4" />
                Add Expense
              </div>
            </button>
            {/* Month View - violet */}
            <button
              onClick={() => router.push(shouldUseShowcase ? '/calendar?showcase=true' : '/calendar')}
              className="group relative h-12 md:h-14 overflow-hidden rounded-lg border border-violet-500/30 bg-violet-500/10 text-sm font-light tracking-wide text-violet-300 backdrop-blur-sm transition-all hover:border-violet-400/50 hover:bg-violet-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/10 to-violet-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Month View
              </div>
            </button>
            {/* Annual Report - blue */}
            <button
              onClick={() => router.push('/annual')}
              className="col-span-2 md:col-span-1 group relative h-12 md:h-14 overflow-hidden rounded-lg border border-blue-500/30 bg-blue-500/10 text-sm font-light tracking-wide text-blue-300 backdrop-blur-sm transition-all hover:border-blue-400/50 hover:bg-blue-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Annual Report
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Footer - subtle */}
      <footer className="relative z-10 py-6 px-6">
        <div className="flex items-center justify-center max-w-6xl mx-auto">
          <span className="text-sm tracking-widest text-zinc-700">
            <span className="font-bold">TRUE</span><span className="font-light">GAUGE</span> • LOCAL-FIRST
          </span>
        </div>
      </footer>

      {/* Startup Animation Overlay */}
      {showAnimation && (
        <StartupAnimation 
          duration={animationDuration}
          onComplete={() => setShowAnimation(false)}
        />
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Cash Logging Modal */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-sm rounded-xl border border-zinc-700/50 bg-zinc-900/95 p-6 shadow-2xl">
            <button
              onClick={() => { setShowCashModal(false); setCashInputRaw(''); }}
              className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="mb-6 flex items-center gap-2 text-emerald-400">
              <Wallet className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-widest">Log Cash on Hand</span>
            </div>
            
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-500">$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0.00"
                value={cashDisplayValue}
                onChange={handleCashInput}
                autoFocus
                className="h-16 w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 pl-12 pr-4 text-3xl font-bold text-emerald-400 outline-none focus:border-emerald-500/50"
                style={{ textShadow: '0 0 20px rgba(52, 211, 153, 0.3)' }}
              />
            </div>
            
            <p className="mb-4 text-xs text-zinc-500">
              Type digits only (1114300 → $11,143.00)
            </p>
            
            <button
              onClick={handleSaveCash}
              disabled={savingCash || !cashInputRaw}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 py-3 font-light tracking-wide text-emerald-300 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {savingCash ? 'Saving...' : 'Save Cash Balance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
