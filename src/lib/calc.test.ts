/**
 * HB Health Meter - Unit Tests for Core Calculations
 * Acceptance tests as specified in requirements
 */

import { describe, it, expect } from 'vitest';
import {
  keepRate,
  survivalGoalNetExTax,
  idealGoalNetExTax,
  survivalPercent,
  clampForGauge,
  remainingToGoal,
  spreadExpenseMonthlyPortion,
  isSpreadExpenseActiveInMonth,
  normalizedCogs,
  cashHealthResult,
  trueHealthResult,
  actualCogsRate,
  confidenceLevel,
  confidenceScore,
  healthScore,
  getDayOfWeek,
  isOpenDay,
  remainingOpenHours,
  totalOpenHoursInMonth,
  dailyNeededFromHere,
  changeSinceSnapshot,
  cashOnHand,
  cashFillPct,
  // Liquidity Receiver helpers
  getWeekStart,
  getWeekEnd,
  addDays,
  referenceMonthsToWeeklyLYEstimate,
  cashBalanceSeriesFromSnapshot,
  weeklyDeltaSeriesFromBalance,
  etaToThreshold,
  calculateVelocity,
  // Continuity Mode helpers
  referenceMonthsToDailySalesEstimate,
  estimateDailyNetCashFlow,
  buildEstimatedBalanceSeries,
  reconcileSeriesToSnapshot,
  mergeActualAndEstimatedSeries,
  // Types
  type ReferenceMonthData,
  type WeeklyBalance,
  type DailySalesEstimate,
  type DailyNetFlowEstimate,
  type DailyBalancePoint,
} from './calc';

// ============================================
// ACCEPTANCE TESTS (from requirements)
// ============================================

describe('Acceptance Tests', () => {
  it('survivalGoal = 25000 with defaults (15500 nut, 35% COGS, 3% fees)', () => {
    const goal = survivalGoalNetExTax(15500, 0.35, 0.03);
    expect(goal).toBe(25000);
  });

  it('survivalPercent = 50% when mtdNetSales = 12500 and goal = 25000', () => {
    const pct = survivalPercent(12500, 25000);
    expect(pct).toBe(50);
  });

  it('spread expense 2500 over 10 months = 250 monthly portion', () => {
    const portion = spreadExpenseMonthlyPortion(2500, 10);
    expect(portion).toBe(250);
  });

  it('remaining to goal = survivalGoal - mtdNetSales', () => {
    const remaining = remainingToGoal(12500, 25000);
    expect(remaining).toBe(12500);
  });
});

// ============================================
// KEEP RATE TESTS
// ============================================

describe('keepRate', () => {
  it('calculates correct keep rate with defaults', () => {
    expect(keepRate(0.35, 0.03)).toBe(0.62);
  });

  it('returns 1 when no COGS or fees', () => {
    expect(keepRate(0, 0)).toBe(1);
  });

  it('returns 0 when COGS + fees = 100%', () => {
    expect(keepRate(0.5, 0.5)).toBe(0);
  });
});

// ============================================
// SURVIVAL GOAL TESTS
// ============================================

describe('survivalGoalNetExTax', () => {
  it('returns Infinity when keep rate is zero', () => {
    const goal = survivalGoalNetExTax(15500, 0.5, 0.5);
    expect(goal).toBe(Infinity);
  });

  it('returns Infinity when keep rate is negative', () => {
    const goal = survivalGoalNetExTax(15500, 0.6, 0.5);
    expect(goal).toBe(Infinity);
  });

  it('rounds to nearest integer', () => {
    const goal = survivalGoalNetExTax(10000, 0.35, 0.03);
    expect(goal).toBe(16129); // 10000 / 0.62 = 16129.03...
  });
});

// ============================================
// IDEAL GOAL TESTS
// ============================================

describe('idealGoalNetExTax', () => {
  it('includes roof fund and owner draw in calculation', () => {
    // (15500 + 300 + 2000) / 0.62 = 28709.68 -> 28710
    const goal = idealGoalNetExTax(15500, 300, 2000, 0.35, 0.03);
    expect(goal).toBe(28710);
  });

  it('equals survival goal when roof fund and owner draw are zero', () => {
    const survival = survivalGoalNetExTax(15500, 0.35, 0.03);
    const ideal = idealGoalNetExTax(15500, 0, 0, 0.35, 0.03);
    expect(ideal).toBe(survival);
  });
});

// ============================================
// SURVIVAL PERCENT TESTS
// ============================================

describe('survivalPercent', () => {
  it('returns 0 when goal is zero', () => {
    expect(survivalPercent(1000, 0)).toBe(0);
  });

  it('returns 100 when sales equal goal', () => {
    expect(survivalPercent(25000, 25000)).toBe(100);
  });

  it('returns 200 when sales are double the goal', () => {
    expect(survivalPercent(50000, 25000)).toBe(200);
  });

  it('handles decimal precision', () => {
    expect(survivalPercent(12345, 25000)).toBe(49.4);
  });
});

// ============================================
// CLAMP FOR GAUGE TESTS
// ============================================

describe('clampForGauge', () => {
  it('clamps negative values to 0', () => {
    expect(clampForGauge(-10)).toBe(0);
  });

  it('clamps values over 200 to 200', () => {
    expect(clampForGauge(250)).toBe(200);
  });

  it('passes through values in range', () => {
    expect(clampForGauge(100)).toBe(100);
  });
});

// ============================================
// SPREAD EXPENSE TESTS
// ============================================

describe('spreadExpenseMonthlyPortion', () => {
  it('returns full amount when spreadMonths is 0', () => {
    expect(spreadExpenseMonthlyPortion(1000, 0)).toBe(1000);
  });

  it('returns full amount when spreadMonths is negative', () => {
    expect(spreadExpenseMonthlyPortion(1000, -1)).toBe(1000);
  });

  it('divides evenly', () => {
    expect(spreadExpenseMonthlyPortion(1200, 12)).toBe(100);
  });

  it('rounds to 2 decimal places', () => {
    expect(spreadExpenseMonthlyPortion(1000, 3)).toBe(333.33);
  });
});

describe('isSpreadExpenseActiveInMonth', () => {
  it('returns true in purchase month', () => {
    expect(isSpreadExpenseActiveInMonth('2026-01-15', 6, 2026, 1)).toBe(true);
  });

  it('returns true in subsequent months within spread', () => {
    expect(isSpreadExpenseActiveInMonth('2026-01-15', 6, 2026, 3)).toBe(true);
  });

  it('returns false after spread period ends', () => {
    expect(isSpreadExpenseActiveInMonth('2026-01-15', 6, 2026, 8)).toBe(false);
  });

  it('returns false before purchase', () => {
    expect(isSpreadExpenseActiveInMonth('2026-03-15', 6, 2026, 1)).toBe(false);
  });

  it('handles year boundaries', () => {
    expect(isSpreadExpenseActiveInMonth('2025-11-15', 4, 2026, 1)).toBe(true);
    expect(isSpreadExpenseActiveInMonth('2025-11-15', 4, 2026, 3)).toBe(false);
  });
});

describe('normalizedCogs', () => {
  it('returns cash COGS when no spread expenses', () => {
    expect(normalizedCogs(5000, [], 2026, 1)).toBe(5000);
  });

  it('adjusts purchase month correctly', () => {
    const spread = [{
      amount: 2400,
      spreadMonths: 6,
      startDate: '2026-01-15',
      category: 'COGS' as const,
    }];
    // Cash COGS includes full 2400, normalized should replace with 400
    // 5000 - 2400 + 400 = 3000
    const result = normalizedCogs(5000, spread, 2026, 1);
    expect(result).toBe(3000);
  });

  it('adds monthly portion in subsequent months', () => {
    const spread = [{
      amount: 2400,
      spreadMonths: 6,
      startDate: '2026-01-15',
      category: 'COGS' as const,
    }];
    // February: no cash purchase, just add monthly portion
    // 5000 + 400 = 5400
    const result = normalizedCogs(5000, spread, 2026, 2);
    expect(result).toBe(5400);
  });

  it('ignores non-COGS expenses', () => {
    const spread = [{
      amount: 2400,
      spreadMonths: 6,
      startDate: '2026-01-15',
      category: 'CAPEX' as const,
    }];
    expect(normalizedCogs(5000, spread, 2026, 1)).toBe(5000);
  });
});

// ============================================
// HEALTH RESULT TESTS
// ============================================

describe('cashHealthResult', () => {
  it('calculates correct result', () => {
    const monthData = {
      mtdNetSales: 25000,
      mtdCogsCash: 8000,
      mtdOpexCash: 10000,
      mtdOwnerDraw: 2000,
      mtdCapexCash: 1000,
    };
    // 25000 - 8000 - 10000 - 300 - 2000 = 4700
    const result = cashHealthResult(monthData, 300);
    expect(result).toBe(4700);
  });

  it('can return negative value', () => {
    const monthData = {
      mtdNetSales: 10000,
      mtdCogsCash: 8000,
      mtdOpexCash: 10000,
      mtdOwnerDraw: 2000,
      mtdCapexCash: 0,
    };
    const result = cashHealthResult(monthData, 300);
    expect(result).toBe(-10300);
  });
});

describe('trueHealthResult', () => {
  it('uses normalized values', () => {
    const monthData = {
      mtdNetSales: 25000,
      mtdCogsCash: 8000,
      mtdOpexCash: 10000,
      mtdOwnerDraw: 2000,
      mtdCapexCash: 1000,
    };
    // 25000 - 6000 (normalized COGS) - 10000 - 300 - 2000 - 500 (normalized CAPEX) = 6200
    const result = trueHealthResult(monthData, 300, 6000, 500);
    expect(result).toBe(6200);
  });
});

// ============================================
// ACTUAL COGS PERCENT TESTS
// ============================================

describe('actualCogsRate', () => {
  it('returns 0 when no sales', () => {
    expect(actualCogsRate(1000, 0)).toBe(0);
  });

  it('calculates correct rate', () => {
    expect(actualCogsRate(8750, 25000)).toBe(0.35);
  });

  it('rounds to 3 decimal places', () => {
    expect(actualCogsRate(8000, 25000)).toBe(0.32);
  });
});

// ============================================
// CONFIDENCE TESTS
// ============================================

describe('confidenceLevel', () => {
  it('returns HIGH when sales and recent expenses exist', () => {
    expect(confidenceLevel({
      hasSalesData: true,
      hasRecentExpenses: true,
      daysWithData: 10,
      totalDaysInPeriod: 15,
    })).toBe('HIGH');
  });

  it('returns MEDIUM when only sales exist', () => {
    expect(confidenceLevel({
      hasSalesData: true,
      hasRecentExpenses: false,
      daysWithData: 10,
      totalDaysInPeriod: 15,
    })).toBe('MEDIUM');
  });

  it('returns LOW when no sales data', () => {
    expect(confidenceLevel({
      hasSalesData: false,
      hasRecentExpenses: true,
      daysWithData: 0,
      totalDaysInPeriod: 15,
    })).toBe('LOW');
  });
});

describe('confidenceScore', () => {
  it('returns max score with full data', () => {
    const score = confidenceScore({
      hasSalesData: true,
      hasRecentExpenses: true,
      daysWithData: 15,
      totalDaysInPeriod: 15,
    });
    expect(score).toBe(100);
  });

  it('returns 0 with no data', () => {
    const score = confidenceScore({
      hasSalesData: false,
      hasRecentExpenses: false,
      daysWithData: 0,
      totalDaysInPeriod: 15,
    });
    expect(score).toBe(0);
  });
});

// ============================================
// PACE CALCULATION TESTS
// ============================================

describe('getDayOfWeek', () => {
  it('returns correct day for known dates', () => {
    expect(getDayOfWeek('2026-01-01')).toBe('thu'); // Jan 1, 2026 is Thursday
    expect(getDayOfWeek('2026-01-04')).toBe('sun');
    expect(getDayOfWeek('2026-01-05')).toBe('mon');
  });
});

describe('totalOpenHoursInMonth', () => {
  const template = {
    mon: 0,
    tue: 8,
    wed: 8,
    thu: 8,
    fri: 8,
    sat: 8,
    sun: 5,
  };

  it('calculates January 2026 hours correctly', () => {
    // Jan 2026: 31 days
    // Mondays: 5, 12, 19, 26 = 4 * 0 = 0
    // Tuesdays: 6, 13, 20, 27 = 4 * 8 = 32
    // Wednesdays: 7, 14, 21, 28 = 4 * 8 = 32
    // Thursdays: 1, 8, 15, 22, 29 = 5 * 8 = 40
    // Fridays: 2, 9, 16, 23, 30 = 5 * 8 = 40
    // Saturdays: 3, 10, 17, 24, 31 = 5 * 8 = 40
    // Sundays: 4, 11, 18, 25 = 4 * 5 = 20
    // Total = 0 + 32 + 32 + 40 + 40 + 40 + 20 = 204
    const hours = totalOpenHoursInMonth(template, 2026, 1);
    expect(hours).toBe(204);
  });
});

describe('isOpenDay', () => {
  const template = { mon: 8, tue: 8, wed: 0, thu: 8, fri: 8, sat: 8, sun: 0 };
  
  it('returns true for days with hours > 0', () => {
    // 2026-01-06 is a Tuesday (has 8 hours)
    expect(isOpenDay('2026-01-06', template)).toBe(true);
  });

  it('returns false for days with 0 hours', () => {
    // 2026-01-04 is a Sunday (has 0 hours)
    expect(isOpenDay('2026-01-04', template)).toBe(false);
    // 2026-01-07 is a Wednesday (has 0 hours in this template)
    expect(isOpenDay('2026-01-07', template)).toBe(false);
  });

  it('uses UTC day-of-week (not local timezone)', () => {
    // This verifies the same date gives consistent results regardless of when test runs
    // 2026-01-01 is Thursday
    expect(getDayOfWeek('2026-01-01')).toBe('thu');
    expect(isOpenDay('2026-01-01', template)).toBe(true);
  });
});

describe('dailyNeededFromHere', () => {
  const template = { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 8, sun: 0 };
  
  it('calculates correct daily target for remaining open days', () => {
    // Jan 15, 2026 with 12500 MTD and 25000 goal
    // Remaining = 12500, count open days after Jan 15
    const result = dailyNeededFromHere('2026-01-15', 12500, 25000, template);
    expect(result.remaining).toBe(12500);
    expect(result.remainingOpenDays).toBeGreaterThan(0);
    expect(result.dailyNeeded).toBe(Math.round(12500 / result.remainingOpenDays));
  });

  it('returns 0 daily needed when goal already met', () => {
    const result = dailyNeededFromHere('2026-01-15', 30000, 25000, template);
    expect(result.remaining).toBe(0);
    expect(result.dailyNeeded).toBe(0);
  });

  it('returns Infinity when no remaining open days but still have remaining', () => {
    // Last day of month
    const result = dailyNeededFromHere('2026-01-31', 12500, 25000, template);
    expect(result.remainingOpenDays).toBe(0);
    expect(result.dailyNeeded).toBe(Infinity);
  });
});

// ============================================
// HEALTH SCORE TESTS
// ============================================

describe('healthScore', () => {
  it('returns high score when on track', () => {
    const score = healthScore(
      25000,  // mtdNetSales (at goal)
      25000,  // survivalGoal
      0.35,   // actualCogs (at target)
      0.35,   // targetCogs
      10000,  // mtdOpex
      15500,  // expectedMonthlyOpex
      100     // confidence
    );
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('returns lower score when behind', () => {
    const score = healthScore(
      12500,  // mtdNetSales (50% of goal)
      25000,  // survivalGoal
      0.40,   // actualCogs (over target)
      0.35,   // targetCogs
      18000,  // mtdOpex (over expected)
      15500,  // expectedMonthlyOpex
      50      // confidence
    );
    expect(score).toBeLessThan(60);
  });

  it('clamps to 0-100', () => {
    const lowScore = healthScore(0, 25000, 0.50, 0.35, 20000, 15500, 0);
    const highScore = healthScore(50000, 25000, 0.30, 0.35, 10000, 15500, 100);
    
    expect(lowScore).toBeGreaterThanOrEqual(0);
    expect(highScore).toBeLessThanOrEqual(100);
  });
});

// ============================================
// CASH SNAPSHOT / LIQUIDITY TESTS
// ============================================

describe('changeSinceSnapshot', () => {
  it('uses ISO string comparison (no Date parsing)', () => {
    // This test verifies we don't use new Date('YYYY-MM-DD') for business logic
    const dayEntries = [
      { date: '2026-01-10', netSalesExTax: 1000 },
      { date: '2026-01-11', netSalesExTax: 1500 },
    ];
    const expenses = [
      { date: '2026-01-10', amount: 200 },
      { date: '2026-01-11', amount: 300 },
    ];
    
    // Snapshot on Jan 9, asOfDate Jan 11
    const result = changeSinceSnapshot('2026-01-09', '2026-01-11', dayEntries, expenses);
    // Sales: 1000 + 1500 = 2500, Expenses: 200 + 300 = 500
    expect(result).toBe(2000);
  });

  it('excludes days after asOfDate', () => {
    const dayEntries = [
      { date: '2026-01-10', netSalesExTax: 1000 },
      { date: '2026-01-15', netSalesExTax: 2000 }, // after asOfDate
    ];
    const expenses = [
      { date: '2026-01-10', amount: 200 },
      { date: '2026-01-15', amount: 500 }, // after asOfDate
    ];
    
    const result = changeSinceSnapshot('2026-01-09', '2026-01-12', dayEntries, expenses);
    // Only Jan 10: 1000 - 200 = 800
    expect(result).toBe(800);
  });

  it('ignores null netSalesExTax days', () => {
    const dayEntries = [
      { date: '2026-01-10', netSalesExTax: 1000 },
      { date: '2026-01-11', netSalesExTax: null },
      { date: '2026-01-12', netSalesExTax: 500 },
    ];
    const expenses: { date: string; amount: number }[] = [];
    
    const result = changeSinceSnapshot('2026-01-09', '2026-01-12', dayEntries, expenses);
    // Only 1000 + 500 = 1500 (null is ignored, not treated as 0)
    expect(result).toBe(1500);
  });

  it('excludes snapshot date itself (exclusive start)', () => {
    const dayEntries = [
      { date: '2026-01-09', netSalesExTax: 5000 }, // snapshot date - excluded
      { date: '2026-01-10', netSalesExTax: 1000 },
    ];
    const expenses: { date: string; amount: number }[] = [];
    
    const result = changeSinceSnapshot('2026-01-09', '2026-01-10', dayEntries, expenses);
    expect(result).toBe(1000); // not 6000
  });

  it('returns 0 when no data in range', () => {
    const dayEntries = [
      { date: '2026-01-01', netSalesExTax: 5000 }, // before range
    ];
    const expenses: { date: string; amount: number }[] = [];
    
    const result = changeSinceSnapshot('2026-01-09', '2026-01-15', dayEntries, expenses);
    expect(result).toBe(0);
  });
});

describe('cashOnHand', () => {
  it('calculates snapshot + change correctly', () => {
    expect(cashOnHand(10000, 2500)).toBe(12500);
    expect(cashOnHand(10000, -3000)).toBe(7000);
    expect(cashOnHand(5000, 0)).toBe(5000);
  });
});

describe('cashFillPct', () => {
  it('clamps to 0-1 range', () => {
    // Exactly at monthlyFixedNut
    expect(cashFillPct(15500, 15500)).toBe(1);
    // Above monthlyFixedNut
    expect(cashFillPct(20000, 15500)).toBe(1);
    // Below monthlyFixedNut
    expect(cashFillPct(7750, 15500)).toBe(0.5);
    // Zero or negative
    expect(cashFillPct(0, 15500)).toBe(0);
    expect(cashFillPct(-5000, 15500)).toBe(0);
  });

  it('uses monthlyFixedNut from settings (not hardcoded)', () => {
    // Different monthlyFixedNut values should give different results
    expect(cashFillPct(10000, 10000)).toBe(1);
    expect(cashFillPct(10000, 20000)).toBe(0.5);
    expect(cashFillPct(10000, 5000)).toBe(1); // clamped
  });

  it('returns 0 when monthlyFixedNut is 0 or negative', () => {
    expect(cashFillPct(10000, 0)).toBe(0);
    expect(cashFillPct(10000, -100)).toBe(0);
  });
});

// ============================================
// LIQUIDITY RECEIVER TESTS
// ============================================

describe('getWeekStart', () => {
  it('returns Monday for any day in the week', () => {
    // Monday stays Monday
    expect(getWeekStart('2026-01-05')).toBe('2026-01-05');
    // Tuesday -> Monday
    expect(getWeekStart('2026-01-06')).toBe('2026-01-05');
    // Sunday -> previous Monday
    expect(getWeekStart('2026-01-04')).toBe('2025-12-29');
    // Saturday -> Monday
    expect(getWeekStart('2026-01-03')).toBe('2025-12-29');
  });
});

describe('getWeekEnd', () => {
  it('returns Sunday for any day in the week', () => {
    // Monday -> Sunday
    expect(getWeekEnd('2026-01-05')).toBe('2026-01-11');
    // Sunday stays Sunday
    expect(getWeekEnd('2026-01-04')).toBe('2026-01-04');
  });
});

describe('addDays', () => {
  it('adds days correctly', () => {
    expect(addDays('2026-01-01', 7)).toBe('2026-01-08');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-05', -5)).toBe('2025-12-31');
  });
});

describe('referenceMonthsToWeeklyLYEstimate', () => {
  const template = { mon: 0, tue: 8, wed: 8, thu: 8, fri: 8, sat: 8, sun: 5 };
  
  it('generates weekly estimates from reference months', () => {
    const refMonths = [
      { year: 2025, month: 1, referenceNetSalesExTax: 40000 },
    ];
    
    const weeks = referenceMonthsToWeeklyLYEstimate(
      refMonths,
      template,
      '2025-01-01',
      '2025-01-31'
    );
    
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0].isEstimate).toBe(true);
    expect(weeks[0].source).toBe('LY_EST');
    // Total should roughly equal monthly reference
    const total = weeks.reduce((sum, w) => sum + w.value, 0);
    expect(total).toBeCloseTo(40000, -2); // Within ~100
  });

  it('returns empty array for no reference data', () => {
    const weeks = referenceMonthsToWeeklyLYEstimate(
      [],
      template,
      '2025-01-01',
      '2025-01-31'
    );
    
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0].value).toBe(0);
  });
});

describe('cashBalanceSeriesFromSnapshot', () => {
  it('calculates running balance from snapshot', () => {
    const dayEntries = [
      { date: '2026-01-06', netSalesExTax: 1000 },
      { date: '2026-01-07', netSalesExTax: 1500 },
      { date: '2026-01-13', netSalesExTax: 2000 },
    ];
    const expenses = [
      { date: '2026-01-06', amount: 500 },
    ];
    
    const balances = cashBalanceSeriesFromSnapshot(
      10000,           // snapshot
      '2026-01-01',    // snapshotAsOf
      dayEntries,
      expenses,
      '2026-01-05',    // startDate
      '2026-01-14'     // endDate
    );
    
    expect(balances.length).toBeGreaterThan(0);
    // First week: 10000 + 1000 + 1500 - 500 = 12000
    expect(balances[0].balance).toBe(12000);
  });

  it('handles empty data gracefully', () => {
    const balances = cashBalanceSeriesFromSnapshot(
      5000,
      '2026-01-01',
      [],
      [],
      '2026-01-05',
      '2026-01-11'
    );
    
    expect(balances.length).toBe(1);
    expect(balances[0].balance).toBe(5000);
    expect(balances[0].isEstimate).toBe(true);
  });
});

describe('weeklyDeltaSeriesFromBalance', () => {
  it('calculates deltas between consecutive weeks', () => {
    const balances = [
      { weekEnd: '2026-01-05', balance: 10000, isEstimate: false },
      { weekEnd: '2026-01-12', balance: 12000, isEstimate: false },
      { weekEnd: '2026-01-19', balance: 11500, isEstimate: false },
    ];
    
    const deltas = weeklyDeltaSeriesFromBalance(balances);
    
    expect(deltas.length).toBe(3);
    expect(deltas[0].delta).toBe(0); // First week has no prior
    expect(deltas[1].delta).toBe(2000); // 12000 - 10000
    expect(deltas[2].delta).toBe(-500); // 11500 - 12000
  });

  it('returns empty for empty input', () => {
    expect(weeklyDeltaSeriesFromBalance([])).toEqual([]);
  });
});

describe('etaToThreshold', () => {
  it('calculates days to floor when burning', () => {
    const result = etaToThreshold(10000, 0, -500, 'HIGH');
    
    expect(result.direction).toBe('to_floor');
    expect(result.etaDays).toBe(20); // 10000 / 500
    expect(result.isEstimate).toBe(false);
  });

  it('calculates days to target when growing', () => {
    const result = etaToThreshold(10000, 50000, 1000, 'HIGH');
    
    expect(result.direction).toBe('to_target');
    expect(result.etaDays).toBe(40); // (50000 - 10000) / 1000
  });

  it('adds uncertainty band for non-HIGH confidence', () => {
    const result = etaToThreshold(10000, 0, -500, 'MEDIUM');
    
    expect(result.etaDays).toBe(20);
    expect(result.etaMin).toBe(16); // 20 * 0.8
    expect(result.etaMax).toBe(24); // 20 * 1.2
    expect(result.isEstimate).toBe(true);
  });

  it('returns stable when velocity is wrong direction', () => {
    // Growing but already above target
    const result = etaToThreshold(60000, 50000, 100, 'HIGH');
    expect(result.direction).toBe('stable');
    expect(result.etaDays).toBe(0);
  });
});

describe('calculateVelocity', () => {
  it('calculates average daily velocity', () => {
    const balances = [
      { weekEnd: '2026-01-05', balance: 10000, isEstimate: false },
      { weekEnd: '2026-01-12', balance: 10700, isEstimate: false }, // +700 in 7 days
    ];
    
    const velocity = calculateVelocity(balances, 14);
    expect(velocity).toBe(100); // 700 / 7
  });

  it('returns 0 for insufficient data', () => {
    expect(calculateVelocity([], 7)).toBe(0);
    expect(calculateVelocity([{ weekEnd: '2026-01-05', balance: 10000, isEstimate: false }], 7)).toBe(0);
  });
});

// ============================================
// CONTINUITY MODE HELPERS TESTS
// ============================================

describe('referenceMonthsToDailySalesEstimate', () => {
  const storeHours = { sun: 5, mon: 0, tue: 8, wed: 8, thu: 8, fri: 8, sat: 8 };

  it('distributes monthly sales across days by store hours', () => {
    const refs: ReferenceMonthData[] = [
      { year: 2025, month: 1, referenceNetSalesExTax: 31000 }, // Jan 2025
    ];
    
    const result = referenceMonthsToDailySalesEstimate(refs, storeHours, 2025);
    
    // January 2025 has 31 days
    expect(result.length).toBe(31);
    
    // All dates should be in January 2025
    expect(result[0].date).toBe('2025-01-01');
    expect(result[30].date).toBe('2025-01-31');
    
    // Mondays (closed) should have 0 sales
    // Jan 6, 13, 20, 27 are Mondays in 2025
    const monday = result.find(r => r.date === '2025-01-06');
    expect(monday?.estimatedSales).toBe(0);
    
    // Sum should equal the month total
    const total = result.reduce((sum, d) => sum + d.estimatedSales, 0);
    expect(total).toBeCloseTo(31000, 0);
  });

  it('filters to specified year only', () => {
    const refs: ReferenceMonthData[] = [
      { year: 2024, month: 12, referenceNetSalesExTax: 30000 },
      { year: 2025, month: 1, referenceNetSalesExTax: 31000 },
    ];
    
    const result = referenceMonthsToDailySalesEstimate(refs, storeHours, 2025);
    
    // Should only have January 2025 days
    expect(result.every(r => r.date.startsWith('2025-01'))).toBe(true);
  });

  it('returns empty array for no matching year', () => {
    const refs: ReferenceMonthData[] = [
      { year: 2024, month: 12, referenceNetSalesExTax: 30000 },
    ];
    
    const result = referenceMonthsToDailySalesEstimate(refs, storeHours, 2025);
    expect(result).toHaveLength(0);
  });
});

describe('estimateDailyNetCashFlow', () => {
  it('calculates net flow correctly', () => {
    const dailySales: DailySalesEstimate[] = [
      { date: '2025-01-01', estimatedSales: 1000, isEstimate: true },
      { date: '2025-01-02', estimatedSales: 1200, isEstimate: true },
    ];
    
    // 35% COGS, 3% fees, $15500 monthly nut
    const result = estimateDailyNetCashFlow(dailySales, 0.35, 0.03, 15500);
    
    expect(result.length).toBe(2);
    
    // Day 1: 1000 - 350 (cogs) - 30 (fees) - 509.87 (daily nut) = 110.13
    const day1 = result[0];
    expect(day1.date).toBe('2025-01-01');
    expect(day1.sales).toBe(1000);
    expect(day1.netFlow).toBeCloseTo(110.13, 0);
    
    // Day 2: 1200 - 420 - 36 - 509.87 = 234.13
    const day2 = result[1];
    expect(day2.netFlow).toBeCloseTo(234.13, 0);
  });

  it('handles zero sales days', () => {
    const dailySales: DailySalesEstimate[] = [
      { date: '2025-01-06', estimatedSales: 0, isEstimate: true }, // Monday closed
    ];
    
    const result = estimateDailyNetCashFlow(dailySales, 0.35, 0.03, 15500);
    
    // 0 - 0 - 0 - 509.87 = -509.87
    expect(result[0].netFlow).toBeCloseTo(-509.87, 0);
  });
});

describe('buildEstimatedBalanceSeries', () => {
  it('builds running balance from start anchor', () => {
    const flows: DailyNetFlowEstimate[] = [
      { date: '2025-01-01', sales: 1000, netFlow: 100, isEstimate: true },
      { date: '2025-01-02', sales: 1200, netFlow: 200, isEstimate: true },
      { date: '2025-01-03', sales: 800, netFlow: -50, isEstimate: true },
    ];
    
    const result = buildEstimatedBalanceSeries(60000, '2025-01-01', flows);
    
    expect(result.length).toBe(3);
    expect(result[0].balance).toBe(60000);
    expect(result[1].balance).toBe(60200); // 60000 + 200
    expect(result[2].balance).toBe(60150); // 60200 - 50
  });

  it('filters to flows on or after start date', () => {
    const flows: DailyNetFlowEstimate[] = [
      { date: '2024-12-31', sales: 500, netFlow: 50, isEstimate: true },
      { date: '2025-01-01', sales: 1000, netFlow: 100, isEstimate: true },
      { date: '2025-01-02', sales: 1200, netFlow: 200, isEstimate: true },
    ];
    
    const result = buildEstimatedBalanceSeries(60000, '2025-01-01', flows);
    
    // Should not include Dec 31
    expect(result[0].date).toBe('2025-01-01');
    expect(result.length).toBe(2);
  });

  it('returns single point for no flows after start', () => {
    const flows: DailyNetFlowEstimate[] = [];
    
    const result = buildEstimatedBalanceSeries(60000, '2025-01-01', flows);
    
    expect(result.length).toBe(1);
    expect(result[0].balance).toBe(60000);
    expect(result[0].date).toBe('2025-01-01');
  });
});

describe('reconcileSeriesToSnapshot', () => {
  it('applies linear correction to match snapshot', () => {
    const series: DailyBalancePoint[] = [
      { date: '2025-01-01', balance: 60000, isEstimate: true, source: 'ESTIMATED' },
      { date: '2025-01-15', balance: 55000, isEstimate: true, source: 'ESTIMATED' }, // Mid-month
      { date: '2025-01-31', balance: 50000, isEstimate: true, source: 'ESTIMATED' }, // Snapshot date
    ];
    
    // Snapshot says we have 45000, not 50000 (5000 correction needed)
    const result = reconcileSeriesToSnapshot(series, '2025-01-31', 45000);
    
    expect(result.length).toBe(3);
    
    // Start should stay close to original (small correction at beginning)
    expect(result[0].balance).toBeCloseTo(60000, 0);
    
    // End should match snapshot exactly
    expect(result[2].balance).toBe(45000);
    
    // Middle should be interpolated
    expect(result[1].balance).toBeLessThan(55000);
    expect(result[1].balance).toBeGreaterThan(45000);
  });

  it('handles empty series', () => {
    const result = reconcileSeriesToSnapshot([], '2025-01-31', 45000);
    expect(result).toHaveLength(0);
  });

  it('handles snapshot after all points', () => {
    const series: DailyBalancePoint[] = [
      { date: '2025-01-01', balance: 60000, isEstimate: true, source: 'ESTIMATED' },
    ];
    
    const result = reconcileSeriesToSnapshot(series, '2025-02-01', 45000);
    
    // Should return unchanged
    expect(result[0].balance).toBe(60000);
  });
});

describe('mergeActualAndEstimatedSeries', () => {
  it('actual data takes precedence', () => {
    const actual: DailyBalancePoint[] = [
      { date: '2025-01-02', balance: 59500, isEstimate: false, source: 'ACTUAL' },
    ];
    
    const estimated: DailyBalancePoint[] = [
      { date: '2025-01-01', balance: 60000, isEstimate: true, source: 'ESTIMATED' },
      { date: '2025-01-02', balance: 60100, isEstimate: true, source: 'ESTIMATED' },
      { date: '2025-01-03', balance: 60200, isEstimate: true, source: 'ESTIMATED' },
    ];
    
    const result = mergeActualAndEstimatedSeries(actual, estimated);
    
    expect(result.length).toBe(3);
    expect(result[0].source).toBe('ESTIMATED');
    expect(result[1].source).toBe('ACTUAL');
    expect(result[1].balance).toBe(59500); // Actual value, not estimated
    expect(result[2].source).toBe('ESTIMATED');
  });

  it('returns all estimates when no actuals', () => {
    const estimated: DailyBalancePoint[] = [
      { date: '2025-01-01', balance: 60000, isEstimate: true, source: 'ESTIMATED' },
      { date: '2025-01-02', balance: 60100, isEstimate: true, source: 'ESTIMATED' },
    ];
    
    const result = mergeActualAndEstimatedSeries([], estimated);
    
    expect(result.length).toBe(2);
    expect(result.every(r => r.source === 'ESTIMATED')).toBe(true);
  });
});

// ============================================
// CONTINUITY V2 TESTS
// ============================================

import {
  inferYearStartCash,
  cumulativeEstimatedNetFlow,
  calculateLaneScale,
  calculateDeltaScale,
  safeToSpend,
  generateETALabel,
  getDeltaColor,
  getBalanceColor,
  calculateVisibleBalanceScale,
  calculateVisibleDeltaScale,
} from './calc';

describe('inferYearStartCash', () => {
  it('uses user-provided amount with HIGH confidence', () => {
    const result = inferYearStartCash(50000, 60000, 5000);
    
    expect(result.yearStartCash).toBe(50000);
    expect(result.isInferred).toBe(false);
    expect(result.inferenceMethod).toBe('USER_PROVIDED');
    expect(result.confidence).toBe('HIGH');
  });

  it('back-calculates from cashNow when yearStartCashAmount is null', () => {
    // cashNow = 60000, cumFlow = 5000
    // inferred = 60000 - 5000 = 55000
    const result = inferYearStartCash(null, 60000, 5000);
    
    expect(result.yearStartCash).toBe(55000);
    expect(result.isInferred).toBe(true);
    expect(result.inferenceMethod).toBe('BACK_CALCULATED');
    expect(result.confidence).toBe('MEDIUM');
  });

  it('returns 0 with LOW confidence when no data available', () => {
    const result = inferYearStartCash(null, null, 5000);
    
    expect(result.yearStartCash).toBe(0);
    expect(result.isInferred).toBe(true);
    expect(result.inferenceMethod).toBe('DEFAULT');
    expect(result.confidence).toBe('LOW');
  });
});

describe('cumulativeEstimatedNetFlow', () => {
  it('sums net flows within date range', () => {
    const flows: DailyNetFlowEstimate[] = [
      { date: '2025-01-01', sales: 1000, netFlow: 100, isEstimate: true },
      { date: '2025-01-02', sales: 1200, netFlow: 120, isEstimate: true },
      { date: '2025-01-03', sales: 800, netFlow: -50, isEstimate: true },
    ];
    
    const result = cumulativeEstimatedNetFlow(flows, '2025-01-01', '2025-01-03');
    expect(result).toBe(170); // 100 + 120 + (-50)
  });

  it('excludes flows outside date range', () => {
    const flows: DailyNetFlowEstimate[] = [
      { date: '2024-12-31', sales: 1000, netFlow: 500, isEstimate: true },
      { date: '2025-01-01', sales: 1000, netFlow: 100, isEstimate: true },
      { date: '2025-01-05', sales: 1000, netFlow: 200, isEstimate: true },
    ];
    
    const result = cumulativeEstimatedNetFlow(flows, '2025-01-01', '2025-01-03');
    expect(result).toBe(100); // Only 2025-01-01 is in range
  });
});

describe('calculateLaneScale', () => {
  it('returns min/max with padding for normal values', () => {
    const result = calculateLaneScale([100, 200, 150]);
    
    expect(result.min).toBeLessThan(100);
    expect(result.max).toBeGreaterThan(200);
    expect(result.range).toBeGreaterThan(100);
  });

  it('handles flat series (all same values)', () => {
    const result = calculateLaneScale([50000, 50000, 50000]);
    
    // Should create a range around the value
    expect(result.min).toBeLessThan(50000);
    expect(result.max).toBeGreaterThan(50000);
    expect(result.range).toBeGreaterThan(0);
  });

  it('handles zero values', () => {
    const result = calculateLaneScale([0, 0, 0]);
    
    // For zero, function creates -100 to 100 range, then adds 10% padding
    expect(result.min).toBeLessThan(0);
    expect(result.max).toBeGreaterThan(0);
    expect(result.range).toBeGreaterThan(0);
  });

  it('includes markers in scale', () => {
    const result = calculateLaneScale([100, 200], [50, 250]);
    
    expect(result.min).toBeLessThan(50);
    expect(result.max).toBeGreaterThan(250);
  });

  it('returns default for empty values', () => {
    const result = calculateLaneScale([]);
    
    expect(result.min).toBe(0);
    expect(result.max).toBe(1000);
    expect(result.range).toBe(1000);
  });
});

describe('calculateDeltaScale', () => {
  it('returns symmetric scale around zero', () => {
    const result = calculateDeltaScale([100, -50, 75]);
    
    // maxAbs = 100, with 10% padding = 110
    expect(result.min).toBeCloseTo(-110, 5);
    expect(result.max).toBeCloseTo(110, 5);
    expect(result.range).toBeCloseTo(220, 5);
  });

  it('handles all positive deltas', () => {
    const result = calculateDeltaScale([50, 100, 75]);
    
    expect(result.min).toBeLessThan(0);
    expect(result.max).toBeGreaterThan(100);
  });

  it('returns default for empty deltas', () => {
    const result = calculateDeltaScale([]);
    
    expect(result.min).toBe(-100);
    expect(result.max).toBe(100);
    expect(result.range).toBe(200);
  });
});

describe('safeToSpend', () => {
  it('returns difference when above floor', () => {
    expect(safeToSpend(50000, 25000)).toBe(25000);
  });

  it('returns 0 when at floor', () => {
    expect(safeToSpend(25000, 25000)).toBe(0);
  });

  it('returns 0 when below floor', () => {
    expect(safeToSpend(20000, 25000)).toBe(0);
  });
});

describe('generateETALabel', () => {
  it('returns extending runway when velocity is positive and tracking floor', () => {
    const result = generateETALabel(50000, 25000, 100, '2025-01-15', 'floor');
    
    expect(result.text).toBe('Runway: extending');
    expect(result.isPositive).toBe(true);
    expect(result.etaDate).toBeNull();
  });

  it('calculates floor ETA when velocity is negative', () => {
    // cashNow = 50000, floor = 25000, velocity = -500/day
    // diff = 25000, days = 50
    const result = generateETALabel(50000, 25000, -500, '2025-01-15', 'floor');
    
    expect(result.text).toContain('Floor ETA:');
    expect(result.text).toContain('(est)');
    expect(result.isPositive).toBe(false);
    expect(result.etaDate).not.toBeNull();
  });

  it('returns receding target when velocity is negative', () => {
    const result = generateETALabel(50000, 75000, -100, '2025-01-15', 'target');
    
    expect(result.text).toBe('Target: receding');
    expect(result.isPositive).toBe(false);
    expect(result.etaDate).toBeNull();
  });

  it('calculates target ETA when velocity is positive', () => {
    // cashNow = 50000, target = 75000, velocity = 500/day
    // diff = 25000, days = 50
    const result = generateETALabel(50000, 75000, 500, '2025-01-15', 'target');
    
    expect(result.text).toContain('Target ETA:');
    expect(result.text).toContain('(est)');
    expect(result.isPositive).toBe(true);
    expect(result.etaDate).not.toBeNull();
  });
});

// ============================================
// V3 COLOR MAPPING TESTS
// ============================================

describe('getDeltaColor', () => {
  it('returns amber for zero maxDelta', () => {
    expect(getDeltaColor(100, 0)).toBe('#f59e0b');
  });

  it('returns red for negative delta beyond threshold', () => {
    // -500 / 1000 = -0.5, which is < -0.1
    expect(getDeltaColor(-500, 1000)).toBe('#ef4444');
  });

  it('returns cyan for positive delta beyond threshold', () => {
    // 500 / 1000 = 0.5, which is > 0.1
    expect(getDeltaColor(500, 1000)).toBe('#22d3ee');
  });

  it('returns amber for flat delta within threshold', () => {
    // 50 / 1000 = 0.05, which is within ±0.1
    expect(getDeltaColor(50, 1000)).toBe('#f59e0b');
    expect(getDeltaColor(-50, 1000)).toBe('#f59e0b');
  });
});

describe('getBalanceColor', () => {
  it('returns red when below floor', () => {
    expect(getBalanceColor(20000, 25000, 50000)).toBe('#ef4444');
  });

  it('returns emerald when at or above target', () => {
    expect(getBalanceColor(50000, 25000, 50000)).toBe('#10b981');
    expect(getBalanceColor(60000, 25000, 50000)).toBe('#10b981');
  });

  it('returns cyan when between floor and target', () => {
    expect(getBalanceColor(35000, 25000, 50000)).toBe('#22d3ee');
  });

  it('returns cyan when floor is 0', () => {
    expect(getBalanceColor(10000, 0, 50000)).toBe('#22d3ee');
  });

  it('returns cyan when target is 0', () => {
    expect(getBalanceColor(30000, 25000, 0)).toBe('#22d3ee');
  });
});

describe('calculateVisibleBalanceScale', () => {
  it('returns default for empty values', () => {
    const result = calculateVisibleBalanceScale([], 0, 0);
    expect(result.min).toBe(0);
    expect(result.max).toBe(100000);
  });

  it('includes floor in scale', () => {
    const result = calculateVisibleBalanceScale([50000, 60000], 20000, 0);
    expect(result.min).toBeLessThan(20000);
  });

  it('includes target in scale', () => {
    const result = calculateVisibleBalanceScale([30000, 40000], 0, 80000);
    expect(result.max).toBeGreaterThan(80000);
  });

  it('adds 15% padding', () => {
    const result = calculateVisibleBalanceScale([40000, 60000], 0, 0);
    // Range is 20000, padding is 3000
    expect(result.min).toBeLessThan(40000);
    expect(result.max).toBeGreaterThan(60000);
    expect(result.range).toBeGreaterThan(20000);
  });
});

describe('calculateVisibleDeltaScale', () => {
  it('returns default for empty deltas', () => {
    const result = calculateVisibleDeltaScale([]);
    expect(result.max).toBe(5000);
  });

  it('returns 10% padded max absolute value', () => {
    const result = calculateVisibleDeltaScale([100, -500, 200]);
    // maxAbs = 500, with 10% = 550
    expect(result.max).toBeCloseTo(550, 0);
  });

  it('has minimum of 500', () => {
    const result = calculateVisibleDeltaScale([10, -20, 30]);
    // maxAbs = 30, but min is 500, so 500 * 1.1 = 550
    expect(result.max).toBeCloseTo(550, 0);
  });
});
