import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOWCASE_ORG_ID = 'showcase-template';

// With NUT = $19K/month:
// - $25K sales = LOSS (~$2.6K/month cash drain)
// - $29K sales = BREAK EVEN
// - $45K sales = MODEST PROFIT (~$10K/month)
// - $70K sales = STRONG (~$26K/month)
// - $95K sales = PEAK (~$43K/month)

async function main() {
  console.log('='.repeat(60));
  console.log('CREATING ORGANIC REFERENCE MONTHS WITH DRAMATIC SWINGS');
  console.log('='.repeat(60));

  // Delete existing 2025 reference months (the visible year)
  await prisma.referenceMonth.deleteMany({
    where: { 
      organizationId: SHOWCASE_ORG_ID,
      year: 2025,
    },
  });

  // Create 2025 reference months with dramatic seasonal variation
  // Pattern creates organic balance curves:
  // - Jan/Feb: POST-HOLIDAY DIP (barely surviving, cash drains)
  // - Mar/Apr: SPRING RECOVERY (modest profit, slow build)
  // - May/Jun: SUMMER RAMP (strong, cash builds)
  // - Jul/Aug: PEAK SEASON (highest, cash peaks)
  // - Sep/Oct: FALL SLOWDOWN (break-even, cash drains)
  // - Nov: PRE-HOLIDAY (modest recovery)
  // - Dec: HOLIDAY SURGE (strong profit, cash spikes)

  const organicMonths2025 = [
    { month: 1, sales: 26000, note: 'Post-holiday slump - barely surviving' },
    { month: 2, sales: 28000, note: 'Still slow - near break-even' },
    { month: 3, sales: 38000, note: 'Spring pickup - modest profit' },
    { month: 4, sales: 48000, note: 'Growing momentum' },
    { month: 5, sales: 62000, note: 'Strong month - summer begins' },
    { month: 6, sales: 78000, note: 'Excellent - cash building fast' },
    { month: 7, sales: 92000, note: 'Peak season - maximum cash' },
    { month: 8, sales: 85000, note: 'Still strong but cooling' },
    { month: 9, sales: 42000, note: 'Fall slowdown begins - profit drops' },
    { month: 10, sales: 32000, note: 'Slow October - barely surviving' },
    { month: 11, sales: 45000, note: 'Pre-holiday pickup' },
    { month: 12, sales: 88000, note: 'Holiday surge - strong finish' },
  ];

  for (const m of organicMonths2025) {
    await prisma.referenceMonth.create({
      data: {
        organizationId: SHOWCASE_ORG_ID,
        year: 2025,
        month: m.month,
        referenceNetSalesExTax: m.sales,
        note: m.note,
      },
    });
  }
  console.log(`\n✅ Created 12 reference months for 2025 with dramatic variation`);

  // Also update 2024 to show prior year comparison
  await prisma.referenceMonth.deleteMany({
    where: { 
      organizationId: SHOWCASE_ORG_ID,
      year: 2024,
    },
  });

  const organicMonths2024 = [
    { month: 1, sales: 24000 },
    { month: 2, sales: 26000 },
    { month: 3, sales: 35000 },
    { month: 4, sales: 44000 },
    { month: 5, sales: 58000 },
    { month: 6, sales: 72000 },
    { month: 7, sales: 86000 },
    { month: 8, sales: 80000 },
    { month: 9, sales: 40000 },
    { month: 10, sales: 30000 },
    { month: 11, sales: 42000 },
    { month: 12, sales: 82000 },
  ];

  for (const m of organicMonths2024) {
    await prisma.referenceMonth.create({
      data: {
        organizationId: SHOWCASE_ORG_ID,
        year: 2024,
        month: m.month,
        referenceNetSalesExTax: m.sales,
      },
    });
  }
  console.log(`✅ Created 12 reference months for 2024 (prior year comparison)`);

  // Visualize the expected cash flow pattern
  console.log('\n📊 EXPECTED MONTHLY CASH FLOW (2025):');
  console.log('   Month | Sales    | Net Flow | Pattern');
  console.log('   ' + '-'.repeat(50));
  
  const NUT = 19000;
  const COGS_RATE = 0.32;
  const FEES_RATE = 0.03;
  
  let runningCash = 48500; // Starting point
  
  for (const m of organicMonths2025) {
    const netMargin = m.sales * (1 - COGS_RATE - FEES_RATE) - NUT;
    runningCash += netMargin;
    const arrow = netMargin >= 0 ? '↑' : '↓';
    const monthName = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m.month];
    console.log(`   ${monthName.padEnd(5)} | $${m.sales.toLocaleString().padStart(6)} | ${arrow}$${Math.abs(Math.round(netMargin)).toLocaleString().padStart(5)} | Cash: $${Math.round(runningCash).toLocaleString()}`);
  }

  console.log('\n🎯 CURVE PATTERN:');
  console.log('   Jan-Feb: DRAIN (cash drops from $48K)');
  console.log('   Mar-Apr: RECOVERY (slow build)');
  console.log('   May-Aug: SURGE (cash peaks ~$140K+)');
  console.log('   Sep-Oct: DRAIN (cash drops sharply)');
  console.log('   Nov-Dec: RECOVERY (holiday boost)');

  console.log('\n' + '='.repeat(60));
  console.log('DONE - Refresh dashboard to see organic curves');
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
