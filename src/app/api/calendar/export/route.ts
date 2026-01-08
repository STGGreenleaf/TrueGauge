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

    const settings = await prisma.settings.findUnique({
      where: { organizationId },
    });

    let startDate: string;
    let endDate: string;
    let reportMonth: number;
    let reportYear: number;

    if (yearParam) {
      reportYear = parseInt(yearParam);
      reportMonth = 1;
      startDate = `${reportYear}-01-01`;
      endDate = `${reportYear}-12-31`;
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      reportYear = y;
      reportMonth = m;
      const lastDay = new Date(y, m, 0).getDate();
      startDate = `${month}-01`;
      endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
    } else {
      return NextResponse.json({ error: 'Month or year required' }, { status: 400 });
    }

    // Fetch current year day entries
    const dayEntries = await prisma.dayEntry.findMany({
      where: { organizationId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    // Fetch last year day entries
    const lyStartDate = `${reportYear - 1}-${String(reportMonth).padStart(2, '0')}-01`;
    const lyLastDay = new Date(reportYear - 1, reportMonth, 0).getDate();
    const lyEndDate = `${reportYear - 1}-${String(reportMonth).padStart(2, '0')}-${String(lyLastDay).padStart(2, '0')}`;
    
    const lyDayEntries = await prisma.dayEntry.findMany({
      where: { organizationId, date: { gte: lyStartDate, lte: lyEndDate } },
      orderBy: { date: 'asc' },
    });

    const lyByDayOfMonth = new Map<number, number>();
    for (const entry of lyDayEntries) {
      const dom = parseInt(entry.date.split('-')[2]);
      lyByDayOfMonth.set(dom, entry.netSalesExTax || 0);
    }

    // Fetch expenses
    const expenses = await prisma.expenseTransaction.findMany({
      where: { organizationId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    const expensesByDate = new Map<string, number>();
    for (const exp of expenses) {
      const existing = expensesByDate.get(exp.date) || 0;
      expensesByDate.set(exp.date, existing + exp.amount);
    }

    const survivalGoal = settings?.monthlyOwnerDrawGoal 
      ? (settings.monthlyFixedNut || 0) + settings.monthlyOwnerDrawGoal
      : settings?.monthlyFixedNut || 0;

    const daysInMonth = new Date(reportYear, reportMonth, 0).getDate();
    const dailyGoal = survivalGoal / daysInMonth;

    interface DayRow {
      date: string; dayName: string; sales: number; lySales: number | null;
      isLyEstimate: boolean; vsLy: number; vsLyPct: number; expenses: number;
      net: number; goalPct: number; mtd: number; paceTarget: number;
      paceDelta: number; pacePct: number;
    }

    const dailyRows: DayRow[] = [];
    let runningMTD = 0, totalSales = 0, totalExpenses = 0, totalLySales = 0;
    let bestDay: { date: string; amount: number } | null = null;
    let worstDay: { date: string; amount: number } | null = null;
    const weekdayTotals: Record<string, { total: number; count: number }> = {
      Sun: { total: 0, count: 0 }, Mon: { total: 0, count: 0 }, Tue: { total: 0, count: 0 },
      Wed: { total: 0, count: 0 }, Thu: { total: 0, count: 0 }, Fri: { total: 0, count: 0 },
      Sat: { total: 0, count: 0 },
    };

    for (const entry of dayEntries) {
      const date = new Date(entry.date + 'T12:00:00');
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayOfMonth = date.getDate();
      const sales = entry.netSalesExTax || 0;
      const dayExpenses = expensesByDate.get(entry.date) || 0;
      const net = sales - dayExpenses;

      let lySales = lyByDayOfMonth.get(dayOfMonth) ?? null;
      const isLyEstimate = lySales === null;
      if (lySales === null) lySales = 0;
      const vsLy = sales - lySales;
      const vsLyPct = lySales > 0 ? ((sales - lySales) / lySales) * 100 : 0;

      runningMTD += sales;
      totalSales += sales;
      totalExpenses += dayExpenses;
      totalLySales += lySales;

      const goalPct = dailyGoal > 0 ? (sales / dailyGoal) * 100 : 0;
      const paceTarget = dailyGoal * dayOfMonth;
      const paceDelta = runningMTD - paceTarget;
      const pacePct = paceTarget > 0 ? ((runningMTD - paceTarget) / paceTarget) * 100 : 0;

      if (sales > 0) {
        if (!bestDay || sales > bestDay.amount) bestDay = { date: entry.date, amount: sales };
        if (!worstDay || sales < worstDay.amount) worstDay = { date: entry.date, amount: sales };
      }

      if (weekdayTotals[dayName]) {
        weekdayTotals[dayName].total += sales;
        weekdayTotals[dayName].count += 1;
      }

      dailyRows.push({ date: entry.date, dayName, sales, lySales, isLyEstimate, vsLy, vsLyPct,
        expenses: dayExpenses, net, goalPct, mtd: runningMTD, paceTarget, paceDelta, pacePct });
    }

    const businessDays = dailyRows.filter(d => d.sales > 0).length;
    const avgDailySales = businessDays > 0 ? totalSales / businessDays : 0;
    const goalAchievement = survivalGoal > 0 ? (totalSales / survivalGoal) * 100 : 0;
    const vsLyTotal = totalSales - totalLySales;
    const vsLyTotalPct = totalLySales > 0 ? ((totalSales - totalLySales) / totalLySales) * 100 : 0;
    const finalPaceDelta = dailyRows.length > 0 ? dailyRows[dailyRows.length - 1].paceDelta : 0;

    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
    const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}$${fmt(Math.abs(n))}`;
    const monthName = new Date(reportYear, reportMonth - 1, 1).toLocaleString('en-US', { month: 'long' });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>TrueGauge Report - ${reportMonth} | ${reportYear}</title>
  <style>
    @page { size: letter landscape; margin: 0.4in; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 9px; color: #1a1a1a; background: white; padding: 16px; }
    .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; border-bottom: 2px solid #0891b2; padding-bottom: 6px; }
    .logo { font-size: 18px; letter-spacing: 2px; }
    .logo-true { font-weight: 700; color: #0891b2; }
    .logo-gauge { font-weight: 300; color: #374151; }
    .date-title { font-size: 15px; color: #374151; }
    .date-month { font-weight: 300; }
    .date-year { font-weight: 600; }
    .section { margin-bottom: 10px; }
    .section-title { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
    th { background: #f3f4f6; padding: 3px 4px; text-align: right; font-weight: 600; border-bottom: 1px solid #d1d5db; }
    th:first-child, th:nth-child(2) { text-align: left; }
    td { padding: 2px 4px; text-align: right; border-bottom: 1px solid #e5e7eb; }
    td:first-child, td:nth-child(2) { text-align: left; }
    tr:nth-child(even) { background: #fafafa; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .estimate { font-style: italic; color: #9ca3af; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
    .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; }
    .summary-box.highlight { background: #ecfeff; border-color: #0891b2; }
    .summary-label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 1px; }
    .summary-value { font-size: 12px; font-weight: 600; color: #1a1a1a; }
    .summary-value.positive { color: #059669; }
    .summary-value.negative { color: #dc2626; }
    .summary-sub { font-size: 7px; color: #6b7280; margin-top: 1px; }
    .stats-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 10px; }
    .stat-box { text-align: center; padding: 6px; background: #f9fafb; border-radius: 3px; }
    .stat-day { font-size: 7px; font-weight: 600; color: #6b7280; }
    .stat-avg { font-size: 10px; font-weight: 600; color: #1a1a1a; }
    .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { font-size: 9px; color: #9ca3af; letter-spacing: 1px; }
    .footer-brand a { color: #0891b2; text-decoration: none; font-weight: 500; }
    .footer-generated { font-size: 7px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><span class="logo-true">TRUE</span><span class="logo-gauge">GAUGE</span></div>
    <div class="date-title"><span class="date-month">${reportMonth}</span> | <span class="date-year">${reportYear}</span></div>
  </div>

  <div class="summary-grid">
    <div class="summary-box highlight">
      <div class="summary-label">Total Net Sales</div>
      <div class="summary-value">$${fmt(totalSales)}</div>
      <div class="summary-sub">${businessDays} business days</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Total Expenses</div>
      <div class="summary-value">$${fmt(totalExpenses)}</div>
      <div class="summary-sub">Net: $${fmt(totalSales - totalExpenses)}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Survival Goal</div>
      <div class="summary-value">$${fmt(survivalGoal)}</div>
      <div class="summary-sub ${goalAchievement >= 100 ? 'positive' : 'negative'}">${goalAchievement.toFixed(1)}% achieved</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">vs Last Year</div>
      <div class="summary-value ${vsLyTotal >= 0 ? 'positive' : 'negative'}">${fmtDelta(vsLyTotal)}</div>
      <div class="summary-sub">${fmtPct(vsLyTotalPct)}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-box">
      <div class="summary-label">Avg Daily Sales</div>
      <div class="summary-value">$${fmt(avgDailySales)}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Best Day</div>
      <div class="summary-value positive">${bestDay ? `$${fmt(bestDay.amount)}` : '—'}</div>
      <div class="summary-sub">${bestDay ? bestDay.date : ''}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Lowest Day</div>
      <div class="summary-value">${worstDay ? `$${fmt(worstDay.amount)}` : '—'}</div>
      <div class="summary-sub">${worstDay ? worstDay.date : ''}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Final Pace</div>
      <div class="summary-value ${finalPaceDelta >= 0 ? 'positive' : 'negative'}">${fmtDelta(finalPaceDelta)}</div>
      <div class="summary-sub">${finalPaceDelta >= 0 ? 'Ahead of pace' : 'Behind pace'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Average by Day of Week</div>
    <div class="stats-row">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
        const data = weekdayTotals[day];
        const avg = data.count > 0 ? data.total / data.count : 0;
        return `<div class="stat-box"><div class="stat-day">${day}</div><div class="stat-avg">$${fmt(avg)}</div></div>`;
      }).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Daily Detail — ${monthName} ${reportYear}</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>TY Sales</th>
          <th>LY Sales</th>
          <th>vs LY</th>
          <th>vs LY %</th>
          <th>Goal %</th>
          <th>Expenses</th>
          <th>Net</th>
          <th>MTD</th>
          <th>Pace Target</th>
          <th>Pace Δ</th>
        </tr>
      </thead>
      <tbody>
        ${dailyRows.map(row => `
          <tr>
            <td>${row.date}</td>
            <td>${row.dayName}</td>
            <td>$${fmt(row.sales)}</td>
            <td class="${row.isLyEstimate ? 'estimate' : ''}">$${fmt(row.lySales || 0)}${row.isLyEstimate ? '*' : ''}</td>
            <td class="${row.vsLy >= 0 ? 'positive' : 'negative'}">${fmtDelta(row.vsLy)}</td>
            <td class="${row.vsLyPct >= 0 ? 'positive' : 'negative'}">${fmtPct(row.vsLyPct)}</td>
            <td class="${row.goalPct >= 100 ? 'positive' : row.goalPct >= 75 ? '' : 'negative'}">${row.goalPct.toFixed(0)}%</td>
            <td>$${fmt(row.expenses)}</td>
            <td>$${fmt(row.net)}</td>
            <td>$${fmt(row.mtd)}</td>
            <td>$${fmt(row.paceTarget)}</td>
            <td class="${row.paceDelta >= 0 ? 'positive' : 'negative'}">${fmtDelta(row.paceDelta)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="font-size: 6px; color: #9ca3af; margin-top: 3px;">* Estimated (no LY data available)</div>
  </div>

  <div class="footer">
    <div class="footer-brand"><a href="https://truegauge.app">TRUEGAUGE.app</a></div>
    <div class="footer-generated">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="truegauge-${reportMonth}-${reportYear}-report.html"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
