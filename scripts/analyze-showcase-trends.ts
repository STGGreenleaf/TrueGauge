import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOWCASE_ORG_ID = 'showcase-template';

async function main() {
  console.log('='.repeat(60));
  console.log('REFERENCE MONTH TREND ANALYSIS');
  console.log('='.repeat(60));

  const refMonths = await prisma.referenceMonth.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  // Group by year
  const byYear: Record<number, { month: number; sales: number }[]> = {};
  refMonths.forEach(r => {
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push({ month: r.month, sales: r.referenceNetSalesExTax });
  });

  // Calculate annual totals and YoY growth
  console.log('\n📊 ANNUAL TOTALS & YoY GROWTH:');
  const years = Object.keys(byYear).map(Number).sort();
  let prevTotal = 0;
  
  years.forEach(year => {
    const total = byYear[year].reduce((s, m) => s + m.sales, 0);
    const months = byYear[year].length;
    const avg = Math.round(total / months);
    const growth = prevTotal > 0 ? ((total - prevTotal) / prevTotal * 100).toFixed(1) : 'N/A';
    console.log(`   ${year}: $${total.toLocaleString()} (${months} months, avg $${avg.toLocaleString()}/mo) | YoY: ${growth}%`);
    prevTotal = total;
  });

  // Look for dips and rebounds
  console.log('\n📉 MONTHLY DETAIL (looking for dips/rebounds):');
  
  years.forEach(year => {
    console.log(`\n   ${year}:`);
    const months = byYear[year].sort((a, b) => a.month - b.month);
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    months.forEach((m, idx) => {
      // Compare to previous month
      let trend = '';
      if (idx > 0) {
        const diff = m.sales - months[idx - 1].sales;
        const pct = (diff / months[idx - 1].sales * 100).toFixed(1);
        trend = diff >= 0 ? `↑${pct}%` : `↓${Math.abs(parseFloat(pct))}%`;
      }
      
      // Compare to same month last year
      let yoyTrend = '';
      const prevYear = byYear[year - 1];
      if (prevYear) {
        const sameMonthLastYear = prevYear.find(p => p.month === m.month);
        if (sameMonthLastYear) {
          const yoyDiff = m.sales - sameMonthLastYear.sales;
          const yoyPct = (yoyDiff / sameMonthLastYear.sales * 100).toFixed(1);
          yoyTrend = `vs LY: ${yoyDiff >= 0 ? '+' : ''}${yoyPct}%`;
        }
      }
      
      console.log(`   ${monthNames[m.month]}: $${m.sales.toLocaleString().padStart(6)} ${trend.padEnd(8)} ${yoyTrend}`);
    });
  });

  // Find notable patterns
  console.log('\n🔍 NOTABLE PATTERNS:');
  
  // Find biggest month-over-month drops
  const allMonths = refMonths.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  
  const drops: { date: string; drop: number; from: number; to: number }[] = [];
  for (let i = 1; i < allMonths.length; i++) {
    const prev = allMonths[i - 1];
    const curr = allMonths[i];
    const drop = ((prev.referenceNetSalesExTax - curr.referenceNetSalesExTax) / prev.referenceNetSalesExTax) * 100;
    if (drop > 10) {
      drops.push({
        date: `${curr.year}-${String(curr.month).padStart(2, '0')}`,
        drop,
        from: prev.referenceNetSalesExTax,
        to: curr.referenceNetSalesExTax,
      });
    }
  }
  
  if (drops.length > 0) {
    console.log('   Significant dips (>10% MoM drop):');
    drops.forEach(d => {
      console.log(`   - ${d.date}: ${d.drop.toFixed(1)}% drop ($${d.from.toLocaleString()} → $${d.to.toLocaleString()})`);
    });
  } else {
    console.log('   No significant dips found (>10% MoM drop)');
  }

  // Best and worst months overall
  const sorted = [...refMonths].sort((a, b) => b.referenceNetSalesExTax - a.referenceNetSalesExTax);
  console.log('\n   Best months:');
  sorted.slice(0, 3).forEach(m => {
    console.log(`   - ${m.year}-${String(m.month).padStart(2, '0')}: $${m.referenceNetSalesExTax.toLocaleString()}`);
  });
  console.log('\n   Worst months:');
  sorted.slice(-3).reverse().forEach(m => {
    console.log(`   - ${m.year}-${String(m.month).padStart(2, '0')}: $${m.referenceNetSalesExTax.toLocaleString()}`);
  });

  console.log('\n' + '='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
