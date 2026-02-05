import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as calc from '@/lib/calc';
import { getCurrentOrgId, getOrCreateSettings } from '@/lib/org';

const SHOWCASE_ORG_ID = 'showcase-template';

interface DayEntryRecord {
  id: string;
  date: string;
  netSalesExTax: number | null;
}

interface ExpenseRecord {
  date: string;
  amount: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthStr = searchParams.get('month'); // Format: YYYY-MM
    const isShowcase = searchParams.get('showcase') === 'true';
    
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }
    
    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthNumStr);
    
    // Get current org and settings (use showcase if in demo mode)
    const orgId = isShowcase ? SHOWCASE_ORG_ID : await getCurrentOrgId();
    const settings = await getOrCreateSettings(orgId);
    
    // Get open hours template for hours-weighted calculations
    const openHoursTemplate = JSON.parse(settings.openHoursTemplate) as calc.OpenHoursTemplate;
    
    // Get last year reference for this month (for VS LY feature)
    const lyReference = await prisma.referenceMonth.findFirst({
      where: { organizationId: orgId, year: year - 1, month },
    });
    
    // Get day entries for the month
    const dayEntries: DayEntryRecord[] = await prisma.dayEntry.findMany({
      where: { organizationId: orgId, date: { startsWith: monthStr } },
    });
    
    // Get expenses for the month
    const expenses: ExpenseRecord[] = await prisma.expenseTransaction.findMany({
      where: { organizationId: orgId, date: { startsWith: monthStr } },
      select: { date: true, amount: true },
    });
    
    // Calculate survival goal
    const survivalGoal = calc.survivalGoalNetExTax(
      settings.monthlyFixedNut,
      settings.targetCogsPct,
      settings.targetFeesPct
    );
    
    // Build day data array
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
      const entry = dayEntries.find((e: DayEntryRecord) => e.date === dateStr);
      const dayExpenses = expenses.filter((e: ExpenseRecord) => e.date === dateStr);
      
      days.push({
        date: dateStr,
        netSalesExTax: entry?.netSalesExTax ?? null,
        expenseTotal: dayExpenses.reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0),
        expenseCount: dayExpenses.length,
      });
    }
    
    // Calculate MTD totals
    const mtdNetSales = dayEntries.reduce(
      (sum: number, entry: DayEntryRecord) => sum + (entry.netSalesExTax || 0),
      0
    );
    
    const mtdExpenses = expenses.reduce(
      (sum: number, e: ExpenseRecord) => sum + e.amount,
      0
    );
    
    const survivalPercent = calc.survivalPercent(mtdNetSales, survivalGoal);
    
    // Hours-weighted pace target (same as dashboard uses)
    const today = new Date();
    const asOfDay = today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.getDate()
      : daysInMonth;
    const asOfDate = `${monthStr}-${String(asOfDay).padStart(2, '0')}`;
    const paceTarget = calc.mtdTargetToDateHoursWeighted(asOfDate, survivalGoal, openHoursTemplate);
    
    return NextResponse.json({
      days,
      mtdNetSales,
      mtdExpenses,
      survivalGoal,
      survivalPercent,
      paceTarget,
      openHoursTemplate,
      lyReference: lyReference ? {
        year: lyReference.year,
        month: lyReference.month,
        netSales: lyReference.referenceNetSalesExTax,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
