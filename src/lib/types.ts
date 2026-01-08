import { z } from 'zod';

// ============================================
// ZOD SCHEMAS
// ============================================

export const SalesInputModeSchema = z.enum([
  'NET_SALES_EX_TAX',
  'TOTAL_INCLUDES_TAX',
  'DEPOSIT_NET_OF_FEES',
]);

export const ExpenseCategorySchema = z.enum([
  'COGS',
  'OPEX',
  'TAX',
  'CAPEX',
  'OWNER_DRAW',
  'OTHER',
]);

export const RecurrenceRuleSchema = z.enum(['NONE', 'WEEKLY', 'MONTHLY']);

export const OpenHoursTemplateSchema = z.object({
  mon: z.number().min(0).max(24),
  tue: z.number().min(0).max(24),
  wed: z.number().min(0).max(24),
  thu: z.number().min(0).max(24),
  fri: z.number().min(0).max(24),
  sat: z.number().min(0).max(24),
  sun: z.number().min(0).max(24),
});

export const SettingsSchema = z.object({
  id: z.number().optional(),
  businessName: z.string().min(1),
  timezone: z.string(),
  salesInputMode: SalesInputModeSchema,
  targetCogsPct: z.number().min(0).max(1),
  targetFeesPct: z.number().min(0).max(1),
  monthlyFixedNut: z.number().min(0),
  // Individual NUT breakdown
  nutRent: z.number().min(0).optional(),
  nutUtilities: z.number().min(0).optional(),
  nutPhone: z.number().min(0).optional(),
  nutInternet: z.number().min(0).optional(),
  nutInsurance: z.number().min(0).optional(),
  nutLoanPayment: z.number().min(0).optional(),
  nutPayroll: z.number().min(0).optional(),
  nutSubscriptions: z.number().min(0).optional(),
  nutOther1: z.number().min(0).optional(),
  nutOther1Label: z.string().optional(),
  nutOther1Note: z.string().nullable().optional(),
  nutOther2: z.number().min(0).optional(),
  nutOther2Label: z.string().optional(),
  nutOther2Note: z.string().nullable().optional(),
  nutOther3: z.number().min(0).optional(),
  nutOther3Label: z.string().optional(),
  nutOther3Note: z.string().nullable().optional(),
  // Optional goals
  monthlyRoofFund: z.number().min(0),
  monthlyOwnerDrawGoal: z.number().min(0),
  openHoursTemplate: OpenHoursTemplateSchema,
  storeCloseHour: z.number().min(0).max(23).optional(),
  enableTrueHealth: z.boolean(),
  enableSpreading: z.boolean(),
  // Cash snapshot for liquidity tracking
  cashSnapshotAmount: z.number().nullable().optional(),
  cashSnapshotAsOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  // Year start cash for Liquidity dial reference
  yearStartCashAmount: z.number().nullable().optional(),
  yearStartCashDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Reserve thresholds
  operatingFloorCash: z.number().min(0).optional(),
  targetReserveCash: z.number().min(0).optional(),
  // Business start date for "days in business" counter
  businessStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const DayEntrySchema = z.object({
  id: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  netSalesExTax: z.number().nullable(),
  notes: z.string().nullable().optional(),
});

export const ExpenseTransactionSchema = z.object({
  id: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vendorId: z.string().nullable().optional(),
  vendorName: z.string().min(1),
  category: ExpenseCategorySchema,
  amount: z.number().min(0),
  memo: z.string().nullable().optional(),
  spreadMonths: z.number().min(1).nullable().optional(),
});

export const VendorTemplateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  defaultCategory: ExpenseCategorySchema,
  typicalAmount: z.number().min(0).nullable().optional(),
  isRecurring: z.boolean(),
  recurrenceRule: RecurrenceRuleSchema,
  dueDayOfMonth: z.number().min(1).max(31).nullable().optional(),
  autopopulateChecklist: z.boolean(),
});

export const ReferenceMonthSchema = z.object({
  id: z.number().optional(),
  year: z.number().min(2000).max(2100),
  month: z.number().min(1).max(12),
  referenceNetSalesExTax: z.number().min(0),
  note: z.string().nullable().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SalesInputMode = z.infer<typeof SalesInputModeSchema>;
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;
export type OpenHoursTemplate = z.infer<typeof OpenHoursTemplateSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type DayEntry = z.infer<typeof DayEntrySchema>;
export type ExpenseTransaction = z.infer<typeof ExpenseTransactionSchema>;
export type VendorTemplate = z.infer<typeof VendorTemplateSchema>;
export type ReferenceMonth = z.infer<typeof ReferenceMonthSchema>;

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  businessName: 'My Business',
  timezone: 'America/Denver',
  salesInputMode: 'NET_SALES_EX_TAX',
  targetCogsPct: 0.35,
  targetFeesPct: 0.03,
  monthlyFixedNut: 15500,
  // NUT breakdown defaults
  nutRent: 0,
  nutUtilities: 0,
  nutPhone: 0,
  nutInternet: 0,
  nutInsurance: 0,
  nutLoanPayment: 0,
  nutPayroll: 0,
  nutOther1: 0,
  nutOther1Label: 'Other 1',
  nutOther2: 0,
  nutOther2Label: 'Other 2',
  nutOther3: 0,
  nutOther3Label: 'Other 3',
  // Optional goals
  monthlyRoofFund: 0,
  monthlyOwnerDrawGoal: 0,
  openHoursTemplate: {
    mon: 0,
    tue: 8,
    wed: 8,
    thu: 8,
    fri: 8,
    sat: 8,
    sun: 5,
  },
  storeCloseHour: 16, // 4 PM default
  enableTrueHealth: true,
  enableSpreading: true,
  // Cash snapshot - null by default (not set)
  cashSnapshotAmount: null,
  cashSnapshotAsOf: null,
  // Year start cash - default to Jan 1 of current year
  yearStartCashAmount: null,
  yearStartCashDate: `${new Date().getFullYear()}-01-01`,
  // Reserve thresholds
  operatingFloorCash: 0,
  targetReserveCash: 100000,
};

// ============================================
// DASHBOARD DATA TYPES
// ============================================

export interface DashboardData {
  settings: Settings;
  mtdNetSales: number;
  mtdCogsCash: number;
  mtdOpexCash: number;
  mtdOwnerDraw: number;
  mtdCapexCash: number;
  survivalGoal: number;
  survivalPercent: number;
  remainingToGoal: number;
  dailySalesNeeded: number;
  cashHealthResult: number;
  trueHealthResult: number;
  paceDelta: number;
  mtdTargetToDate: number;
  hasCogs: boolean;
  hasOpex: boolean;
  actualCogsRate: number;
  normalizedCogs: number;
  normalizedCapex: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  healthScore: number;
  daysInMonth: number;
  currentDay: number;
  currentDate: string;
  asOfDate: string;
  asOfDay: number;
  salesNotEntered: boolean;
  // Pit-board data
  pitBoard: {
    dailyNeeded: number;
    remaining: number;
    remainingOpenDays: number;
  };
  lastYearReference: {
    year: number;
    month: number;
    netSales: number;
    note: string | null;
    estTargetToDate: number;
    vsLastYearPace: number;
    pctOfLastYear: number;
  } | null;
  // Cash snapshot data for liquidity card
  cashSnapshot: {
    hasSnapshot: boolean;
    snapshotAmount: number | null;
    snapshotAsOf: string | null;
    changeSince: number;
    cashNow: number;
    fillPct: number; // clamp(cashNow / monthlyFixedNut, 0, 1)
    isEstimate: boolean; // true when confidence != HIGH
    // 90-day daily net data for visualization
    dailyNet90: Array<{
      date: string; // ISO YYYY-MM-DD
      netSales: number | null; // null if sales not entered
      expenses: number;
      dailyNet: number | null; // null if sales not entered (not 0)
    }>;
    runwayPct: number | null; // clamp(cashNow / monthlyFixedNut, 0, 1) or null if nut not set
  };
  // Liquidity Receiver data
  liquidityReceiver: {
    balances: Array<{
      weekEnd: string;
      balance: number;
      isEstimate: boolean;
    }>;
    deltas: Array<{
      weekEnd: string;
      delta: number;
      hasData: boolean;
    }>;
    lyEstimates: Array<{
      weekStart: string;
      weekEnd: string;
      value: number;
      isEstimate: boolean;
      source: 'LY_EST' | 'ACTUAL' | 'MIXED';
    }>;
    // Continuity V2: full series data
    estBalanceSeries: Array<{
      date: string;
      balance: number;
      isEstimate: boolean;
      source: 'ACTUAL' | 'ESTIMATED' | 'RECONCILED';
    }>;
    actualBalanceSeries: Array<{
      date: string;
      balance: number;
      isEstimate: boolean;
      source: 'ACTUAL' | 'ESTIMATED' | 'RECONCILED';
    }>;
    mergedBalanceSeries: Array<{
      date: string;
      balance: number;
      isEstimate: boolean;
      source: 'ACTUAL' | 'ESTIMATED' | 'RECONCILED';
    }>;
    anchor: {
      yearStartCash: number;
      isInferred: boolean;
      inferenceMethod: 'USER_PROVIDED' | 'BACK_CALCULATED' | 'DEFAULT';
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    };
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
    // Continuity Mode metadata
    yearStartCashAmount: number | null;
    yearStartCashDate: string;
    etaToFloor: {
      etaDays: number | null;
      etaMin: number | null;
      etaMax: number | null;
      isEstimate: boolean;
      direction: 'to_floor' | 'to_target' | 'stable';
    };
    etaToTarget: {
      etaDays: number | null;
      etaMin: number | null;
      etaMax: number | null;
      isEstimate: boolean;
      direction: 'to_floor' | 'to_target' | 'stable';
    };
    aboveFloor: number;
    toTarget: number;
    businessStartDate: string | null;
    daysInBusiness: number | null;
  };
}

export interface HealthLensData {
  label: string;
  percent: number;
  mtdNetSales: number;
  remainingToGoal: number;
  dailySalesNeeded: number;
  result: number;
}
