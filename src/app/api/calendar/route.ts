import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as calc from '@/lib/calc';
import { DEFAULT_SETTINGS } from '@/lib/types';

interface DayEntryRecord {
  id: number;
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
    
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }
    
    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthNumStr);
    
    // Get settings
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
    
    // Get day entries for the month
    const dayEntries: DayEntryRecord[] = await prisma.dayEntry.findMany({
      where: { date: { startsWith: monthStr } },
    });
    
    // Get expenses for the month
    const expenses: ExpenseRecord[] = await prisma.expenseTransaction.findMany({
      where: { date: { startsWith: monthStr } },
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
    
    return NextResponse.json({
      days,
      mtdNetSales,
      mtdExpenses,
      survivalGoal,
      survivalPercent,
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
