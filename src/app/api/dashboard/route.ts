import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as calc from '@/lib/calc';
import { getCurrentOrgId, getOrCreateSettings } from '@/lib/org';

interface DayEntryRecord {
  id: string;
  date: string;
  netSalesExTax: number | null;
  notes: string | null;
}

interface ExpenseRecord {
  id: string;
  date: string;
  vendorName: string;
  category: string;
  amount: number;
  memo: string | null;
  spreadMonths: number | null;
}

const SHOWCASE_ORG_ID = 'showcase-template';

// Frozen date for showcase mode - a "time capsule" that never goes stale
// Day 8 shows variety: pace delta solid, velocity moderate (working month)
const SHOWCASE_FROZEN_DATE = '2025-08-08';

export async function GET(request: Request) {
  try {
    // Check for showcase mode (User View toggle)
    const { searchParams } = new URL(request.url);
    const isShowcase = searchParams.get('showcase') === 'true';
    
    // Get org ID - use showcase template if in user view mode
    const orgId = isShowcase ? SHOWCASE_ORG_ID : await getCurrentOrgId();
    const settings = await getOrCreateSettings(orgId);
    
    // Get current date in user's configured timezone
    // For showcase mode, use frozen date to create a "time capsule" demo
    const now = new Date();
    const localTime = isShowcase
      ? new Date(SHOWCASE_FROZEN_DATE + 'T12:00:00')
      : new Date(now.toLocaleString('en-US', { timeZone: settings.timezone }));
    
    const year = localTime.getFullYear();
    const month = localTime.getMonth() + 1; // 1-12
    const day = localTime.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const todayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    
    const openHoursTemplate = JSON.parse(settings.openHoursTemplate) as calc.OpenHoursTemplate;
    
    // Get MTD day entries
    const dayEntries: DayEntryRecord[] = await prisma.dayEntry.findMany({
      where: { organizationId: orgId, date: { startsWith: monthStr } },
    });
    
    // Determine asOfDate: max date with sales entered, or today if none
    // For showcase mode, cap at frozen date to create consistent "time capsule"
    const entriesWithSales = dayEntries.filter(e => e.netSalesExTax !== null && e.netSalesExTax > 0);
    let asOfDate = entriesWithSales.length > 0
      ? entriesWithSales.reduce((max, e) => e.date > max ? e.date : max, entriesWithSales[0].date)
      : todayStr;
    
    // Cap asOfDate at frozen date for showcase mode
    if (isShowcase && asOfDate > todayStr) {
      asOfDate = todayStr;
    }
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
      where: { organizationId: orgId, date: { startsWith: monthStr } },
    });
    
    // Get historical spread expenses (from previous months that might still be active)
    const allSpreadExpenses: ExpenseRecord[] = await prisma.expenseTransaction.findMany({
      where: {
        organizationId: orgId,
        spreadMonths: { gte: 2 },
      },
    });
    
    // Get last year reference for this month
    const lastYearRef = await prisma.referenceMonth.findFirst({
      where: { organizationId: orgId, year: year - 1, month },
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
    
    // Fetch ALL historical snapshots for change calculation (moved up for access)
    const allSnapshots = await prisma.cashSnapshot.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }, // Most recent first
    });
    
    if (hasSnapshot && settings.cashSnapshotAsOf) {
      // Get ALL day entries and expenses for liquidity calculations
      const dayEntriesRaw = await prisma.dayEntry.findMany({
        where: { organizationId: orgId, date: { gt: settings.cashSnapshotAsOf, lte: asOfDate } },
      });
      const expensesRaw = await prisma.expenseTransaction.findMany({
        where: { organizationId: orgId, date: { gt: settings.cashSnapshotAsOf, lte: asOfDate } },
      });
      
      allDayEntries = dayEntriesRaw.map(e => ({ date: e.date, netSalesExTax: e.netSalesExTax }));
      allExpenses = expensesRaw.map(e => ({ date: e.date, amount: e.amount }));
      
      // Use latest snapshot for cashNow
      if (allSnapshots.length >= 1) {
        cashNow = allSnapshots[0].amount;
      } else {
        cashNow = settings.cashSnapshotAmount!;
      }
      
      // Calculate MTD expenses for change display
      const mtdExpensesForChange = expenses.reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
      // Change = MTD net (sales - expenses) - smooth, meaningful metric
      changeSince = mtdNetSales - mtdExpensesForChange;
      
      fillPct = calc.cashFillPct(cashNow, settings.monthlyFixedNut);
    }
    
    // Build Liquidity Receiver data using pure calc helpers
    const referenceMonths = await prisma.referenceMonth.findMany({
      where: { organizationId: orgId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
    
    // Fetch cash injections for capital tracking
    const cashInjections = await prisma.cashInjection.findMany({
      where: { organizationId: orgId },
      orderBy: { date: 'asc' },
    });
    
    // Fetch NUT history for stepped NUT line
    const nutSnapshots = await prisma.nutSnapshot.findMany({
      where: { organizationId: orgId },
      orderBy: { effectiveDate: 'asc' },
    });
    
    // Fetch historical cash snapshots for balance series
    const historicalSnapshots = await prisma.cashSnapshot.findMany({
      where: { organizationId: orgId },
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
    
    // Generate cash balance series from historical snapshots (ACTUAL data)
    // Use historical CashSnapshot records if available, otherwise fall back to settings snapshot
    const balances = historicalSnapshots.length > 0
      ? historicalSnapshots
          .filter(snap => snap.date >= receiverStartDate && snap.date <= receiverEndDate)
          .map(snap => ({
            weekEnd: calc.getWeekEnd(snap.date),
            balance: snap.amount,
            isEstimate: false,
          }))
      : (hasSnapshot
          ? calc.cashBalanceSeriesFromSnapshot(
              settings.cashSnapshotAmount!,
              settings.cashSnapshotAsOf!,
              allDayEntries,
              allExpenses,
              receiverStartDate,
              receiverEndDate
            )
          : []);
    
    // Generate delta series from balances
    const deltas = calc.weeklyDeltaSeriesFromBalance(balances);
    
    // ═══ WEEKLY ACTUAL SALES: Aggregate DayEntry sales by week for TY bars ═══
    const allDayEntriesForReceiver = await prisma.dayEntry.findMany({
      where: { 
        organizationId: orgId,
        date: { gte: receiverStartDate, lte: receiverEndDate },
      },
      orderBy: { date: 'asc' },
    });
    
    // Group sales by week (using week end date as key)
    const salesByWeek = new Map<string, number>();
    for (const entry of allDayEntriesForReceiver) {
      const weekEnd = calc.getWeekEnd(entry.date);
      const current = salesByWeek.get(weekEnd) || 0;
      salesByWeek.set(weekEnd, current + (entry.netSalesExTax || 0));
    }
    
    // Convert to array matching lyEstimates structure
    const weeklyActualSales = lyEstimates.map(week => ({
      weekEnd: week.weekEnd,
      value: salesByWeek.get(week.weekEnd) || 0,
      hasData: salesByWeek.has(week.weekEnd),
    }));
    
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
    
    // ═══ NUT SERIES: Weekly NUT values based on historical snapshots ═══
    // Build stepped series showing NUT at each week based on effective dates
    const nutSeries = lyEstimates.map(week => {
      const weekEnd = week.weekEnd || week.weekStart;
      // Find the most recent NUT snapshot effective on or before this week
      const applicableSnapshots = nutSnapshots.filter(
        (snap: { effectiveDate: string }) => snap.effectiveDate <= weekEnd
      );
      // Use the most recent one, or fall back to settings.monthlyFixedNut
      const currentNut = applicableSnapshots.length > 0
        ? applicableSnapshots[applicableSnapshots.length - 1].amount
        : settings.monthlyFixedNut;
      return {
        weekEnd,
        nut: currentNut,
      };
    });
    
    // ═══ CONTINUITY V2: Build series aligned with receiver timeline ═══
    // Use rolling 52-week window for balance series (not full business history)
    // This ensures organic variation is visible, not compressed over years
    const yearStartDate = calc.addDays(asOfDate, -364);
    
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
    
    // Calculate velocity from MTD sales pace (smooth, not jumpy like snapshots)
    // Velocity = (MTD Net Sales - MTD Total Expenses) / days elapsed this month
    const mtdTotalExpenses = mtdCogsCash + mtdOpexCash + mtdOwnerDraw + mtdCapexCash;
    const mtdNet = mtdNetSales - mtdTotalExpenses;
    const daysElapsed = Math.max(1, asOfDay); // days into the month
    const velocity = Math.round((mtdNet / daysElapsed) * 100) / 100;
    
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
    
    // PY Annual Total: Only sum previous year (year - 1), not all historical data
    const previousYear = year - 1;
    const pyAnnualTotal = referenceMonths
      .filter(r => r.year === previousYear)
      .reduce((sum, r) => sum + r.referenceNetSalesExTax, 0);
    
    // PY Monthly: Same month last year
    const pyMonthlyRef = referenceMonths.find(r => r.year === previousYear && r.month === month);
    const pyMonthlyTotal = pyMonthlyRef?.referenceNetSalesExTax || 0;
    
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
      avgDailySales,
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
        weeklyActualSales,
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
        // NUT history series
        nutSeries,
        nutSnapshots: nutSnapshots.map((snap: { effectiveDate: string; amount: number; note: string | null }) => ({
          effectiveDate: snap.effectiveDate,
          amount: snap.amount,
          note: snap.note,
        })),
        cashInjections: cashInjections.map((inj: { date: string; amount: number; note: string | null }) => ({
          date: inj.date,
          amount: inj.amount,
          note: inj.note,
        })),
        // Business start date and days in business
        businessStartDate: settings.businessStartDate,
        daysInBusiness: settings.businessStartDate 
          ? Math.floor((new Date().getTime() - new Date(settings.businessStartDate).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        // PY Annual Total (previous year only)
        pyAnnualTotal,
        // PY Monthly (same month last year)
        pyMonthlyTotal,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: errorMessage },
      { status: 500 }
    );
  }
}
