import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const yearParam = searchParams.get('year'); // YYYY

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { organizations: true },
    });

    if (!dbUser || dbUser.organizations.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const organizationId = dbUser.organizations[0].organizationId;

    // Get settings for goal calculation
    const settings = await prisma.settings.findUnique({
      where: { organizationId },
    });

    let startDate: string;
    let endDate: string;
    let filename: string;

    if (yearParam) {
      // Full year export
      const year = parseInt(yearParam);
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      filename = `truegauge-${year}-report.csv`;
    } else if (month) {
      // Single month export
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      startDate = `${month}-01`;
      endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
      filename = `truegauge-${month}-report.csv`;
    } else {
      return NextResponse.json({ error: 'Month or year required' }, { status: 400 });
    }

    // Fetch day entries
    const dayEntries = await prisma.dayEntry.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // Fetch expenses
    const expenses = await prisma.expenseTransaction.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // Group expenses by date
    const expensesByDate = new Map<string, number>();
    for (const exp of expenses) {
      const existing = expensesByDate.get(exp.date) || 0;
      expensesByDate.set(exp.date, existing + exp.amount);
    }

    // Calculate daily goal
    const survivalGoal = settings?.monthlyOwnerDrawGoal 
      ? (settings.monthlyFixedNut || 0) + settings.monthlyOwnerDrawGoal
      : settings?.monthlyFixedNut || 0;

    // Build CSV rows
    const rows: string[][] = [];
    rows.push(['Date', 'Day', 'Net Sales', 'Expenses', 'Net', 'Daily Goal', 'Goal %', 'Running MTD', 'Pace Target', 'Pace Delta']);

    let runningMTD = 0;
    let currentMonth = '';

    for (const entry of dayEntries) {
      const date = new Date(entry.date + 'T12:00:00');
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const sales = entry.netSalesExTax || 0;
      const dayExpenses = expensesByDate.get(entry.date) || 0;
      const net = sales - dayExpenses;

      // Reset running total on new month
      const entryMonth = entry.date.substring(0, 7);
      if (entryMonth !== currentMonth) {
        runningMTD = 0;
        currentMonth = entryMonth;
      }
      runningMTD += sales;

      // Calculate daily metrics
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const dailyGoal = survivalGoal / daysInMonth;
      const goalPct = dailyGoal > 0 ? Math.round((sales / dailyGoal) * 100) : 0;
      const dayOfMonth = date.getDate();
      const paceTarget = (survivalGoal / daysInMonth) * dayOfMonth;
      const paceDelta = runningMTD - paceTarget;

      rows.push([
        entry.date,
        dayName,
        sales.toFixed(2),
        dayExpenses.toFixed(2),
        net.toFixed(2),
        dailyGoal.toFixed(2),
        `${goalPct}%`,
        runningMTD.toFixed(2),
        paceTarget.toFixed(2),
        paceDelta >= 0 ? `+${paceDelta.toFixed(2)}` : paceDelta.toFixed(2),
      ]);
    }

    // Convert to CSV string
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
