import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as calc from '@/lib/calc';
import { DEFAULT_SETTINGS } from '@/lib/types';

interface DayEntryRecord {
  id: number;
  date: string;
  netSalesExTax: number | null;
  notes: string | null;
}

interface ExpenseRecord {
  id: number;
  date: string;
  vendorName: string;
  category: string;
  amount: number;
  memo: string | null;
  spreadMonths: number | null;
}

export async function GET() {
  try {
    // Get settings first to use configured timezone
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          businessName: DEFAULT_SETTINGS.businessName,
          timezone: DEFAULT_SETTINGS.timezone,
          salesInputMode: DEFAULT_SETTINGS.salesInputMode,
          targetCogsPct: DEFAULT_SETTINGS.targetCogsPct,
          targetFeesPct: DEFAULT_SETTINGS.targetFeesPct,
          monthlyFixedNut: DEFAULT_SETTINGS.monthlyFixedNut,
          monthlyRoofFund: DEFAULT_SETTINGS.monthlyRoofFund,
          monthlyOwnerDrawGoal: DEFAULT_SETTINGS.monthlyOwnerDrawGoal,
          openHoursTemplate: JSON.stringify(DEFAULT_SETTINGS.openHoursTemplate),
          enableTrueHealth: DEFAULT_SETTINGS.enableTrueHealth,
          enableSpreading: DEFAULT_SETTINGS.enableSpreading,
        },
      });
    }
    
    // Get current date in user's configured timezone
    const now = new Date();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: settings.timezone }));
    
    const year = localTime.getFullYear();
    const month = localTime.getMonth() + 1; // 1-12
    const day = localTime.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const todayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    
    const openHoursTemplate = JSON.parse(settings.openHoursTemplate) as calc.OpenHoursTemplate;
    
    // Get MTD day entries
    const dayEntries: DayEntryRecord[] = await prisma.dayEntry.findMany({
      where: { date: { startsWith: monthStr } },
    });
    
    // Determine asOfDate: max date with sales entered, or today if none
    const entriesWithSales = dayEntries.filter(e => e.netSalesExTax !== null && e.netSalesExTax > 0);
    const asOfDate = entriesWithSales.length > 0
      ? entriesWithSales.reduce((max, e) => e.date > max ? e.date : max, entriesWithSales[0].date)
      : todayStr;
    const asOfDay = parseInt(asOfDate.split('-')[2], 10);
    
    // Check if today > asOfDate and today is an open day (sales not entered yet)
    // Only show warning after store closing time (from settings)
    const todayIsOpenDay = calc.isOpenDay(todayStr, openHoursTemplate);
    const currentHour = localTime.getHours();
    const storeCloseHour = settings.storeCloseHour ?? 16; // default 4 PM
    const afterStoreClose = currentHour >= storeCloseHour;
    const salesNotEntered = todayStr > asOfDate && todayIsOpenDay && afterStoreClose;
    
    // Get MTD expenses (up to asOfDate for consistency)
    const expenses: ExpenseRecord[] = await prisma.expenseTransaction.findMany({
      where: { date: { startsWith: monthStr } },
    });
    
    // Get historical spread expenses (from previous months that might still be active)
    const allSpreadExpenses: ExpenseRecord[] = await prisma.expenseTransaction.findMany({
      where: {
        spreadMonths: { gte: 2 },
      },
    });
    
    // Get last year reference for this month
    const lastYearRef = await prisma.referenceMonth.findUnique({
      where: { year_month: { year: year - 1, month } },
    });
    
    // Calculate MTD totals (only entries up to asOfDate)
    const mtdNetSales = dayEntries
      .filter(e => e.date <= asOfDate)
      .reduce((sum: number, entry: DayEntryRecord) => sum + (entry.netSalesExTax || 0), 0
    );
    
    const mtdCogsCash = expenses
      .filter((e: ExpenseRecord) => e.category === 'COGS')
      .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
    
    const mtdOpexCash = expenses
      .filter((e: ExpenseRecord) => e.category === 'OPEX')
      .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
    
    const mtdOwnerDraw = expenses
      .filter((e: ExpenseRecord) => e.category === 'OWNER_DRAW')
      .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
    
    const mtdCapexCash = expenses
      .filter((e: ExpenseRecord) => e.category === 'CAPEX')
      .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
    
    // Calculate goals
    const survivalGoal = calc.survivalGoalNetExTax(
      settings.monthlyFixedNut,
      settings.targetCogsPct,
      settings.targetFeesPct
    );
    
    const survivalPct = calc.survivalPercent(mtdNetSales, survivalGoal);
    const remaining = calc.remainingToGoal(mtdNetSales, survivalGoal);
    
    // Hours-weighted Pace Delta calculations (based on asOfDate, not today)
    const paceTarget = calc.mtdTargetToDateHoursWeighted(asOfDate, survivalGoal, openHoursTemplate);
    const paceResult = calc.paceDeltaHoursWeighted(mtdNetSales, asOfDate, survivalGoal, openHoursTemplate);
    
    // Check if any COGS or OPEX have been logged
    const hasCogs = expenses.some((e: ExpenseRecord) => e.category === 'COGS');
    const hasOpex = expenses.some((e: ExpenseRecord) => e.category === 'OPEX');
    
    // Calculate daily needed from here (pit board number)
    const pitBoard = calc.dailyNeededFromHere(asOfDate, mtdNetSales, survivalGoal, openHoursTemplate);
    const dailyNeeded = pitBoard.dailyNeeded === Infinity ? 0 : pitBoard.dailyNeeded;
    
    // Calculate health results
    const monthData: calc.MonthData = {
      mtdNetSales,
      mtdCogsCash,
      mtdOpexCash,
      mtdOwnerDraw,
      mtdCapexCash,
    };
    
    const cashResult = calc.cashHealthResult(monthData, settings.monthlyRoofFund);
    
    // Get ALL spread expenses for True Health (including historical)
    const spreadExpenses = allSpreadExpenses.map((e: ExpenseRecord) => ({
      amount: e.amount,
      spreadMonths: e.spreadMonths!,
      startDate: e.date,
      category: e.category as 'COGS' | 'OPEX' | 'CAPEX' | 'OTHER',
    }));
    
    // Calculate normalized COGS for True Health
    // Start with this month's non-spread COGS
    const nonSpreadCogs = expenses
      .filter((e: ExpenseRecord) => e.category === 'COGS' && (!e.spreadMonths || e.spreadMonths < 2))
      .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
    
    // Add monthly portions of all active spread COGS expenses
    let spreadCogsThisMonth = 0;
    for (const expense of spreadExpenses) {
      if (expense.category !== 'COGS') continue;
      const isActive = calc.isSpreadExpenseActiveInMonth(
        expense.startDate,
        expense.spreadMonths,
        year,
        month
      );
      if (isActive) {
        spreadCogsThisMonth += calc.spreadExpenseMonthlyPortion(
          expense.amount,
          expense.spreadMonths
        );
      }
    }
    const normalizedCogsValue = nonSpreadCogs + spreadCogsThisMonth;
    
    // Calculate normalized CAPEX for True Health
    let normalizedCapex = 0;
    for (const expense of spreadExpenses) {
      if (expense.category !== 'CAPEX') continue;
      const isActive = calc.isSpreadExpenseActiveInMonth(
        expense.startDate,
        expense.spreadMonths,
        year,
        month
      );
      if (isActive) {
        normalizedCapex += calc.spreadExpenseMonthlyPortion(
          expense.amount,
          expense.spreadMonths
        );
      }
    }
    
    const trueResult = calc.trueHealthResult(
      monthData,
      settings.monthlyRoofFund,
      normalizedCogsValue,
      normalizedCapex
    );
    
    // Calculate actual COGS %
    const actualCogs = calc.actualCogsRate(mtdCogsCash, mtdNetSales);
    
    // Calculate confidence
    const daysWithData = dayEntries.filter((e: DayEntryRecord) => e.netSalesExTax !== null).length;
    const hasRecentExpenses = expenses.some((e: ExpenseRecord) => {
      const expenseDate = new Date(e.date);
      const sevenDaysAgo = new Date(localTime);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return expenseDate >= sevenDaysAgo;
    });
    
    const confidenceFactors: calc.ConfidenceFactors = {
      hasSalesData: mtdNetSales > 0,
      hasRecentExpenses,
      daysWithData,
      totalDaysInPeriod: day,
    };
    
    const confidence = calc.confidenceLevel(confidenceFactors);
    const confScore = calc.confidenceScore(confidenceFactors);
    
    // Calculate health score
    const score = calc.healthScore(
      mtdNetSales,
      survivalGoal,
      actualCogs,
      settings.targetCogsPct,
      mtdOpexCash,
      settings.monthlyFixedNut,
      confScore
    );
    
    // Calculate cash snapshot data for liquidity card
    const hasSnapshot = settings.cashSnapshotAmount !== null && settings.cashSnapshotAsOf !== null;
    let changeSince = 0;
    let cashNow = 0;
    let fillPct = 0;
    
    // Fetch all day entries and expenses for liquidity calculations (scoped outside if block)
    let allDayEntries: { date: string; netSalesExTax: number | null }[] = [];
    let allExpenses: { date: string; amount: number }[] = [];
    
    if (hasSnapshot && settings.cashSnapshotAsOf) {
      // Get ALL day entries and expenses for changeSince calculation (not just MTD)
      const dayEntriesRaw = await prisma.dayEntry.findMany({
        where: { date: { gt: settings.cashSnapshotAsOf, lte: asOfDate } },
      });
      const expensesRaw = await prisma.expenseTransaction.findMany({
        where: { date: { gt: settings.cashSnapshotAsOf, lte: asOfDate } },
      });
      
      allDayEntries = dayEntriesRaw.map(e => ({ date: e.date, netSalesExTax: e.netSalesExTax }));
      allExpenses = expensesRaw.map(e => ({ date: e.date, amount: e.amount }));
      
      changeSince = calc.changeSinceSnapshot(
        settings.cashSnapshotAsOf,
        asOfDate,
        allDayEntries,
        allExpenses
      );
      cashNow = calc.cashOnHand(settings.cashSnapshotAmount!, changeSince);
      fillPct = calc.cashFillPct(cashNow, settings.monthlyFixedNut);
    }
    
    // Build Liquidity Receiver data using pure calc helpers
    const referenceMonths = await prisma.referenceMonth.findMany({
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
    
    // Fetch cash injections for capital tracking
    const cashInjections = await prisma.cashInjection.findMany({
      orderBy: { date: 'asc' },
    });
    
    // Calculate date range for liquidity receiver
    // Start from business start (earliest reference data)
    const receiverEndDate = asOfDate;
    
    // Find earliest reference month to determine business start
    let receiverStartDate = calc.addDays(asOfDate, -364); // default: 52 weeks back
    
    if (referenceMonths.length > 0) {
      const earliestRef = referenceMonths.reduce((earliest, r) => {
        if (r.year < earliest.year || (r.year === earliest.year && r.month < earliest.month)) {
          return r;
        }
        return earliest;
      }, referenceMonths[0]);
      
      // Start from earliest reference month (business start)
      // Reference line will be zero for periods without prior year data
      const refStartDate = `${earliestRef.year}-${String(earliestRef.month).padStart(2, '0')}-01`;
      receiverStartDate = refStartDate;
    }
    
    // Generate LY estimates from ReferenceMonth using hours weighting
    const lyEstimates = calc.referenceMonthsToWeeklyLYEstimate(
      referenceMonths.map(r => ({
        year: r.year,
        month: r.month,
        referenceNetSalesExTax: r.referenceNetSalesExTax,
      })),
      openHoursTemplate,
      receiverStartDate,
      receiverEndDate
    );
    
    // Generate cash balance series from snapshot (ACTUAL data)
    const balances = hasSnapshot
      ? calc.cashBalanceSeriesFromSnapshot(
          settings.cashSnapshotAmount!,
          settings.cashSnapshotAsOf!,
          allDayEntries,
          allExpenses,
          receiverStartDate,
          receiverEndDate
        )
      : [];
    
    // Generate delta series from balances
    const deltas = calc.weeklyDeltaSeriesFromBalance(balances);
    
    // ═══ CAPITAL INVESTED SERIES: Net cumulative (injections - withdrawals) ═══
    // Build weekly series showing net capital at each point
    const capitalSeries = lyEstimates.map(week => {
      // Sum all transactions up to and including this week's end date
      const weekEnd = week.weekEnd || week.weekStart;
      const relevantTransactions = cashInjections.filter((inj: { date: string }) => inj.date <= weekEnd);
      const totalIn = relevantTransactions
        .filter((inj: { type: string }) => inj.type === 'injection' || !inj.type)
        .reduce((sum: number, inj: { amount: number }) => sum + inj.amount, 0);
      const totalOut = relevantTransactions
        .filter((inj: { type: string }) => inj.type === 'withdrawal')
        .reduce((sum: number, inj: { amount: number }) => sum + inj.amount, 0);
      return {
        weekEnd,
        capital: totalIn - totalOut,
      };
    });
    
    // Net capital invested (for display)
    const totalIn = cashInjections
      .filter((inj: { type: string }) => inj.type === 'injection' || !inj.type)
      .reduce((sum: number, inj: { amount: number }) => sum + inj.amount, 0);
    const totalOut = cashInjections
      .filter((inj: { type: string }) => inj.type === 'withdrawal')
      .reduce((sum: number, inj: { amount: number }) => sum + inj.amount, 0);
    const totalCapitalInvested = totalIn - totalOut;
    
    // ═══ CONTINUITY V2: Build series aligned with receiver timeline ═══
    // Use receiverStartDate to align with the liquidity timeline
    const yearStartDate = receiverStartDate;
    
    // Filter day entries to only those with non-null sales (for continuity series)
    const validDayEntries = allDayEntries
      .filter((e): e is { date: string; netSalesExTax: number } => e.netSalesExTax !== null);
    
    // Build complete continuity series (always produces data, infers anchor if needed)
    const continuity = calc.buildContinuitySeries(
      settings.yearStartCashAmount,
      yearStartDate,
      asOfDate,
      cashNow,
      hasSnapshot ? settings.cashSnapshotAmount : null,
      hasSnapshot ? settings.cashSnapshotAsOf : null,
      referenceMonths.map(r => ({
        year: r.year,
        month: r.month,
        referenceNetSalesExTax: r.referenceNetSalesExTax,
      })),
      openHoursTemplate as unknown as Record<string, number>,
      validDayEntries,
      allExpenses,
      settings.targetCogsPct,
      settings.targetFeesPct,
      settings.monthlyFixedNut
    );
    
    // Calculate safe to spend
    const safeToSpendAmount = calc.safeToSpend(cashNow, settings.operatingFloorCash);
    
    // Calculate velocity for ETA (use 30-day lookback)
    const velocity = calc.calculateVelocity(balances, 30);
    
    // Calculate ETA to floor/target
    const etaToFloor = calc.etaToThreshold(
      cashNow,
      settings.operatingFloorCash,
      velocity,
      confidence
    );
    const etaToTarget = calc.etaToThreshold(
      cashNow,
      settings.targetReserveCash,
      velocity,
      confidence
    );
    
    // Keep dailyNet90 for backwards compat (mapped from LY estimates)
    const dailyNet90 = lyEstimates.map(w => ({
      date: w.weekStart,
      netSales: w.value,
      expenses: 0,
      dailyNet: w.value,
      isEstimate: w.isEstimate,
      monthLabel: '',
    }));
    
    // Calculate runway percent (only if monthlyFixedNut is set and > 0)
    const runwayPct = hasSnapshot && settings.monthlyFixedNut > 0
      ? Math.max(0, Math.min(1, cashNow / settings.monthlyFixedNut))
      : null;
    
    // ═══ ADDITIONAL METRICS ═══
    // Daily burn rate and runway days
    const dailyBurn = calc.dailyBurnRate(balances, 4);
    const runwayDaysValue = calc.runwayDays(cashNow, dailyBurn);
    
    // NUT coverage percentage
    const nutCoverage = calc.nutCoveragePercent(cashNow, settings.monthlyFixedNut);
    
    // Week-over-week change
    const wowChange = calc.weekOverWeekChange(balances);
    
    // Average daily sales (from current month entries)
    const avgDailySales = calc.averageDailySales(dayEntries);
    
    // Best/worst MONTHS from reference data (actual monthly totals)
    const bestWorstMonths = referenceMonths.length > 0 
      ? (() => {
          const sorted = [...referenceMonths].sort((a, b) => a.referenceNetSalesExTax - b.referenceNetSalesExTax);
          const worst = sorted[0];
          const best = sorted[sorted.length - 1];
          const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return {
            best: { value: best.referenceNetSalesExTax, week: `${best.year}-${monthNames[best.month]}` },
            worst: { value: worst.referenceNetSalesExTax, week: `${worst.year}-${monthNames[worst.month]}` },
          };
        })()
      : null;
    const bestWorst = bestWorstMonths;
    
    // Gross margin trend (compare to target)
    const marginTrend = calc.grossMarginTrend(actualCogs, settings.targetCogsPct);
    
    return NextResponse.json({
      settings: {
        ...settings,
        openHoursTemplate,
      },
      mtdNetSales,
      mtdCogsCash,
      mtdOpexCash,
      mtdOwnerDraw,
      mtdCapexCash,
      survivalGoal,
      survivalPercent: survivalPct,
      remainingToGoal: remaining,
      dailySalesNeeded: dailyNeeded,
      cashHealthResult: cashResult,
      trueHealthResult: trueResult,
      paceDelta: paceResult,
      mtdTargetToDate: paceTarget,
      hasCogs,
      hasOpex,
      actualCogsRate: actualCogs,
      normalizedCogs: normalizedCogsValue,
      normalizedCapex,
      confidenceLevel: confidence,
      confidenceScore: confScore,
      healthScore: score,
      pitBoard: {
        dailyNeeded: pitBoard.dailyNeeded === Infinity ? 0 : pitBoard.dailyNeeded,
        remaining: pitBoard.remaining,
        remainingOpenDays: pitBoard.remainingOpenDays,
      },
      daysInMonth,
      currentDay: day,
      currentDate: todayStr,
      asOfDate,
      asOfDay,
      salesNotEntered,
      lastYearReference: lastYearRef ? {
        year: lastYearRef.year,
        month: lastYearRef.month,
        netSales: lastYearRef.referenceNetSalesExTax,
        note: lastYearRef.note,
        // Hours-weighted estimate of where we'd be if pacing same as last year
        estTargetToDate: calc.mtdTargetToDateHoursWeighted(asOfDate, lastYearRef.referenceNetSalesExTax, openHoursTemplate),
        // Delta: this year MTD vs estimated last year pace
        vsLastYearPace: mtdNetSales - calc.mtdTargetToDateHoursWeighted(asOfDate, lastYearRef.referenceNetSalesExTax, openHoursTemplate),
        // This year MTD as % of last year month total
        pctOfLastYear: lastYearRef.referenceNetSalesExTax > 0 
          ? Math.round((mtdNetSales / lastYearRef.referenceNetSalesExTax) * 100) 
          : 0,
      } : null,
      // Cash snapshot for liquidity card
      cashSnapshot: {
        hasSnapshot,
        snapshotAmount: settings.cashSnapshotAmount ?? null,
        snapshotAsOf: settings.cashSnapshotAsOf ?? null,
        changeSince,
        cashNow,
        fillPct,
        isEstimate: confidence !== 'HIGH',
        dailyNet90,
        runwayPct,
      },
      // Liquidity Receiver data
      liquidityReceiver: {
        balances,
        deltas,
        lyEstimates,
        // Continuity V2: full series data
        estBalanceSeries: continuity.estBalanceSeries,
        actualBalanceSeries: continuity.actualBalanceSeries,
        mergedBalanceSeries: continuity.mergedBalanceSeries,
        anchor: continuity.anchor,
        continuityStats: continuity.stats,
        operatingFloor: settings.operatingFloorCash,
        targetReserve: settings.targetReserveCash,
        velocity,
        etaToFloor,
        etaToTarget,
        // Derived headline readouts
        aboveFloor: Math.max(0, cashNow - settings.operatingFloorCash),
        toTarget: Math.max(0, settings.targetReserveCash - cashNow),
        safeToSpend: safeToSpendAmount,
        survivalGoal,
        // Continuity Mode metadata
        yearStartCashAmount: settings.yearStartCashAmount,
        yearStartCashDate: settings.yearStartCashDate,
        // Additional metrics
        dailyBurn,
        runwayDays: runwayDaysValue === Infinity ? null : runwayDaysValue,
        nutCoverage,
        wowChange,
        avgDailySales,
        bestWorst,
        marginTrend,
        // Capital tracking
        capitalSeries,
        totalCapitalInvested,
        cashInjections: cashInjections.map((inj: { date: string; amount: number; note: string | null }) => ({
          date: inj.date,
          amount: inj.amount,
          note: inj.note,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
