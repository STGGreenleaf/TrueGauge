/**
 * HB Health Meter - Core Calculation Module
 * All pure functions for business health calculations
 * Must be unit tested
 */

export interface Settings {
  monthlyFixedNut: number;
  targetCogsPct: number;
  targetFeesPct: number;
  monthlyRoofFund: number;
  monthlyOwnerDrawGoal: number;
}

export interface MonthData {
  mtdNetSales: number;
  mtdCogsCash: number;
  mtdOpexCash: number;
  mtdOwnerDraw: number;
  mtdCapexCash: number;
}

export interface SpreadExpense {
  amount: number;
  spreadMonths: number;
  startDate: string; // ISO date YYYY-MM-DD
  category: 'COGS' | 'OPEX' | 'CAPEX' | 'OTHER';
}

export interface ConfidenceFactors {
  hasSalesData: boolean;
  hasRecentExpenses: boolean; // expense logged in last 7 days
  daysWithData: number;
  totalDaysInPeriod: number;
}

// ============================================
// CORE CALCULATIONS
// ============================================

/**
 * Keep rate = 1 - targetCogsPct - targetFeesPct
 * This is the portion of each dollar that stays after COGS and fees
 */
export function keepRate(targetCogsPct: number, targetFeesPct: number): number {
  return 1 - targetCogsPct - targetFeesPct;
}

/**
 * Survival Goal = monthlyFixedNut / keepRate
 * The net sales needed to cover fixed costs after COGS and fees
 */
export function survivalGoalNetExTax(
  monthlyFixedNut: number,
  targetCogsPct: number,
  targetFeesPct: number
): number {
  const rate = keepRate(targetCogsPct, targetFeesPct);
  if (rate <= 0) return Infinity;
  return Math.round(monthlyFixedNut / rate);
}

/**
 * Ideal Goal = (monthlyFixedNut + monthlyRoofFund + monthlyOwnerDrawGoal) / keepRate
 * The net sales needed to cover fixed costs, savings, and owner pay
 */
export function idealGoalNetExTax(
  monthlyFixedNut: number,
  monthlyRoofFund: number,
  monthlyOwnerDrawGoal: number,
  targetCogsPct: number,
  targetFeesPct: number
): number {
  const rate = keepRate(targetCogsPct, targetFeesPct);
  if (rate <= 0) return Infinity;
  const totalNeeded = monthlyFixedNut + monthlyRoofFund + monthlyOwnerDrawGoal;
  return Math.round(totalNeeded / rate);
}

/**
 * Survival percent = (mtdNetSales / survivalGoal) * 100
 * Clamped to 0-200 for gauge display
 */
export function survivalPercent(mtdNetSales: number, survivalGoal: number): number {
  if (survivalGoal <= 0) return 0;
  const pct = (mtdNetSales / survivalGoal) * 100;
  const rounded = Math.round(pct * 10) / 10; // One decimal place
  return Math.max(0, Math.min(200, rounded)); // Clamp 0-200
}

/**
 * Get hours for a specific ISO date string using UTC day-of-week
 * This is the single source of truth for date→hours mapping
 */
export function hoursForISODate(
  dateStr: string, // YYYY-MM-DD
  template: OpenHoursTemplate
): number {
  const dayKey = getDayOfWeek(dateStr);
  return template[dayKey] || 0;
}

/**
 * Hours-weighted target for a single day
 * targetForDay = monthGoal * (hoursForDay / totalOpenHoursInMonth)
 */
export function targetForDay(
  dateStr: string,
  monthGoal: number,
  template: OpenHoursTemplate,
  year: number,
  month: number
): number {
  const totalHours = totalOpenHoursInMonth(template, year, month);
  if (totalHours <= 0) return 0;
  const dayHours = hoursForISODate(dateStr, template);
  return monthGoal * (dayHours / totalHours);
}

/**
 * Hours-weighted MTD Target to Date
 * Sum of targetForDay for all dates from start of month through asOfDate
 */
export function mtdTargetToDateHoursWeighted(
  asOfDate: string, // YYYY-MM-DD
  monthGoal: number,
  template: OpenHoursTemplate
): number {
  const [year, month, day] = asOfDate.split('-').map(Number);
  const totalHours = totalOpenHoursInMonth(template, year, month);
  if (totalHours <= 0) return 0;
  
  let target = 0;
  for (let d = 1; d <= day; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayHours = hoursForISODate(dateStr, template);
    target += monthGoal * (dayHours / totalHours);
  }
  return Math.round(target * 100) / 100;
}

/**
 * Hours-weighted Pace Delta
 * Pace Delta = mtdSales - mtdTargetToDateHoursWeighted
 */
export function paceDeltaHoursWeighted(
  mtdNetSales: number,
  asOfDate: string,
  monthGoal: number,
  template: OpenHoursTemplate
): number {
  const target = mtdTargetToDateHoursWeighted(asOfDate, monthGoal, template);
  return Math.round((mtdNetSales - target) * 100) / 100;
}

/**
 * Check if a date is an open day (has hours > 0)
 */
export function isOpenDay(dateStr: string, template: OpenHoursTemplate): boolean {
  return hoursForISODate(dateStr, template) > 0;
}

/**
 * Clamp survival percent for gauge display (0-200)
 * Note: survivalPercent() now clamps internally, this is kept for explicit clamping needs
 */
export function clampForGauge(percent: number): number {
  return Math.max(0, Math.min(200, percent));
}

// DEPRECATED calendar-day pacing functions moved to calc-deprecated.ts
// Import from there if needed for backwards compatibility

/**
 * Remaining to goal = survivalGoal - mtdNetSales
 * Can be negative if goal exceeded
 */
export function remainingToGoal(mtdNetSales: number, survivalGoal: number): number {
  return Math.round(survivalGoal - mtdNetSales);
}

// ============================================
// SPREAD / AMORTIZATION CALCULATIONS
// ============================================

/**
 * Calculate monthly portion for a spread expense
 * Straight-line amortization: amount / spreadMonths
 */
export function spreadExpenseMonthlyPortion(amount: number, spreadMonths: number): number {
  if (spreadMonths <= 0) return amount;
  return Math.round((amount / spreadMonths) * 100) / 100; // Two decimal places
}

/**
 * Parse ISO date string to year, month, day integers
 * Avoids new Date() timezone issues
 */
export function parseISODate(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

/**
 * Check if a spread expense applies to a given month
 * Uses manual ISO parsing to avoid timezone issues
 */
export function isSpreadExpenseActiveInMonth(
  purchaseDate: string,
  spreadMonths: number,
  targetYear: number,
  targetMonth: number // 1-12
): boolean {
  const { year: purchaseYear, month: purchaseMonth } = parseISODate(purchaseDate);
  
  // Calculate months since purchase
  const monthsSincePurchase = (targetYear - purchaseYear) * 12 + (targetMonth - purchaseMonth);
  
  return monthsSincePurchase >= 0 && monthsSincePurchase < spreadMonths;
}

/**
 * Calculate normalized COGS for True Health
 * Takes cash COGS and adjusts for spread portions
 */
export function normalizedCogs(
  cashCogs: number,
  spreadExpenses: SpreadExpense[],
  targetYear: number,
  targetMonth: number
): number {
  let normalized = cashCogs;
  
  for (const expense of spreadExpenses) {
    if (expense.category !== 'COGS') continue;
    
    const isActive = isSpreadExpenseActiveInMonth(
      expense.startDate,
      expense.spreadMonths,
      targetYear,
      targetMonth
    );
    
    if (isActive) {
      const monthlyPortion = spreadExpenseMonthlyPortion(expense.amount, expense.spreadMonths);
      
      // Check if purchase was in this month (already counted in cashCogs)
      const { year: pYear, month: pMonth } = parseISODate(expense.startDate);
      const isPurchaseMonth = pYear === targetYear && pMonth === targetMonth;
      
      if (isPurchaseMonth) {
        // Remove full amount, add back monthly portion
        normalized = normalized - expense.amount + monthlyPortion;
      } else {
        // Just add monthly portion
        normalized += monthlyPortion;
      }
    }
  }
  
  return Math.round(normalized * 100) / 100;
}

// ============================================
// HEALTH RESULTS
// ============================================

/**
 * Cash Health Result
 * mtdNetSales - mtdCogsCash - mtdOpexCash - monthlyRoofFund - mtdOwnerDraw
 * CAPEX displayed separately
 */
export function cashHealthResult(
  monthData: MonthData,
  monthlyRoofFund: number
): number {
  const result = 
    monthData.mtdNetSales - 
    monthData.mtdCogsCash - 
    monthData.mtdOpexCash - 
    monthlyRoofFund - 
    monthData.mtdOwnerDraw;
  return Math.round(result * 100) / 100;
}

/**
 * True Health Result
 * Uses normalized COGS with spread adjustments
 */
export function trueHealthResult(
  monthData: MonthData,
  monthlyRoofFund: number,
  normalizedCogsValue: number,
  normalizedCapex: number
): number {
  const result = 
    monthData.mtdNetSales - 
    normalizedCogsValue - 
    monthData.mtdOpexCash - 
    monthlyRoofFund - 
    monthData.mtdOwnerDraw -
    normalizedCapex;
  return Math.round(result * 100) / 100;
}

// ============================================
// ACTUAL VS TARGET PERCENTAGES
// ============================================

/**
 * Actual COGS rate = mtdCogsCash / mtdNetSales
 * Returns decimal (0.35 style), not percent (35)
 */
export function actualCogsRate(mtdCogsCash: number, mtdNetSales: number): number {
  if (mtdNetSales <= 0) return 0;
  return Math.round((mtdCogsCash / mtdNetSales) * 1000) / 1000; // 3 decimal places
}

// ============================================
// PACE CALCULATIONS
// ============================================

export interface OpenHoursTemplate {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

/**
 * Get day of week from date string
 * Uses UTC to avoid timezone issues with date-only strings
 */
export function getDayOfWeek(dateStr: string): keyof OpenHoursTemplate {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const days: (keyof OpenHoursTemplate)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getUTCDay()];
}

/**
 * Calculate remaining open hours in month
 */
export function remainingOpenHours(
  currentDate: string,
  template: OpenHoursTemplate,
  year: number,
  month: number // 1-12
): number {
  const [, , currentDay] = currentDate.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  
  let totalHours = 0;
  
  for (let day = currentDay; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayKey = getDayOfWeek(dateStr);
    totalHours += template[dayKey];
  }
  
  return totalHours;
}

/**
 * Calculate total open hours in month
 */
export function totalOpenHoursInMonth(
  template: OpenHoursTemplate,
  year: number,
  month: number // 1-12
): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  
  let totalHours = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayKey = getDayOfWeek(dateStr);
    totalHours += template[dayKey];
  }
  
  return totalHours;
}

/**
 * Daily Needed from Here - the pit board number
 * Calculates how much per open day is needed to hit monthGoal from current position
 * 
 * @param asOfDate - YYYY-MM-DD, the last day with sales data
 * @param mtdNetSales - MTD net sales through asOfDate
 * @param monthGoal - Target for the month (survivalGoal or other)
 * @param template - Open hours template
 * @returns { dailyNeeded, remainingOpenDays, remaining }
 */
export function dailyNeededFromHere(
  asOfDate: string,
  mtdNetSales: number,
  monthGoal: number,
  template: OpenHoursTemplate
): { dailyNeeded: number; remainingOpenDays: number; remaining: number } {
  const { year, month, day } = parseISODate(asOfDate);
  const daysInMonth = daysInMonthUTC(year, month);
  
  // Remaining to goal
  const remaining = Math.max(0, monthGoal - mtdNetSales);
  
  // Count open days AFTER asOfDate (not including asOfDate)
  let remainingOpenDays = 0;
  for (let d = day + 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (hoursForISODate(dateStr, template) > 0) {
      remainingOpenDays++;
    }
  }
  
  // Daily needed (handle division by zero)
  const dailyNeeded = remainingOpenDays > 0 
    ? Math.round(remaining / remainingOpenDays) 
    : remaining > 0 ? Infinity : 0;
  
  return { dailyNeeded, remainingOpenDays, remaining };
}

/**
 * Get days in month using UTC (avoids timezone issues)
 */
export function daysInMonthUTC(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// ============================================
// CONFIDENCE CALCULATION
// ============================================

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Calculate confidence level based on data completeness
 */
export function confidenceLevel(factors: ConfidenceFactors): ConfidenceLevel {
  if (factors.hasSalesData && factors.hasRecentExpenses) {
    return 'HIGH';
  }
  if (factors.hasSalesData) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Calculate confidence score (0-100) for health score weighting
 */
export function confidenceScore(factors: ConfidenceFactors): number {
  let score = 0;
  
  // Data coverage (0-50 points)
  if (factors.totalDaysInPeriod > 0) {
    const coverage = factors.daysWithData / factors.totalDaysInPeriod;
    score += Math.min(50, Math.round(coverage * 50));
  }
  
  // Recent expense logging (0-30 points)
  if (factors.hasRecentExpenses) {
    score += 30;
  }
  
  // Has any sales data (0-20 points)
  if (factors.hasSalesData) {
    score += 20;
  }
  
  return Math.min(100, score);
}

// ============================================
// HEALTH SCORE (COMPOSITE)
// ============================================

/**
 * Calculate composite health score (0-100)
 * Weighted combination of pace, COGS efficiency, OPEX control, and confidence
 */
export function healthScore(
  mtdNetSales: number,
  survivalGoal: number,
  actualCogs: number,
  targetCogs: number,
  mtdOpex: number,
  expectedMonthlyOpex: number,
  confidence: number
): number {
  // Pace score (0-50): How close to survival goal
  const paceRatio = Math.min(1.2, mtdNetSales / survivalGoal);
  const paceScore = Math.round((paceRatio / 1.2) * 50);
  
  // COGS score (0-20): How close to target COGS %
  let cogsScore = 20;
  if (actualCogs > targetCogs) {
    const overage = actualCogs - targetCogs;
    cogsScore = Math.max(0, 20 - Math.round(overage * 100)); // -1 point per 1% over
  }
  
  // OPEX score (0-15): Staying within expected OPEX
  let opexScore = 15;
  if (expectedMonthlyOpex > 0 && mtdOpex > expectedMonthlyOpex) {
    const overage = (mtdOpex - expectedMonthlyOpex) / expectedMonthlyOpex;
    opexScore = Math.max(0, 15 - Math.round(overage * 30));
  }
  
  // Confidence score (0-15): Data quality
  const confScore = Math.round((confidence / 100) * 15);
  
  return Math.min(100, Math.max(0, paceScore + cogsScore + opexScore + confScore));
}

// ============================================
// CASH SNAPSHOT / LIQUIDITY
// ============================================

export interface DayEntryForSnapshot {
  date: string; // ISO YYYY-MM-DD
  netSalesExTax: number | null;
}

export interface ExpenseForSnapshot {
  date: string; // ISO YYYY-MM-DD
  amount: number;
}

/**
 * Calculate net change in cash since a snapshot date.
 * Uses ISO string comparison (no Date parsing for business logic).
 * 
 * @param snapshotAsOf - ISO YYYY-MM-DD string when snapshot was taken
 * @param asOfDate - ISO YYYY-MM-DD string for calculation end date
 * @param dayEntries - Array of day entries with dates and sales
 * @param expenses - Array of expenses with dates and amounts
 * @returns Net change: sales - expenses for dates > snapshotAsOf AND <= asOfDate
 */
export function changeSinceSnapshot(
  snapshotAsOf: string,
  asOfDate: string,
  dayEntries: DayEntryForSnapshot[],
  expenses: ExpenseForSnapshot[]
): number {
  // Sum sales AFTER snapshotAsOf through asOfDate (exclusive start, inclusive end)
  // ISO string comparison works because YYYY-MM-DD sorts lexicographically
  const salesSum = dayEntries
    .filter(e => e.date > snapshotAsOf && e.date <= asOfDate && e.netSalesExTax !== null)
    .reduce((sum, e) => sum + (e.netSalesExTax ?? 0), 0);
  
  // Sum expenses AFTER snapshotAsOf through asOfDate
  const expensesSum = expenses
    .filter(e => e.date > snapshotAsOf && e.date <= asOfDate)
    .reduce((sum, e) => sum + e.amount, 0);
  
  return salesSum - expensesSum;
}

/**
 * Calculate current cash on hand from snapshot + change.
 * 
 * @param snapshotAmount - Cash amount at snapshot date
 * @param changeSince - Net change since snapshot
 * @returns Current estimated cash on hand
 */
export function cashOnHand(snapshotAmount: number, changeSince: number): number {
  return snapshotAmount + changeSince;
}

/**
 * Calculate fill percentage for cash gauge.
 * Clamped to 0-1 range. Uses monthlyFixedNut as denominator.
 * 
 * @param cashNow - Current cash on hand
 * @param monthlyFixedNut - Monthly fixed expenses (from settings, not hardcoded)
 * @returns Fill percentage clamped 0-1
 */
export function cashFillPct(cashNow: number, monthlyFixedNut: number): number {
  if (monthlyFixedNut <= 0) return 0;
  const pct = cashNow / monthlyFixedNut;
  return Math.max(0, Math.min(1, pct));
}

// ============================================
// LIQUIDITY RECEIVER - WEEKLY SERIES HELPERS
// ============================================

export interface ReferenceMonthData {
  year: number;
  month: number; // 1-12
  referenceNetSalesExTax: number;
}

export interface WeeklyEstimate {
  weekStart: string; // ISO YYYY-MM-DD (Monday of that week)
  weekEnd: string;   // ISO YYYY-MM-DD (Sunday of that week)
  value: number;
  isEstimate: boolean;
  source: 'LY_EST' | 'ACTUAL' | 'MIXED';
}

export interface WeeklyBalance {
  weekEnd: string;   // ISO YYYY-MM-DD
  balance: number;
  isEstimate: boolean;
}

export interface WeeklyDelta {
  weekEnd: string;
  delta: number;
  hasData: boolean; // false = gap/missing data
}

/**
 * Get ISO week start (Monday) for a given date string
 */
export function getWeekStart(dateStr: string): string {
  const { year, month, day } = parseISODate(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay(); // 0 = Sun, 1 = Mon, ...
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since Monday
  date.setUTCDate(date.getUTCDate() - diff);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Get ISO week end (Sunday) for a given date string
 */
export function getWeekEnd(dateStr: string): string {
  const weekStart = getWeekStart(dateStr);
  const { year, month, day } = parseISODate(weekStart);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 6);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Add days to an ISO date string
 */
export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseISODate(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Convert ReferenceMonth data to weekly LY estimates using hours template weighting.
 * Distributes monthly totals across weeks proportionally by open hours.
 * 
 * @param referenceMonths - Array of monthly reference data
 * @param template - Open hours template for weighting
 * @param startDate - First week start date (ISO)
 * @param endDate - Last date to include (ISO)
 * @returns Array of weekly estimates
 */
export function referenceMonthsToWeeklyLYEstimate(
  referenceMonths: ReferenceMonthData[],
  template: OpenHoursTemplate,
  startDate: string,
  endDate: string
): WeeklyEstimate[] {
  const weeks: WeeklyEstimate[] = [];
  
  // Find the first year of business (earliest reference year)
  const firstYear = referenceMonths.length > 0
    ? Math.min(...referenceMonths.map(rm => rm.year))
    : parseInt(startDate.split('-')[0]);
  
  // Build a map of year-month to reference value
  const refMap = new Map<string, number>();
  for (const rm of referenceMonths) {
    refMap.set(`${rm.year}-${rm.month}`, rm.referenceNetSalesExTax);
  }
  
  // Iterate week by week
  let currentWeekStart = getWeekStart(startDate);
  
  while (currentWeekStart <= endDate) {
    const weekEnd = getWeekEnd(currentWeekStart);
    
    // Calculate weighted value for this week
    // Sum hours in this week and map to monthly reference
    let weeklyValue = 0;
    
    for (let d = 0; d < 7; d++) {
      const dayStr = addDays(currentWeekStart, d);
      if (dayStr > endDate) break;
      
      const { year, month } = parseISODate(dayStr);
      // First year: use that year's own data (baseline)
      // Subsequent years: use prior year, fall back to current year if prior doesn't exist
      let monthlyRef = 0;
      if (year === firstYear) {
        monthlyRef = refMap.get(`${year}-${month}`) ?? 0;
      } else {
        monthlyRef = refMap.get(`${year - 1}-${month}`) ?? refMap.get(`${year}-${month}`) ?? 0;
      }
      const monthTotalHours = totalOpenHoursInMonth(template, year, month);
      const dayHours = hoursForISODate(dayStr, template);
      
      if (monthTotalHours > 0) {
        weeklyValue += monthlyRef * (dayHours / monthTotalHours);
      }
    }
    
    weeks.push({
      weekStart: currentWeekStart,
      weekEnd,
      value: Math.round(weeklyValue * 100) / 100,
      isEstimate: true,
      source: 'LY_EST',
    });
    
    // Move to next week
    currentWeekStart = addDays(currentWeekStart, 7);
  }
  
  return weeks;
}

/**
 * Generate weekly end-of-week cash balances from snapshot.
 * Calculates running balance based on actual sales and expenses.
 * 
 * @param snapshotAmount - Cash at snapshot date
 * @param snapshotAsOf - Snapshot date (ISO)
 * @param dayEntries - All day entries
 * @param expenses - All expenses
 * @param startDate - First week to include
 * @param endDate - Last date (usually asOfDate)
 * @returns Array of weekly balances
 */
export function cashBalanceSeriesFromSnapshot(
  snapshotAmount: number,
  snapshotAsOf: string,
  dayEntries: DayEntryForSnapshot[],
  expenses: ExpenseForSnapshot[],
  startDate: string,
  endDate: string
): WeeklyBalance[] {
  const balances: WeeklyBalance[] = [];
  
  // Sort entries for efficient processing
  const sortedEntries = [...dayEntries].sort((a, b) => a.date.localeCompare(b.date));
  const sortedExpenses = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  
  let currentWeekStart = getWeekStart(startDate);
  let runningBalance = snapshotAmount;
  let hasAnyActualData = false;
  
  while (currentWeekStart <= endDate) {
    const weekEnd = getWeekEnd(currentWeekStart);
    const effectiveWeekEnd = weekEnd > endDate ? endDate : weekEnd;
    
    // Sum sales for this week (after snapshot, up to week end)
    const weekSales = sortedEntries
      .filter(e => 
        e.date > snapshotAsOf && 
        e.date >= currentWeekStart && 
        e.date <= effectiveWeekEnd && 
        e.netSalesExTax !== null
      )
      .reduce((sum, e) => sum + (e.netSalesExTax ?? 0), 0);
    
    // Sum expenses for this week (after snapshot, up to week end)
    const weekExpenses = sortedExpenses
      .filter(e => 
        e.date > snapshotAsOf && 
        e.date >= currentWeekStart && 
        e.date <= effectiveWeekEnd
      )
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Check if we have any actual data this week
    const hasDataThisWeek = sortedEntries.some(e => 
      e.date >= currentWeekStart && 
      e.date <= effectiveWeekEnd && 
      e.netSalesExTax !== null
    );
    
    if (hasDataThisWeek) hasAnyActualData = true;
    
    // Update running balance
    runningBalance += weekSales - weekExpenses;
    
    balances.push({
      weekEnd: effectiveWeekEnd,
      balance: Math.round(runningBalance * 100) / 100,
      isEstimate: !hasAnyActualData,
    });
    
    currentWeekStart = addDays(currentWeekStart, 7);
  }
  
  return balances;
}

/**
 * Derive weekly deltas from a balance series.
 * Delta = balance[n] - balance[n-1]
 * 
 * @param balances - Array of weekly balances
 * @returns Array of weekly deltas
 */
export function weeklyDeltaSeriesFromBalance(balances: WeeklyBalance[]): WeeklyDelta[] {
  if (balances.length === 0) return [];
  
  const deltas: WeeklyDelta[] = [];
  
  for (let i = 0; i < balances.length; i++) {
    if (i === 0) {
      // First week: delta is just the balance change from snapshot (implicit 0)
      deltas.push({
        weekEnd: balances[i].weekEnd,
        delta: 0, // No prior week to compare
        hasData: !balances[i].isEstimate,
      });
    } else {
      deltas.push({
        weekEnd: balances[i].weekEnd,
        delta: Math.round((balances[i].balance - balances[i - 1].balance) * 100) / 100,
        hasData: !balances[i].isEstimate,
      });
    }
  }
  
  return deltas;
}

export interface ETAResult {
  etaDays: number | null;    // null if infinite/unreachable
  etaMin: number | null;     // range min if confidence not HIGH
  etaMax: number | null;     // range max if confidence not HIGH
  isEstimate: boolean;
  direction: 'to_floor' | 'to_target' | 'stable';
}

/**
 * Calculate ETA to a threshold (floor or target).
 * 
 * @param cashNow - Current cash balance
 * @param threshold - Target threshold (floor or target reserve)
 * @param velocity - Daily burn/gain rate (negative = burning)
 * @param confidence - Confidence level
 * @returns ETA result with optional range band
 */
export function etaToThreshold(
  cashNow: number,
  threshold: number,
  velocity: number,
  confidence: ConfidenceLevel
): ETAResult {
  const diff = threshold - cashNow;
  
  // Already at or past threshold
  if (velocity >= 0 && diff <= 0) {
    return {
      etaDays: 0,
      etaMin: null,
      etaMax: null,
      isEstimate: false,
      direction: 'stable',
    };
  }
  
  // Heading toward floor (burning cash)
  if (velocity < 0 && cashNow > threshold) {
    const daysToFloor = Math.ceil((cashNow - threshold) / Math.abs(velocity));
    
    if (confidence === 'HIGH') {
      return {
        etaDays: daysToFloor,
        etaMin: null,
        etaMax: null,
        isEstimate: false,
        direction: 'to_floor',
      };
    }
    
    // Add uncertainty band: ±20% for MEDIUM, ±40% for LOW
    const uncertainty = confidence === 'MEDIUM' ? 0.2 : 0.4;
    return {
      etaDays: daysToFloor,
      etaMin: Math.floor(daysToFloor * (1 - uncertainty)),
      etaMax: Math.ceil(daysToFloor * (1 + uncertainty)),
      isEstimate: true,
      direction: 'to_floor',
    };
  }
  
  // Heading toward target (growing cash)
  if (velocity > 0 && cashNow < threshold) {
    const daysToTarget = Math.ceil(diff / velocity);
    
    if (confidence === 'HIGH') {
      return {
        etaDays: daysToTarget,
        etaMin: null,
        etaMax: null,
        isEstimate: false,
        direction: 'to_target',
      };
    }
    
    const uncertainty = confidence === 'MEDIUM' ? 0.2 : 0.4;
    return {
      etaDays: daysToTarget,
      etaMin: Math.floor(daysToTarget * (1 - uncertainty)),
      etaMax: Math.ceil(daysToTarget * (1 + uncertainty)),
      isEstimate: true,
      direction: 'to_target',
    };
  }
  
  // Velocity wrong direction or zero - won't reach threshold
  return {
    etaDays: null,
    etaMin: null,
    etaMax: null,
    isEstimate: confidence !== 'HIGH',
    direction: 'stable',
  };
}

/**
 * Calculate average daily velocity from recent data.
 * Uses last N days of actual balance changes.
 * 
 * @param balances - Weekly balance series
 * @param lookbackDays - Number of days to look back (7, 30, etc.)
 * @returns Average daily velocity (positive = gaining, negative = burning)
 */
export function calculateVelocity(
  balances: WeeklyBalance[],
  lookbackDays: number
): number {
  if (balances.length < 2) return 0;
  
  // Find balances within lookback period
  const lookbackWeeks = Math.ceil(lookbackDays / 7);
  const recentBalances = balances.slice(-Math.min(lookbackWeeks + 1, balances.length));
  
  if (recentBalances.length < 2) return 0;
  
  const first = recentBalances[0];
  const last = recentBalances[recentBalances.length - 1];
  
  // Calculate days between first and last
  const startDate = parseISODate(first.weekEnd);
  const endDate = parseISODate(last.weekEnd);
  const daysDiff = Math.max(1, 
    (Date.UTC(endDate.year, endDate.month - 1, endDate.day) - 
     Date.UTC(startDate.year, startDate.month - 1, startDate.day)) / (1000 * 60 * 60 * 24)
  );
  
  return Math.round(((last.balance - first.balance) / daysDiff) * 100) / 100;
}

// ============================================
// CONTINUITY MODE HELPERS
// ============================================

/**
 * Daily sales estimate from reference months.
 */
export interface DailySalesEstimate {
  date: string; // ISO YYYY-MM-DD
  estimatedSales: number;
  isEstimate: true;
}

/**
 * Daily net cash flow estimate.
 */
export interface DailyNetFlowEstimate {
  date: string;
  sales: number;
  netFlow: number; // sales - cogs - fees - dailyNut
  isEstimate: true;
}

/**
 * Daily balance point (either estimated or actual).
 */
export interface DailyBalancePoint {
  date: string;
  balance: number;
  isEstimate: boolean;
  source: 'ACTUAL' | 'ESTIMATED' | 'RECONCILED';
}

/**
 * Convert reference months to daily sales estimates using store hours weighting.
 * Distributes each month's total sales across days based on daily open hours.
 */
export function referenceMonthsToDailySalesEstimate(
  referenceMonths: ReferenceMonthData[],
  storeHoursTemplate: Record<string, number>,
  year: number
): DailySalesEstimate[] {
  return referenceMonthsToDailySalesEstimateForYear(referenceMonths, storeHoursTemplate, year, year);
}

/**
 * Convert reference months to daily sales estimates for a date range.
 * - First year of business: uses that year's own reference data
 * - Subsequent years: uses prior year's reference data for comparison
 */
export function referenceMonthsToDailySalesEstimateForRange(
  referenceMonths: ReferenceMonthData[],
  storeHoursTemplate: Record<string, number>,
  startDate: string,
  endDate: string
): DailySalesEstimate[] {
  const result: DailySalesEstimate[] = [];
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  // Find the first year of business (earliest reference year)
  const firstYear = referenceMonths.length > 0
    ? Math.min(...referenceMonths.map(rm => rm.year))
    : parseInt(startDate.split('-')[0]);
  
  // Build a map of year-month to reference value
  const refMap = new Map<string, number>();
  for (const rm of referenceMonths) {
    refMap.set(`${rm.year}-${rm.month}`, rm.referenceNetSalesExTax);
  }
  
  // Iterate through each day in the range
  let currentDate = startDate;
  while (currentDate <= endDate) {
    const { year, month, day } = parseISODate(currentDate);
    
    // Determine which year's reference data to use:
    // - First year: use that year's own data (it's the baseline)
    // - Subsequent years: use prior year, but fall back to current year if prior doesn't exist
    let monthlyRef = 0;
    if (year === firstYear) {
      // First year: use own data
      monthlyRef = refMap.get(`${year}-${month}`) ?? 0;
    } else {
      // Try prior year first, fall back to current year if not found
      monthlyRef = refMap.get(`${year - 1}-${month}`) ?? refMap.get(`${year}-${month}`) ?? 0;
    }
    
    // Calculate this day's share of the month
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay();
    const dayHours = storeHoursTemplate[dayNames[dayOfWeek]] || 0;
    
    // Calculate total hours for the month
    let totalHours = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = new Date(Date.UTC(year, month - 1, d));
      totalHours += storeHoursTemplate[dayNames[dd.getUTCDay()]] || 0;
    }
    
    const dailySales = totalHours > 0 && monthlyRef > 0 
      ? (dayHours / totalHours) * monthlyRef 
      : 0;
    
    result.push({
      date: currentDate,
      estimatedSales: Math.round(dailySales * 100) / 100,
      isEstimate: true,
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  return result;
}

/**
 * Convert reference months to daily sales estimates for a different target year.
 * Uses sourceYear's reference data but generates dates for targetYear.
 * This allows using last year's patterns to estimate this year's sales.
 */
export function referenceMonthsToDailySalesEstimateForYear(
  referenceMonths: ReferenceMonthData[],
  storeHoursTemplate: Record<string, number>,
  sourceYear: number,
  targetYear: number
): DailySalesEstimate[] {
  const result: DailySalesEstimate[] = [];
  
  // Day name mapping for store hours template
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  for (const ref of referenceMonths) {
    if (ref.year !== sourceYear) continue;
    
    const monthSales = ref.referenceNetSalesExTax;
    if (monthSales <= 0) continue;
    
    // Get days in target year's month (may differ from source year due to leap years)
    const daysInMonth = new Date(Date.UTC(targetYear, ref.month, 0)).getUTCDate();
    
    // Calculate total hours for the month in target year
    let totalHours = 0;
    const dailyHours: number[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(targetYear, ref.month - 1, day));
      const dayOfWeek = date.getUTCDay();
      const hours = storeHoursTemplate[dayNames[dayOfWeek]] || 0;
      dailyHours.push(hours);
      totalHours += hours;
    }
    
    // Distribute sales by hours (using source year's totals, target year's dates)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${String(ref.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hours = dailyHours[day - 1];
      const dailySales = totalHours > 0 ? (hours / totalHours) * monthSales : 0;
      
      result.push({
        date: dateStr,
        estimatedSales: Math.round(dailySales * 100) / 100,
        isEstimate: true,
      });
    }
  }
  
  // Sort by date
  result.sort((a, b) => a.date.localeCompare(b.date));
  
  return result;
}

/**
 * Convert daily sales estimates to daily net cash flow.
 * estNet = sales - sales*cogsRate - sales*feesRate - dailyNutAllocation
 */
export function estimateDailyNetCashFlow(
  dailySales: DailySalesEstimate[],
  cogsRate: number,
  feesRate: number,
  monthlyNut: number
): DailyNetFlowEstimate[] {
  // Calculate daily nut allocation (monthly / ~30.4 days)
  const dailyNut = monthlyNut / 30.4;
  
  return dailySales.map(day => {
    const sales = day.estimatedSales;
    const cogs = sales * cogsRate;
    const fees = sales * feesRate;
    const netFlow = sales - cogs - fees - dailyNut;
    
    return {
      date: day.date,
      sales,
      netFlow: Math.round(netFlow * 100) / 100,
      isEstimate: true,
    };
  });
}

/**
 * Build running balance series from a starting anchor and daily net flows.
 */
export function buildEstimatedBalanceSeries(
  startCashAmount: number,
  startDate: string,
  dailyNetFlows: DailyNetFlowEstimate[]
): DailyBalancePoint[] {
  const result: DailyBalancePoint[] = [];
  
  // Filter to flows on or after start date
  const relevantFlows = dailyNetFlows.filter(f => f.date >= startDate);
  
  if (relevantFlows.length === 0) {
    return [{
      date: startDate,
      balance: startCashAmount,
      isEstimate: true,
      source: 'ESTIMATED',
    }];
  }
  
  let runningBalance = startCashAmount;
  
  // Add start point
  result.push({
    date: startDate,
    balance: runningBalance,
    isEstimate: true,
    source: 'ESTIMATED',
  });
  
  // Build running balance
  for (const flow of relevantFlows) {
    if (flow.date <= startDate) continue;
    
    runningBalance += flow.netFlow;
    result.push({
      date: flow.date,
      balance: Math.round(runningBalance * 100) / 100,
      isEstimate: true,
      source: 'ESTIMATED',
    });
  }
  
  return result;
}

/**
 * Reconcile an estimated balance series to match known start and end values.
 * Scales the estimated pattern to fit between startCash and endCash.
 * This creates an organic trajectory that respects the estimated flow pattern
 * while anchoring at the actual known values.
 */
export function reconcileSeriesToSnapshot(
  balanceSeries: DailyBalancePoint[],
  snapshotDate: string,
  snapshotCash: number
): DailyBalancePoint[] {
  if (balanceSeries.length === 0) return [];
  
  const startBalance = balanceSeries[0].balance;
  const startDate = balanceSeries[0].date;
  
  // Find the end point (snapshot or last point)
  const snapshotIdx = balanceSeries.findIndex(p => p.date >= snapshotDate);
  const endIdx = snapshotIdx === -1 ? balanceSeries.length - 1 : snapshotIdx;
  const endBalance = balanceSeries[endIdx].balance;
  
  // Calculate the estimated change vs actual change
  const estimatedChange = endBalance - startBalance;
  const actualChange = snapshotCash - startBalance;
  
  // Scale factor: how much to scale the estimated pattern
  const scaleFactor = estimatedChange !== 0 ? actualChange / estimatedChange : 1;
  
  return balanceSeries.map((point, idx) => {
    // Calculate this point's estimated change from start
    const pointChange = point.balance - startBalance;
    
    // Scale the change to match actual trajectory
    const scaledChange = pointChange * scaleFactor;
    const adjustedBalance = startBalance + scaledChange;
    
    return {
      date: point.date,
      balance: Math.round(adjustedBalance * 100) / 100,
      isEstimate: point.isEstimate,
      source: 'RECONCILED' as const,
    };
  });
}

/**
 * Merge actual and estimated balance series.
 * Actual data takes precedence where it exists.
 */
export function mergeActualAndEstimatedSeries(
  actualSeries: DailyBalancePoint[],
  estimatedSeries: DailyBalancePoint[]
): DailyBalancePoint[] {
  const actualByDate = new Map(actualSeries.map(p => [p.date, p]));
  
  return estimatedSeries.map(estPoint => {
    const actual = actualByDate.get(estPoint.date);
    if (actual) {
      return { ...actual, source: 'ACTUAL' as const };
    }
    return estPoint;
  });
}

// ============================================
// CONTINUITY V2: INFERRED ANCHOR + ACTUAL SERIES
// ============================================

/**
 * Result of inferring year start cash.
 */
export interface InferredAnchorResult {
  yearStartCash: number;
  isInferred: boolean;
  inferenceMethod: 'USER_PROVIDED' | 'BACK_CALCULATED' | 'DEFAULT';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Infer the year start cash amount.
 * Priority:
 * 1. If yearStartCashAmount is provided, use it (HIGH confidence)
 * 2. If we have cashNow and estimated cumulative flow, back-calculate (MEDIUM confidence)
 * 3. Default to 0 with LOW confidence
 */
export function inferYearStartCash(
  yearStartCashAmount: number | null,
  cashNow: number | null,
  cumulativeEstimatedNetFlow: number
): InferredAnchorResult {
  // User provided - highest confidence
  if (yearStartCashAmount !== null && yearStartCashAmount !== undefined) {
    return {
      yearStartCash: yearStartCashAmount,
      isInferred: false,
      inferenceMethod: 'USER_PROVIDED',
      confidence: 'HIGH',
    };
  }
  
  // Back-calculate from current cash position
  // impliedYearStartCash = cashNow - cumulativeEstimatedNetFlow
  if (cashNow !== null && cashNow !== undefined && !isNaN(cashNow)) {
    const inferred = cashNow - cumulativeEstimatedNetFlow;
    return {
      yearStartCash: Math.round(inferred * 100) / 100,
      isInferred: true,
      inferenceMethod: 'BACK_CALCULATED',
      confidence: 'MEDIUM',
    };
  }
  
  // Default - low confidence
  return {
    yearStartCash: 0,
    isInferred: true,
    inferenceMethod: 'DEFAULT',
    confidence: 'LOW',
  };
}

/**
 * Calculate cumulative estimated net flow from start date to end date.
 */
export function cumulativeEstimatedNetFlow(
  dailyNetFlows: DailyNetFlowEstimate[],
  startDate: string,
  endDate: string
): number {
  let total = 0;
  for (const flow of dailyNetFlows) {
    if (flow.date >= startDate && flow.date <= endDate) {
      total += flow.netFlow;
    }
  }
  return Math.round(total * 100) / 100;
}

/**
 * Build actual daily balance series from day entries and expenses.
 * Uses actual logged data only - no estimates.
 */
export function buildActualDailyBalanceSeries(
  snapshotCash: number,
  snapshotDate: string,
  dayEntries: Array<{ date: string; netSalesExTax: number }>,
  expenses: Array<{ date: string; amount: number }>,
  endDate: string
): DailyBalancePoint[] {
  const result: DailyBalancePoint[] = [];
  
  // Build maps for quick lookup
  const salesByDate = new Map<string, number>();
  for (const entry of dayEntries) {
    salesByDate.set(entry.date, entry.netSalesExTax);
  }
  
  const expensesByDate = new Map<string, number>();
  for (const exp of expenses) {
    const existing = expensesByDate.get(exp.date) || 0;
    expensesByDate.set(exp.date, existing + exp.amount);
  }
  
  // Start from snapshot
  let runningBalance = snapshotCash;
  let currentDate = snapshotDate;
  
  // Add snapshot point
  result.push({
    date: snapshotDate,
    balance: runningBalance,
    isEstimate: false,
    source: 'ACTUAL',
  });
  
  // Walk forward day by day
  while (currentDate < endDate) {
    currentDate = addDays(currentDate, 1);
    if (currentDate > endDate) break;
    
    const sales = salesByDate.get(currentDate);
    const exp = expensesByDate.get(currentDate) || 0;
    
    // Only add point if we have actual sales data for this day
    if (sales !== undefined) {
      runningBalance += sales - exp;
      result.push({
        date: currentDate,
        balance: Math.round(runningBalance * 100) / 100,
        isEstimate: false,
        source: 'ACTUAL',
      });
    }
  }
  
  return result;
}

/**
 * Comprehensive continuity result for the receiver.
 */
export interface ContinuitySeriesResult {
  estBalanceSeries: DailyBalancePoint[];    // Full estimated series from year start
  actualBalanceSeries: DailyBalancePoint[]; // Actual points only (where data exists)
  mergedBalanceSeries: DailyBalancePoint[]; // Merged: actual overrides estimated
  anchor: InferredAnchorResult;
  stats: {
    estCount: number;
    actualCount: number;
    mergedCount: number;
    yearStartDate: string;
    endDate: string;
  };
}

/**
 * Build complete continuity series for the liquidity receiver.
 * Always produces a continuous series from yearStartDate to asOfDate.
 */
export function buildContinuitySeries(
  yearStartCashAmount: number | null,
  yearStartDate: string,
  asOfDate: string,
  cashNow: number | null,
  snapshotCash: number | null,
  snapshotDate: string | null,
  referenceMonths: ReferenceMonthData[],
  storeHoursTemplate: Record<string, number>,
  dayEntries: Array<{ date: string; netSalesExTax: number }>,
  expenses: Array<{ date: string; amount: number }>,
  cogsRate: number,
  feesRate: number,
  monthlyNut: number
): ContinuitySeriesResult {
  // Generate daily sales estimates for the entire date range
  // Each date uses its PRIOR year's reference data (e.g., Jan 2026 → Jan 2025)
  const dailySales = referenceMonthsToDailySalesEstimateForRange(
    referenceMonths,
    storeHoursTemplate,
    yearStartDate,
    asOfDate
  );
  
  // Convert to daily net cash flow
  const dailyNetFlows = estimateDailyNetCashFlow(
    dailySales,
    cogsRate,
    feesRate,
    monthlyNut
  );
  
  // Calculate cumulative estimated flow from year start to asOfDate
  const cumFlow = cumulativeEstimatedNetFlow(dailyNetFlows, yearStartDate, asOfDate);
  
  // Infer year start cash if not provided
  const anchor = inferYearStartCash(yearStartCashAmount, cashNow, cumFlow);
  
  // Build estimated balance series from inferred/provided anchor
  let estBalanceSeries = buildEstimatedBalanceSeries(
    anchor.yearStartCash,
    yearStartDate,
    dailyNetFlows
  );
  
  // Filter to only dates up to asOfDate
  estBalanceSeries = estBalanceSeries.filter(p => p.date <= asOfDate);
  
  // If we have a snapshot, reconcile the estimated series
  if (snapshotCash !== null && snapshotDate !== null) {
    estBalanceSeries = reconcileSeriesToSnapshot(
      estBalanceSeries,
      snapshotDate,
      snapshotCash
    );
  }
  
  // Build actual balance series from snapshot forward
  let actualBalanceSeries: DailyBalancePoint[] = [];
  if (snapshotCash !== null && snapshotDate !== null) {
    actualBalanceSeries = buildActualDailyBalanceSeries(
      snapshotCash,
      snapshotDate,
      dayEntries,
      expenses,
      asOfDate
    );
  }
  
  // Merge actual over estimated
  const mergedBalanceSeries = mergeActualAndEstimatedSeries(
    actualBalanceSeries,
    estBalanceSeries
  );
  
  return {
    estBalanceSeries,
    actualBalanceSeries,
    mergedBalanceSeries,
    anchor,
    stats: {
      estCount: estBalanceSeries.length,
      actualCount: actualBalanceSeries.length,
      mergedCount: mergedBalanceSeries.length,
      yearStartDate,
      endDate: asOfDate,
    },
  };
}

/**
 * Downsample a daily series to weekly for wide views.
 * Takes the last point of each week (Sunday).
 */
export function downsampleToWeekly(
  dailySeries: DailyBalancePoint[]
): DailyBalancePoint[] {
  if (dailySeries.length === 0) return [];
  
  const weeklyPoints: DailyBalancePoint[] = [];
  let lastWeekEnd = '';
  
  for (const point of dailySeries) {
    const weekEnd = getWeekEnd(point.date);
    
    if (weekEnd !== lastWeekEnd) {
      weeklyPoints.push(point);
      lastWeekEnd = weekEnd;
    } else {
      // Replace with later point in same week
      weeklyPoints[weeklyPoints.length - 1] = point;
    }
  }
  
  return weeklyPoints;
}

/**
 * Calculate lane scale with padding for flat or near-flat series.
 * Returns min and max with at least 10% padding.
 */
export function calculateLaneScale(
  values: number[],
  includeMarkers: number[] = []
): { min: number; max: number; range: number } {
  const allValues = [...values, ...includeMarkers].filter(v => !isNaN(v) && isFinite(v));
  
  if (allValues.length === 0) {
    return { min: 0, max: 1000, range: 1000 };
  }
  
  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  
  // Ensure we have a range (avoid flat line)
  if (max === min) {
    const value = max;
    min = value * 0.8;
    max = value * 1.2;
    if (value === 0) {
      min = -100;
      max = 100;
    }
  }
  
  // Add 10% padding
  const range = max - min;
  const padding = range * 0.1;
  min -= padding;
  max += padding;
  
  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    range: Math.round((max - min) * 100) / 100,
  };
}

/**
 * Calculate delta lane scale (symmetric around 0).
 */
export function calculateDeltaScale(
  deltas: number[]
): { min: number; max: number; range: number } {
  const validDeltas = deltas.filter(d => !isNaN(d) && isFinite(d));
  
  if (validDeltas.length === 0) {
    return { min: -100, max: 100, range: 200 };
  }
  
  const maxAbs = Math.max(...validDeltas.map(Math.abs));
  const bound = maxAbs * 1.1; // 10% padding
  
  return {
    min: -bound,
    max: bound,
    range: bound * 2,
  };
}

/**
 * Safe to spend calculation.
 * safeToSpend = cashNow - operatingFloorCash, clamped at 0.
 */
export function safeToSpend(cashNow: number, operatingFloor: number): number {
  return Math.max(0, cashNow - operatingFloor);
}

/**
 * ETA label based on velocity direction.
 */
export interface ETALabel {
  text: string;
  isPositive: boolean;
  etaDate: string | null;
}

/**
 * Generate ETA label for floor/target.
 */
export function generateETALabel(
  cashNow: number,
  threshold: number,
  velocityPerDay: number,
  asOfDate: string,
  thresholdName: 'floor' | 'target'
): ETALabel {
  const diff = cashNow - threshold;
  
  if (thresholdName === 'floor') {
    // Floor: we're above it, velocity determines if we're approaching
    if (velocityPerDay >= 0) {
      return {
        text: 'Runway: extending',
        isPositive: true,
        etaDate: null,
      };
    }
    
    // Negative velocity - calculate days until floor
    const daysToFloor = Math.abs(diff / velocityPerDay);
    const etaDate = addDays(asOfDate, Math.ceil(daysToFloor));
    
    return {
      text: `Floor ETA: ${formatMonthDay(etaDate)} (est)`,
      isPositive: false,
      etaDate,
    };
  } else {
    // Target: we're below it, positive velocity means we're approaching
    if (velocityPerDay <= 0) {
      return {
        text: 'Target: receding',
        isPositive: false,
        etaDate: null,
      };
    }
    
    const daysToTarget = Math.abs((threshold - cashNow) / velocityPerDay);
    const etaDate = addDays(asOfDate, Math.ceil(daysToTarget));
    
    return {
      text: `Target ETA: ${formatMonthDay(etaDate)} (est)`,
      isPositive: true,
      etaDate,
    };
  }
}

/**
 * Format date as "Mon D" (e.g., "Jan 15").
 */
function formatMonthDay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}`;
}

// ============================================
// V3 COLOR MAPPING FUNCTIONS
// ============================================

/**
 * Get color for delta value based on magnitude.
 * - Negative delta (< -10% of max): red
 * - Flat delta (within ±10% of max): amber
 * - Positive delta (> 10% of max): cyan
 */
export function getDeltaColor(delta: number, maxDelta: number): string {
  if (maxDelta === 0) return '#f59e0b'; // amber for no data
  const ratio = delta / maxDelta;
  if (ratio < -0.1) return '#ef4444'; // red - negative
  if (ratio > 0.1) return '#22d3ee';  // cyan - positive
  return '#f59e0b'; // amber - flat/neutral
}

/**
 * Get color for balance value based on thresholds.
 * - Below floor: red
 * - At or above target: emerald
 * - Between: cyan
 */
export function getBalanceColor(value: number, floor: number, target: number): string {
  if (floor > 0 && value < floor) return '#ef4444'; // red - below floor
  if (target > 0 && value >= target) return '#10b981'; // emerald - above target
  return '#22d3ee'; // cyan - between
}

/**
 * Calculate visible-slice scale for balance lane.
 * Includes floor/target in scale with padding.
 */
export function calculateVisibleBalanceScale(
  values: number[],
  floor: number,
  target: number
): { min: number; max: number; range: number } {
  if (values.length === 0) return { min: 0, max: 100000, range: 100000 };
  
  let min = Math.min(...values);
  let max = Math.max(...values);
  
  // Include floor and target in scale
  if (floor > 0) min = Math.min(min, floor);
  if (target > 0) max = Math.max(max, target);
  
  // Add 15% padding
  const range = max - min || 10000;
  const padding = range * 0.15;
  min -= padding;
  max += padding;
  
  return { min, max, range: max - min };
}

/**
 * Calculate visible-slice scale for delta lane (symmetric around zero).
 */
export function calculateVisibleDeltaScale(deltas: number[]): { max: number } {
  if (deltas.length === 0) return { max: 5000 };
  const maxAbs = Math.max(...deltas.map(d => Math.abs(d)), 500);
  return { max: maxAbs * 1.1 };
}

// ============================================
// ADDITIONAL METRICS
// ============================================

/**
 * Calculate runway days - how many days of cash remaining at current burn rate.
 * @param cashNow - Current cash on hand
 * @param dailyBurn - Average daily net outflow (positive = burning cash)
 * @returns Number of days until cash runs out, or Infinity if not burning
 */
export function runwayDays(cashNow: number, dailyBurn: number): number {
  if (dailyBurn <= 0) return Infinity; // Not burning cash
  if (cashNow <= 0) return 0;
  return Math.floor(cashNow / dailyBurn);
}

/**
 * Calculate what percentage of monthly NUT is covered by current cash.
 * @param cashNow - Current cash on hand
 * @param monthlyNut - Monthly fixed costs (NUT)
 * @returns Percentage (e.g., 150 means 1.5 months covered)
 */
export function nutCoveragePercent(cashNow: number, monthlyNut: number): number {
  if (monthlyNut <= 0) return 0;
  return Math.round((cashNow / monthlyNut) * 100);
}

/**
 * Calculate week-over-week change from balance series.
 * @param balances - Array of weekly balances
 * @returns { amount: number, percent: number } or null if not enough data
 */
export function weekOverWeekChange(
  balances: WeeklyBalance[]
): { amount: number; percent: number } | null {
  if (balances.length < 2) return null;
  const current = balances[balances.length - 1].balance;
  const previous = balances[balances.length - 2].balance;
  const amount = current - previous;
  const percent = previous !== 0 ? Math.round((amount / previous) * 100) : 0;
  return { amount, percent };
}

/**
 * Calculate average daily sales from day entries.
 * @param dayEntries - Array of day entries with sales
 * @returns Average daily sales amount
 */
export function averageDailySales(
  dayEntries: Array<{ date: string; netSalesExTax: number | null }>
): number {
  const validEntries = dayEntries.filter(e => e.netSalesExTax !== null && e.netSalesExTax > 0);
  if (validEntries.length === 0) return 0;
  const total = validEntries.reduce((sum, e) => sum + (e.netSalesExTax ?? 0), 0);
  return Math.round(total / validEntries.length);
}

/**
 * Find best and worst weeks from weekly estimates or balances.
 * @param weeks - Array of weekly data with value property
 * @returns { best: { value, weekEnd }, worst: { value, weekEnd } } or null
 */
export function bestWorstWeeks(
  weeks: Array<{ weekEnd?: string; weekStart?: string; value?: number; balance?: number }>
): { best: { value: number; week: string }; worst: { value: number; week: string } } | null {
  if (weeks.length === 0) return null;
  
  const withValues = weeks.map(w => ({
    value: w.value ?? w.balance ?? 0,
    week: w.weekEnd ?? w.weekStart ?? ''
  })).filter(w => w.value > 0);
  
  if (withValues.length === 0) return null;
  
  const best = withValues.reduce((max, w) => w.value > max.value ? w : max, withValues[0]);
  const worst = withValues.reduce((min, w) => w.value < min.value ? w : min, withValues[0]);
  
  return { best, worst };
}

/**
 * Calculate same-period last-year comparison.
 * @param currentValue - Current period value
 * @param lyValue - Last year same period value
 * @returns { amount: number, percent: number } change vs LY
 */
export function vsLastYear(
  currentValue: number,
  lyValue: number
): { amount: number; percent: number } {
  const amount = currentValue - lyValue;
  const percent = lyValue !== 0 ? Math.round((amount / lyValue) * 100) : 0;
  return { amount, percent };
}

/**
 * Calculate gross margin trend (COGS % change).
 * @param currentCogsRate - Current period COGS rate
 * @param previousCogsRate - Previous period COGS rate
 * @returns Trend direction and change
 */
export function grossMarginTrend(
  currentCogsRate: number,
  previousCogsRate: number
): { direction: 'up' | 'down' | 'flat'; change: number } {
  const change = Math.round((currentCogsRate - previousCogsRate) * 100);
  if (change > 1) return { direction: 'up', change }; // COGS up = margin down (bad)
  if (change < -1) return { direction: 'down', change }; // COGS down = margin up (good)
  return { direction: 'flat', change };
}

/**
 * Calculate daily burn rate from balance series.
 * @param balances - Array of weekly balances
 * @param lookbackWeeks - Number of weeks to look back
 * @returns Average daily burn rate (positive = burning cash)
 */
export function dailyBurnRate(balances: WeeklyBalance[], lookbackWeeks: number = 4): number {
  if (balances.length < 2) return 0;
  
  const recentBalances = balances.slice(-Math.min(lookbackWeeks, balances.length));
  if (recentBalances.length < 2) return 0;
  
  const startBalance = recentBalances[0].balance;
  const endBalance = recentBalances[recentBalances.length - 1].balance;
  const daysCovered = recentBalances.length * 7;
  
  // Positive burn means losing money
  return Math.round(((startBalance - endBalance) / daysCovered) * 100) / 100;
}
