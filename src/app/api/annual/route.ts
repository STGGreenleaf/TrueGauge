import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as calc from '@/lib/calc';
import { getCurrentOrgId, getOrCreateSettings } from '@/lib/org';

interface DayEntryRecord {
  date: string;
  netSalesExTax: number | null;
}

interface ExpenseRecord {
  date: string;
  category: string;
  amount: number;
}

interface MonthSummary {
  month: number;
  monthName: string;
  netSales: number;
  cogs: number;
  opex: number;
  capex: number;
  ownerDraw: number;
  survivalGoal: number;
  survivalPercent: number;
  cashResult: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const yearStr = searchParams.get('year');
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
    
    // Get current org and settings
    const orgId = await getCurrentOrgId();
    const settings = await getOrCreateSettings(orgId);
    
    // Calculate survival goal
    const survivalGoal = calc.survivalGoalNetExTax(
      settings.monthlyFixedNut,
      settings.targetCogsPct,
      settings.targetFeesPct
    );
    
    // Get all entries for the year
    const dayEntries: DayEntryRecord[] = await prisma.dayEntry.findMany({
      where: { organizationId: orgId, date: { startsWith: `${year}-` } },
    });
    
    // Get all expenses for the year
    const expenses: ExpenseRecord[] = await prisma.expenseTransaction.findMany({
      where: { organizationId: orgId, date: { startsWith: `${year}-` } },
    });
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Build monthly summaries
    const months: MonthSummary[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      const monthEntries = dayEntries.filter((e: DayEntryRecord) => e.date.startsWith(monthStr));
      const monthExpenses = expenses.filter((e: ExpenseRecord) => e.date.startsWith(monthStr));
      
      const netSales = monthEntries.reduce(
        (sum: number, e: DayEntryRecord) => sum + (e.netSalesExTax || 0),
        0
      );
      
      const cogs = monthExpenses
        .filter((e: ExpenseRecord) => e.category === 'COGS')
        .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
      
      const opex = monthExpenses
        .filter((e: ExpenseRecord) => e.category === 'OPEX')
        .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
      
      const capex = monthExpenses
        .filter((e: ExpenseRecord) => e.category === 'CAPEX')
        .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
      
      const ownerDraw = monthExpenses
        .filter((e: ExpenseRecord) => e.category === 'OWNER_DRAW')
        .reduce((sum: number, e: ExpenseRecord) => sum + e.amount, 0);
      
      const survivalPercent = calc.survivalPercent(netSales, survivalGoal);
      
      const monthData: calc.MonthData = {
        mtdNetSales: netSales,
        mtdCogsCash: cogs,
        mtdOpexCash: opex,
        mtdOwnerDraw: ownerDraw,
        mtdCapexCash: capex,
      };
      
      const cashResult = calc.cashHealthResult(monthData, settings.monthlyRoofFund);
      
      months.push({
        month,
        monthName: monthNames[month - 1],
        netSales,
        cogs,
        opex,
        capex,
        ownerDraw,
        survivalGoal,
        survivalPercent,
        cashResult,
      });
    }
    
    // Calculate YTD totals
    const ytdNetSales = months.reduce((sum, m) => sum + m.netSales, 0);
    const ytdCogs = months.reduce((sum, m) => sum + m.cogs, 0);
    const ytdOpex = months.reduce((sum, m) => sum + m.opex, 0);
    const ytdCapex = months.reduce((sum, m) => sum + m.capex, 0);
    const ytdOwnerDraw = months.reduce((sum, m) => sum + m.ownerDraw, 0);
    const ytdSurvivalGoal = survivalGoal * 12;
    const ytdSurvivalPercent = calc.survivalPercent(ytdNetSales, ytdSurvivalGoal);
    
    return NextResponse.json({
      year,
      months,
      ytd: {
        netSales: ytdNetSales,
        cogs: ytdCogs,
        opex: ytdOpex,
        capex: ytdCapex,
        ownerDraw: ytdOwnerDraw,
        survivalGoal: ytdSurvivalGoal,
        survivalPercent: ytdSurvivalPercent,
        cashResult: ytdNetSales - ytdCogs - ytdOpex - ytdCapex - ytdOwnerDraw,
      },
      settings: {
        monthlyFixedNut: settings.monthlyFixedNut,
        targetCogsPct: settings.targetCogsPct,
        targetFeesPct: settings.targetFeesPct,
      },
    });
  } catch (error) {
    console.error('Error fetching annual data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annual data' },
      { status: 500 }
    );
  }
}
