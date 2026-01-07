/**
 * DEPRECATED - Calendar Day Pacing Functions
 * 
 * These functions use simple calendar day proration instead of hours-weighted pacing.
 * They are kept for backwards compatibility but should NOT be used in new code.
 * 
 * Use the hours-weighted versions in calc.ts instead:
 * - mtdTargetToDateHoursWeighted()
 * - paceDeltaHoursWeighted()
 * - dailyNeededFromHere()
 */

/**
 * MTD Target to Date - simple calendar day proration
 * @deprecated Use mtdTargetToDateHoursWeighted() instead
 */
export function mtdTargetToDate(
  survivalGoal: number,
  currentDay: number,
  daysInMonth: number
): number {
  if (daysInMonth <= 0) return 0;
  return Math.round((survivalGoal / daysInMonth) * currentDay);
}

/**
 * Pace Delta - simple calendar day version
 * @deprecated Use paceDeltaHoursWeighted() instead
 */
export function paceDelta(
  mtdNetSales: number,
  survivalGoal: number,
  currentDay: number,
  daysInMonth: number
): number {
  const target = mtdTargetToDate(survivalGoal, currentDay, daysInMonth);
  return Math.round((mtdNetSales - target) * 100) / 100;
}

/**
 * Calculate daily sales needed to hit goal from current position
 * @deprecated Use dailyNeededFromHere() instead
 */
export function dailySalesNeeded(
  remaining: number,
  remainingHours: number,
  avgHoursPerOpenDay: number
): number {
  if (remainingHours <= 0 || avgHoursPerOpenDay <= 0) return 0;
  const remainingDays = remainingHours / avgHoursPerOpenDay;
  if (remainingDays <= 0) return 0;
  return Math.round(remaining / remainingDays);
}
