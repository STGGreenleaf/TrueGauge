import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as calc from '@/lib/calc';
import { validateApiKey, logApiAction, getRecentActivity } from '@/lib/api-keys';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(orgId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(orgId);
  
  if (!entry || now > entry.resetAt) {
    rateLimit.set(orgId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

function errorResponse(error: string, message: string, status: number = 400) {
  return NextResponse.json({ error, message }, { status, headers: CORS_HEADERS });
}

function successResponse(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...data }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'ping') {
    return successResponse({ ok: true, timestamp: new Date().toISOString() });
  }

  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    return errorResponse('unauthorized', 'Missing API key', 401);
  }

  const { orgId, keyPrefix } = await validateApiKey(apiKey);

  if (!orgId) {
    return errorResponse('unauthorized', 'Invalid or revoked API key', 401);
  }

  if (!checkRateLimit(orgId)) {
    return errorResponse('rate_limited', 'Rate limit exceeded (100 req/min)', 429);
  }

  try {
    switch (action) {
      case 'summary':
        return await handleSummary(orgId);
      case 'fulkit_context':
        return await handleFulkitContext(orgId);
      case 'get_pace':
        return await handleGetPace(orgId);
      case 'get_settings':
        return await handleGetSettings(orgId);
      case 'get_cash':
        return await handleGetCash(orgId);
      case 'list_expenses':
        return await handleListExpenses(orgId, searchParams);
      case 'list_day_entries':
        return await handleListDayEntries(orgId, searchParams);
      case 'list_activity':
        return await handleListActivity(orgId);
      case 'list_alerts':
        return await handleListAlerts(orgId);
      case 'search':
        return await handleSearch(orgId, searchParams);
      case 'simulate_pace':
        return await handleSimulatePace(orgId, searchParams);
      default:
        return errorResponse('invalid_action', `Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('External API error:', error);
    return errorResponse('internal_error', 'An error occurred processing your request', 500);
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    return errorResponse('unauthorized', 'Missing API key', 401);
  }

  const { orgId, keyPrefix } = await validateApiKey(apiKey);

  if (!orgId) {
    return errorResponse('unauthorized', 'Invalid or revoked API key', 401);
  }

  if (!checkRateLimit(orgId)) {
    return errorResponse('rate_limited', 'Rate limit exceeded (100 req/min)', 429);
  }

  try {
    const body = await request.json();

    switch (action) {
      case 'add_expense':
        return await handleAddExpense(orgId, keyPrefix, body);
      case 'update_day_entry':
        return await handleUpdateDayEntry(orgId, keyPrefix, body);
      case 'update_cash_snapshot':
        return await handleUpdateCashSnapshot(orgId, keyPrefix, body);
      case 'confirm':
        return await handleConfirm(orgId, keyPrefix, body);
      case 'cancel':
        return await handleCancel(orgId, body);
      case 'undo':
        return await handleUndo(orgId, keyPrefix, body);
      default:
        return errorResponse('invalid_action', `Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('External API error:', error);
    return errorResponse('internal_error', 'An error occurred processing your request', 500);
  }
}

async function getOrgContext(orgId: string) {
  const settings = await prisma.settings.findUnique({
    where: { organizationId: orgId },
  });
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  
  if (!settings) {
    throw new Error('Settings not found');
  }
  
  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: settings.timezone }));
  const year = localTime.getFullYear();
  const month = localTime.getMonth() + 1;
  const day = localTime.getDate();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const todayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
  const openHoursTemplate = JSON.parse(settings.openHoursTemplate) as calc.OpenHoursTemplate;

  return { settings, org, year, month, day, monthStr, todayStr, openHoursTemplate, localTime };
}

async function handleSummary(orgId: string) {
  const ctx = await getOrgContext(orgId);
  const { settings, org, year, month, monthStr, todayStr, openHoursTemplate } = ctx;

  const dayEntries = await prisma.dayEntry.findMany({
    where: { organizationId: orgId, date: { startsWith: monthStr } },
  });

  const expenses = await prisma.expenseTransaction.findMany({
    where: { organizationId: orgId, date: { startsWith: monthStr } },
  });

  const entriesWithSales = dayEntries.filter(e => e.netSalesExTax !== null && e.netSalesExTax > 0);
  const asOfDate = entriesWithSales.length > 0
    ? entriesWithSales.reduce((max, e) => e.date > max ? e.date : max, entriesWithSales[0].date)
    : todayStr;

  const mtdNetSales = dayEntries
    .filter(e => e.date <= asOfDate)
    .reduce((sum, e) => sum + (e.netSalesExTax || 0), 0);

  const mtdCogsCash = expenses
    .filter(e => e.category === 'COGS')
    .reduce((sum, e) => sum + e.amount, 0);

  const mtdOpexCash = expenses
    .filter(e => e.category === 'OPEX')
    .reduce((sum, e) => sum + e.amount, 0);

  const survivalGoal = calc.survivalGoalNetExTax(
    settings.monthlyFixedNut,
    settings.targetCogsPct,
    settings.targetFeesPct
  );

  const survivalPct = calc.survivalPercent(mtdNetSales, survivalGoal);
  const paceDelta = calc.paceDeltaHoursWeighted(mtdNetSales, asOfDate, survivalGoal, openHoursTemplate);
  const actualCogs = calc.actualCogsRate(mtdCogsCash, mtdNetSales);

  const daysWithData = dayEntries.filter(e => e.netSalesExTax !== null).length;
  const confidenceFactors: calc.ConfidenceFactors = {
    hasSalesData: mtdNetSales > 0,
    hasRecentExpenses: expenses.length > 0,
    daysWithData,
    totalDaysInPeriod: ctx.day,
  };
  const confScore = calc.confidenceScore(confidenceFactors);

  const healthScoreValue = calc.healthScore(
    mtdNetSales,
    survivalGoal,
    actualCogs,
    settings.targetCogsPct,
    mtdOpexCash,
    settings.monthlyFixedNut,
    confScore
  );

  return successResponse({
    organization: {
      name: org?.name || settings.businessName,
    },
    asOfDate,
    counts: {
      dayEntries: dayEntries.length,
      expenses: expenses.length,
    },
    key_metric: {
      label: 'Health Score',
      value: healthScoreValue,
      unit: '/100',
      trend: healthScoreValue >= 70 ? 'healthy' : healthScoreValue >= 50 ? 'caution' : 'critical',
    },
    metrics: {
      mtdNetSales,
      survivalGoal,
      survivalPercent: survivalPct,
      paceDelta,
      actualCogsRate: actualCogs,
      targetCogsRate: settings.targetCogsPct,
    },
  });
}

async function handleFulkitContext(orgId: string) {
  const ctx = await getOrgContext(orgId);
  const { settings, org, year, month, monthStr, todayStr, openHoursTemplate } = ctx;

  const dayEntries = await prisma.dayEntry.findMany({
    where: { organizationId: orgId, date: { startsWith: monthStr } },
  });

  const expenses = await prisma.expenseTransaction.findMany({
    where: { organizationId: orgId, date: { startsWith: monthStr } },
  });

  const entriesWithSales = dayEntries.filter(e => e.netSalesExTax !== null && e.netSalesExTax > 0);
  const asOfDate = entriesWithSales.length > 0
    ? entriesWithSales.reduce((max, e) => e.date > max ? e.date : max, entriesWithSales[0].date)
    : todayStr;

  const mtdNetSales = dayEntries
    .filter(e => e.date <= asOfDate)
    .reduce((sum, e) => sum + (e.netSalesExTax || 0), 0);

  const mtdCogsCash = expenses
    .filter(e => e.category === 'COGS')
    .reduce((sum, e) => sum + e.amount, 0);

  const mtdOpexCash = expenses
    .filter(e => e.category === 'OPEX')
    .reduce((sum, e) => sum + e.amount, 0);

  const survivalGoal = calc.survivalGoalNetExTax(
    settings.monthlyFixedNut,
    settings.targetCogsPct,
    settings.targetFeesPct
  );

  const survivalPct = calc.survivalPercent(mtdNetSales, survivalGoal);
  const paceDelta = calc.paceDeltaHoursWeighted(mtdNetSales, asOfDate, survivalGoal, openHoursTemplate);
  const actualCogs = calc.actualCogsRate(mtdCogsCash, mtdNetSales);

  const daysWithData = dayEntries.filter(e => e.netSalesExTax !== null).length;
  const confidenceFactors: calc.ConfidenceFactors = {
    hasSalesData: mtdNetSales > 0,
    hasRecentExpenses: expenses.length > 0,
    daysWithData,
    totalDaysInPeriod: ctx.day,
  };
  const confScore = calc.confidenceScore(confidenceFactors);

  const healthScoreValue = calc.healthScore(
    mtdNetSales,
    survivalGoal,
    actualCogs,
    settings.targetCogsPct,
    mtdOpexCash,
    settings.monthlyFixedNut,
    confScore
  );

  const cashSnapshot = await prisma.cashSnapshot.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  const alerts = generateAlerts({
    paceDelta,
    survivalPct,
    actualCogs,
    targetCogs: settings.targetCogsPct,
    mtdOpex: mtdOpexCash,
    expectedOpex: settings.monthlyFixedNut,
    confScore,
    cashNow: cashSnapshot?.amount ?? 0,
    operatingFloor: settings.operatingFloorCash,
  });

  const recentActivity = await getRecentActivity(orgId, 5) as Array<{
    action: string;
    targetType: string | null;
    targetName: string | null;
    createdAt: Date;
    apiKeyPrefix: string | null;
  }>;

  const highlights: string[] = [];
  highlights.push(`${org?.name || settings.businessName} health score: **${healthScoreValue}/100** (${healthScoreValue >= 70 ? 'healthy' : healthScoreValue >= 50 ? 'caution' : 'needs attention'}).`);
  highlights.push(`MTD sales: **$${mtdNetSales.toLocaleString()}** vs survival goal of $${survivalGoal.toLocaleString()} (**${Math.round(survivalPct)}%**).`);
  
  if (paceDelta >= 0) {
    highlights.push(`Pace: **+$${paceDelta.toLocaleString()}** ahead of target.`);
  } else {
    highlights.push(`Pace: **$${paceDelta.toLocaleString()}** behind target.`);
  }

  if (cashSnapshot) {
    highlights.push(`Cash on hand: **$${cashSnapshot.amount.toLocaleString()}** as of ${cashSnapshot.date}.`);
  }

  if (alerts.length > 0) {
    highlights.push(`Active alerts: ${alerts.length} item(s) need attention.`);
  }

  return successResponse({
    organization: {
      name: org?.name || settings.businessName,
    },
    asOfDate,
    counts: {
      dayEntries: dayEntries.length,
      expenses: expenses.length,
    },
    key_metric: {
      label: 'Health Score',
      value: healthScoreValue,
      unit: '/100',
      trend: healthScoreValue >= 70 ? 'improving' : healthScoreValue >= 50 ? 'stable' : 'declining',
    },
    metrics: {
      mtdNetSales,
      survivalGoal,
      survivalPercent: survivalPct,
      paceDelta,
      monthlyNut: settings.monthlyFixedNut,
    },
    alerts,
    recent_activity: recentActivity.map(a => ({
      action: a.action,
      target: a.targetName || a.targetType,
      timestamp: a.createdAt.toISOString(),
    })),
    highlights,
    message: highlights.join(' '),
  });
}

function generateAlerts(data: {
  paceDelta: number;
  survivalPct: number;
  actualCogs: number;
  targetCogs: number;
  mtdOpex: number;
  expectedOpex: number;
  confScore: number;
  cashNow: number;
  operatingFloor: number;
}): Array<{ type: string; severity: string; message: string }> {
  const alerts: Array<{ type: string; severity: string; message: string }> = [];

  if (data.paceDelta < 0) {
    alerts.push({
      type: 'behind_pace',
      severity: 'warning',
      message: `Sales are $${Math.abs(data.paceDelta).toLocaleString()} behind pace for the month.`,
    });
  }

  if (data.survivalPct < 80) {
    alerts.push({
      type: 'below_survival',
      severity: 'critical',
      message: `Only at ${Math.round(data.survivalPct)}% of survival goal.`,
    });
  } else if (data.survivalPct < 100) {
    alerts.push({
      type: 'below_survival',
      severity: 'warning',
      message: `At ${Math.round(data.survivalPct)}% of survival goal.`,
    });
  }

  if (data.actualCogs > data.targetCogs + 0.02) {
    const overBy = Math.round((data.actualCogs - data.targetCogs) * 100);
    alerts.push({
      type: 'cogs_high',
      severity: 'warning',
      message: `COGS is ${overBy}% above target.`,
    });
  }

  if (data.confScore < 50) {
    alerts.push({
      type: 'low_confidence',
      severity: 'info',
      message: 'Data confidence is low. Consider logging more sales and expenses.',
    });
  }

  if (data.operatingFloor > 0 && data.cashNow < data.operatingFloor) {
    alerts.push({
      type: 'cash_below_floor',
      severity: 'critical',
      message: `Cash ($${data.cashNow.toLocaleString()}) is below operating floor ($${data.operatingFloor.toLocaleString()}).`,
    });
  }

  return alerts;
}

async function handleGetPace(orgId: string) {
  const ctx = await getOrgContext(orgId);
  const { settings, monthStr, todayStr, openHoursTemplate } = ctx;

  const dayEntries = await prisma.dayEntry.findMany({
    where: { organizationId: orgId, date: { startsWith: monthStr } },
  });

  const entriesWithSales = dayEntries.filter(e => e.netSalesExTax !== null && e.netSalesExTax > 0);
  const asOfDate = entriesWithSales.length > 0
    ? entriesWithSales.reduce((max, e) => e.date > max ? e.date : max, entriesWithSales[0].date)
    : todayStr;

  const mtdNetSales = dayEntries
    .filter(e => e.date <= asOfDate)
    .reduce((sum, e) => sum + (e.netSalesExTax || 0), 0);

  const survivalGoal = calc.survivalGoalNetExTax(
    settings.monthlyFixedNut,
    settings.targetCogsPct,
    settings.targetFeesPct
  );

  const survivalPct = calc.survivalPercent(mtdNetSales, survivalGoal);
  const paceDelta = calc.paceDeltaHoursWeighted(mtdNetSales, asOfDate, survivalGoal, openHoursTemplate);
  const mtdTarget = calc.mtdTargetToDateHoursWeighted(asOfDate, survivalGoal, openHoursTemplate);
  const pitBoard = calc.dailyNeededFromHere(asOfDate, mtdNetSales, survivalGoal, openHoursTemplate);

  return successResponse({
    asOfDate,
    mtdNetSales,
    survivalGoal,
    survivalPercent: survivalPct,
    mtdTarget,
    paceDelta,
    status: paceDelta >= 0 ? 'ahead' : 'behind',
    dailyNeeded: pitBoard.dailyNeeded === Infinity ? null : pitBoard.dailyNeeded,
    remainingOpenDays: pitBoard.remainingOpenDays,
    remainingToGoal: pitBoard.remaining,
  });
}

async function handleGetSettings(orgId: string) {
  const settings = await prisma.settings.findUnique({
    where: { organizationId: orgId },
  });

  if (!settings) {
    return errorResponse('not_found', 'Settings not found', 404);
  }

  const nutBreakdown = {
    rent: settings.nutRent,
    utilities: settings.nutUtilities,
    phone: settings.nutPhone,
    internet: settings.nutInternet,
    insurance: settings.nutInsurance,
    loanPayment: settings.nutLoanPayment,
    payroll: settings.nutPayroll,
    subscriptions: settings.nutSubscriptions,
    other1: { amount: settings.nutOther1, label: settings.nutOther1Label },
    other2: { amount: settings.nutOther2, label: settings.nutOther2Label },
    other3: { amount: settings.nutOther3, label: settings.nutOther3Label },
  };

  return successResponse({
    businessName: settings.businessName,
    timezone: settings.timezone,
    monthlyFixedNut: settings.monthlyFixedNut,
    nutBreakdown,
    targetCogsPct: settings.targetCogsPct,
    targetFeesPct: settings.targetFeesPct,
    monthlyRoofFund: settings.monthlyRoofFund,
    monthlyOwnerDrawGoal: settings.monthlyOwnerDrawGoal,
    operatingFloorCash: settings.operatingFloorCash,
    targetReserveCash: settings.targetReserveCash,
    openHours: JSON.parse(settings.openHoursTemplate),
  });
}

async function handleGetCash(orgId: string) {
  const settings = await prisma.settings.findUnique({
    where: { organizationId: orgId },
  });

  if (!settings) {
    return errorResponse('not_found', 'Settings not found', 404);
  }

  const latestSnapshot = await prisma.cashSnapshot.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  const cashNow = latestSnapshot?.amount ?? settings.cashSnapshotAmount ?? 0;
  const asOf = latestSnapshot?.date ?? settings.cashSnapshotAsOf ?? null;

  const runway = settings.monthlyFixedNut > 0
    ? Math.round((cashNow / settings.monthlyFixedNut) * 30)
    : null;

  return successResponse({
    cashNow,
    asOf,
    operatingFloor: settings.operatingFloorCash,
    targetReserve: settings.targetReserveCash,
    aboveFloor: Math.max(0, cashNow - settings.operatingFloorCash),
    toTarget: Math.max(0, settings.targetReserveCash - cashNow),
    runwayDays: runway,
    monthlyNut: settings.monthlyFixedNut,
  });
}

async function handleListExpenses(orgId: string, searchParams: URLSearchParams) {
  const monthParam = searchParams.get('month');
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const where: Record<string, unknown> = { organizationId: orgId };
  
  if (monthParam) {
    where.date = { startsWith: monthParam };
  }
  
  if (category) {
    where.category = category.toUpperCase();
  }

  const expenses = await prisma.expenseTransaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: Math.min(limit, 100),
    select: {
      id: true,
      date: true,
      vendorName: true,
      category: true,
      amount: true,
      memo: true,
      spreadMonths: true,
    },
  });

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return successResponse({
    count: expenses.length,
    totalAmount,
    expenses,
  });
}

async function handleListDayEntries(orgId: string, searchParams: URLSearchParams) {
  const monthParam = searchParams.get('month');
  const limit = parseInt(searchParams.get('limit') || '31', 10);

  const where: Record<string, unknown> = { organizationId: orgId };
  
  if (monthParam) {
    where.date = { startsWith: monthParam };
  }

  const entries = await prisma.dayEntry.findMany({
    where,
    orderBy: { date: 'desc' },
    take: Math.min(limit, 100),
    select: {
      id: true,
      date: true,
      netSalesExTax: true,
      notes: true,
    },
  });

  const totalSales = entries.reduce((sum, e) => sum + (e.netSalesExTax || 0), 0);
  const daysWithData = entries.filter(e => e.netSalesExTax !== null).length;

  return successResponse({
    count: entries.length,
    daysWithData,
    totalSales,
    entries,
  });
}

async function handleListActivity(orgId: string) {
  const activity = await getRecentActivity(orgId, 20);

  return successResponse({
    count: activity.length,
    activity: activity.map((a: { action: string; targetType: string | null; targetName: string | null; createdAt: Date; apiKeyPrefix: string | null }) => ({
      action: a.action,
      target: a.targetName || a.targetType,
      timestamp: a.createdAt.toISOString(),
      via: a.apiKeyPrefix ? 'api' : 'app',
    })),
  });
}

async function handleListAlerts(orgId: string) {
  const ctx = await getOrgContext(orgId);
  const { settings, monthStr, todayStr, openHoursTemplate } = ctx;

  const dayEntries = await prisma.dayEntry.findMany({
    where: { organizationId: orgId, date: { startsWith: monthStr } },
  });

  const expenses = await prisma.expenseTransaction.findMany({
    where: { organizationId: orgId, date: { startsWith: monthStr } },
  });

  const entriesWithSales = dayEntries.filter(e => e.netSalesExTax !== null && e.netSalesExTax > 0);
  const asOfDate = entriesWithSales.length > 0
    ? entriesWithSales.reduce((max, e) => e.date > max ? e.date : max, entriesWithSales[0].date)
    : todayStr;

  const mtdNetSales = dayEntries
    .filter(e => e.date <= asOfDate)
    .reduce((sum, e) => sum + (e.netSalesExTax || 0), 0);

  const mtdCogsCash = expenses.filter(e => e.category === 'COGS').reduce((sum, e) => sum + e.amount, 0);
  const mtdOpexCash = expenses.filter(e => e.category === 'OPEX').reduce((sum, e) => sum + e.amount, 0);

  const survivalGoal = calc.survivalGoalNetExTax(settings.monthlyFixedNut, settings.targetCogsPct, settings.targetFeesPct);
  const survivalPct = calc.survivalPercent(mtdNetSales, survivalGoal);
  const paceDelta = calc.paceDeltaHoursWeighted(mtdNetSales, asOfDate, survivalGoal, openHoursTemplate);
  const actualCogs = calc.actualCogsRate(mtdCogsCash, mtdNetSales);

  const daysWithData = dayEntries.filter(e => e.netSalesExTax !== null).length;
  const confScore = calc.confidenceScore({
    hasSalesData: mtdNetSales > 0,
    hasRecentExpenses: expenses.length > 0,
    daysWithData,
    totalDaysInPeriod: ctx.day,
  });

  const cashSnapshot = await prisma.cashSnapshot.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  const alerts = generateAlerts({
    paceDelta,
    survivalPct,
    actualCogs,
    targetCogs: settings.targetCogsPct,
    mtdOpex: mtdOpexCash,
    expectedOpex: settings.monthlyFixedNut,
    confScore,
    cashNow: cashSnapshot?.amount ?? 0,
    operatingFloor: settings.operatingFloorCash,
  });

  return successResponse({
    count: alerts.length,
    alerts,
  });
}

async function handleSearch(orgId: string, searchParams: URLSearchParams) {
  const query = searchParams.get('q')?.toLowerCase() || '';
  
  if (!query || query.length < 2) {
    return errorResponse('invalid_query', 'Search query must be at least 2 characters', 400);
  }

  const [vendors, expenses] = await Promise.all([
    prisma.vendorTemplate.findMany({
      where: { organizationId: orgId, name: { contains: query, mode: 'insensitive' } },
      take: 10,
      select: { id: true, name: true, defaultCategory: true, typicalAmount: true },
    }),
    prisma.expenseTransaction.findMany({
      where: { organizationId: orgId, vendorName: { contains: query, mode: 'insensitive' } },
      take: 10,
      orderBy: { date: 'desc' },
      select: { id: true, date: true, vendorName: true, category: true, amount: true },
    }),
  ]);

  return successResponse({
    results: [
      ...vendors.map(v => ({ type: 'vendor', id: v.id, name: v.name, category: v.defaultCategory, amount: v.typicalAmount })),
      ...expenses.map(e => ({ type: 'expense', id: e.id, name: e.vendorName, category: e.category, amount: e.amount, date: e.date })),
    ],
    counts: {
      vendors: vendors.length,
      expenses: expenses.length,
    },
  });
}

async function handleSimulatePace(orgId: string, searchParams: URLSearchParams) {
  const targetPct = parseFloat(searchParams.get('target_pct') || '100');
  
  const ctx = await getOrgContext(orgId);
  const { settings, monthStr, todayStr, openHoursTemplate, year, month } = ctx;

  const dayEntries = await prisma.dayEntry.findMany({
    where: { organizationId: orgId, date: { startsWith: monthStr } },
  });

  const entriesWithSales = dayEntries.filter(e => e.netSalesExTax !== null && e.netSalesExTax > 0);
  const asOfDate = entriesWithSales.length > 0
    ? entriesWithSales.reduce((max, e) => e.date > max ? e.date : max, entriesWithSales[0].date)
    : todayStr;

  const mtdNetSales = dayEntries
    .filter(e => e.date <= asOfDate)
    .reduce((sum, e) => sum + (e.netSalesExTax || 0), 0);

  const survivalGoal = calc.survivalGoalNetExTax(settings.monthlyFixedNut, settings.targetCogsPct, settings.targetFeesPct);
  const targetGoal = survivalGoal * (targetPct / 100);
  const remaining = targetGoal - mtdNetSales;

  const daysInMonth = new Date(year, month, 0).getDate();
  const asOfDay = parseInt(asOfDate.split('-')[2], 10);
  const remainingDays = daysInMonth - asOfDay;

  const totalMonthHours = calc.totalOpenHoursInMonth(openHoursTemplate, year, month);
  const mtdTarget = calc.mtdTargetToDateHoursWeighted(asOfDate, survivalGoal, openHoursTemplate);
  const pctThrough = survivalGoal > 0 ? mtdTarget / survivalGoal : 0;

  const dailyNeeded = remainingDays > 0 ? remaining / remainingDays : 0;

  return successResponse({
    scenario: {
      targetPercent: targetPct,
      targetGoal,
    },
    current: {
      mtdNetSales,
      survivalGoal,
      currentPercent: Math.round(calc.survivalPercent(mtdNetSales, survivalGoal)),
    },
    projection: {
      remaining: Math.max(0, remaining),
      remainingDays,
      dailyNeeded: remaining > 0 ? dailyNeeded : 0,
      achievable: remaining <= 0 || dailyNeeded < (mtdNetSales / Math.max(1, asOfDay)) * 1.5,
    },
  });
}

const previewStore = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();

async function handleAddExpense(orgId: string, keyPrefix: string, body: Record<string, unknown>) {
  const { date, vendorName, category, amount, memo, spreadMonths, preview } = body;

  if (!date || !vendorName || !category || amount === undefined) {
    return errorResponse('invalid_params', 'Missing required fields: date, vendorName, category, amount', 400);
  }

  const validCategories = ['COGS', 'OPEX', 'CAPEX', 'OWNER_DRAW', 'OTHER'];
  const upperCategory = String(category).toUpperCase();
  if (!validCategories.includes(upperCategory)) {
    return errorResponse('invalid_category', `Category must be one of: ${validCategories.join(', ')}`, 400);
  }

  const expenseData = {
    organizationId: orgId,
    date: String(date),
    vendorName: String(vendorName),
    category: upperCategory,
    amount: Number(amount),
    memo: memo ? String(memo) : null,
    spreadMonths: spreadMonths ? Number(spreadMonths) : null,
  };

  if (preview) {
    const previewId = `preview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    previewStore.set(previewId, {
      data: { action: 'add_expense', ...expenseData },
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return successResponse({
      preview: true,
      preview_id: previewId,
      expires_in: '5 minutes',
      will_create: {
        type: 'expense',
        ...expenseData,
      },
      impact: {
        description: `Will add $${Number(amount).toLocaleString()} ${upperCategory} expense from ${vendorName}`,
      },
    });
  }

  const expense = await prisma.expenseTransaction.create({ data: expenseData });

  await logApiAction({
    organizationId: orgId,
    apiKeyPrefix: keyPrefix,
    action: 'add_expense',
    targetType: 'expense',
    targetId: expense.id,
    targetName: vendorName as string,
    changes: expenseData,
    snapshot: expense as unknown as Record<string, unknown>,
    undoExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  return successResponse({
    created: true,
    expense: {
      id: expense.id,
      date: expense.date,
      vendorName: expense.vendorName,
      category: expense.category,
      amount: expense.amount,
    },
  });
}

async function handleUpdateDayEntry(orgId: string, keyPrefix: string, body: Record<string, unknown>) {
  const { date, netSalesExTax, notes, preview } = body;

  if (!date) {
    return errorResponse('invalid_params', 'Missing required field: date', 400);
  }

  const dateStr = String(date);
  const existing = await prisma.dayEntry.findFirst({
    where: { organizationId: orgId, date: dateStr },
  });

  const updateData = {
    netSalesExTax: netSalesExTax !== undefined ? Number(netSalesExTax) : existing?.netSalesExTax,
    notes: notes !== undefined ? String(notes) : existing?.notes,
  };

  if (preview) {
    const previewId = `preview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    previewStore.set(previewId, {
      data: { action: 'update_day_entry', date: dateStr, ...updateData, existingId: existing?.id },
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return successResponse({
      preview: true,
      preview_id: previewId,
      expires_in: '5 minutes',
      will_update: {
        date: dateStr,
        from: existing ? { netSalesExTax: existing.netSalesExTax, notes: existing.notes } : null,
        to: updateData,
      },
    });
  }

  let entry;
  if (existing) {
    entry = await prisma.dayEntry.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    entry = await prisma.dayEntry.create({
      data: {
        organizationId: orgId,
        date: dateStr,
        ...updateData,
      },
    });
  }

  await logApiAction({
    organizationId: orgId,
    apiKeyPrefix: keyPrefix,
    action: existing ? 'update_day_entry' : 'create_day_entry',
    targetType: 'day_entry',
    targetId: entry.id,
    targetName: dateStr,
    changes: updateData,
    snapshot: existing as unknown as Record<string, unknown>,
    undoExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  return successResponse({
    updated: true,
    entry: {
      id: entry.id,
      date: entry.date,
      netSalesExTax: entry.netSalesExTax,
      notes: entry.notes,
    },
  });
}

async function handleUpdateCashSnapshot(orgId: string, keyPrefix: string, body: Record<string, unknown>) {
  const { amount, date, preview } = body;

  if (amount === undefined) {
    return errorResponse('invalid_params', 'Missing required field: amount', 400);
  }

  const dateStr = date ? String(date) : new Date().toISOString().split('T')[0];

  if (preview) {
    const previewId = `preview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    previewStore.set(previewId, {
      data: { action: 'update_cash_snapshot', amount: Number(amount), date: dateStr },
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return successResponse({
      preview: true,
      preview_id: previewId,
      expires_in: '5 minutes',
      will_create: {
        type: 'cash_snapshot',
        amount: Number(amount),
        date: dateStr,
      },
    });
  }

  const snapshot = await prisma.cashSnapshot.create({
    data: {
      organizationId: orgId,
      amount: Number(amount),
      date: dateStr,
    },
  });

  await logApiAction({
    organizationId: orgId,
    apiKeyPrefix: keyPrefix,
    action: 'update_cash_snapshot',
    targetType: 'cash_snapshot',
    targetId: snapshot.id,
    targetName: dateStr,
    changes: { amount: Number(amount), date: dateStr },
  });

  return successResponse({
    created: true,
    snapshot: {
      id: snapshot.id,
      amount: snapshot.amount,
      date: snapshot.date,
    },
  });
}

async function handleConfirm(orgId: string, keyPrefix: string, body: Record<string, unknown>) {
  const { preview_id } = body;

  if (!preview_id) {
    return errorResponse('invalid_params', 'Missing preview_id', 400);
  }

  const preview = previewStore.get(String(preview_id));
  
  if (!preview) {
    return errorResponse('preview_expired', 'Preview not found or expired', 404);
  }

  if (Date.now() > preview.expiresAt) {
    previewStore.delete(String(preview_id));
    return errorResponse('preview_expired', 'Preview has expired', 410);
  }

  previewStore.delete(String(preview_id));

  const { action, ...data } = preview.data;

  switch (action) {
    case 'add_expense':
      return handleAddExpense(orgId, keyPrefix, { ...data, preview: false });
    case 'update_day_entry':
      return handleUpdateDayEntry(orgId, keyPrefix, { ...data, preview: false });
    case 'update_cash_snapshot':
      return handleUpdateCashSnapshot(orgId, keyPrefix, { ...data, preview: false });
    default:
      return errorResponse('invalid_preview', 'Unknown preview action', 400);
  }
}

async function handleCancel(orgId: string, body: Record<string, unknown>) {
  const { preview_id } = body;

  if (!preview_id) {
    return errorResponse('invalid_params', 'Missing preview_id', 400);
  }

  const deleted = previewStore.delete(String(preview_id));

  return successResponse({
    cancelled: deleted,
    message: deleted ? 'Preview cancelled' : 'Preview not found (may have already expired)',
  });
}

async function handleUndo(orgId: string, keyPrefix: string, body: Record<string, unknown>) {
  const recentActions = await prisma.apiAuditLog.findMany({
    where: {
      organizationId: orgId,
      undoExpiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const lastAction = recentActions.find(a => a.snapshot !== null);

  if (!lastAction || !lastAction.snapshot) {
    return errorResponse('no_undo', 'No recent action available to undo', 404);
  }

  const snapshot = lastAction.snapshot as object & Record<string, unknown>;

  switch (lastAction.targetType) {
    case 'expense':
      if (lastAction.action === 'add_expense' && lastAction.targetId) {
        await prisma.expenseTransaction.delete({ where: { id: lastAction.targetId } });
        await prisma.apiAuditLog.update({
          where: { id: lastAction.id },
          data: { undoExpiresAt: null },
        });
        return successResponse({ undone: true, action: 'deleted expense', targetId: lastAction.targetId });
      }
      break;
    case 'day_entry':
      if (lastAction.action === 'update_day_entry' && lastAction.targetId) {
        await prisma.dayEntry.update({
          where: { id: lastAction.targetId },
          data: {
            netSalesExTax: snapshot.netSalesExTax as number | null,
            notes: snapshot.notes as string | null,
          },
        });
        await prisma.apiAuditLog.update({
          where: { id: lastAction.id },
          data: { undoExpiresAt: null },
        });
        return successResponse({ undone: true, action: 'reverted day entry', targetId: lastAction.targetId });
      } else if (lastAction.action === 'create_day_entry' && lastAction.targetId) {
        await prisma.dayEntry.delete({ where: { id: lastAction.targetId } });
        await prisma.apiAuditLog.update({
          where: { id: lastAction.id },
          data: { undoExpiresAt: null },
        });
        return successResponse({ undone: true, action: 'deleted day entry', targetId: lastAction.targetId });
      }
      break;
  }

  return errorResponse('undo_failed', 'Could not undo this action', 400);
}
