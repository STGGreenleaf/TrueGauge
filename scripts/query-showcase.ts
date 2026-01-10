import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOWCASE_ORG_ID = 'showcase-template';

async function main() {
  console.log('='.repeat(60));
  console.log('SHOWCASE-TEMPLATE DATA DUMP');
  console.log('='.repeat(60));

  // Check if org exists
  const org = await prisma.organization.findUnique({
    where: { id: SHOWCASE_ORG_ID },
  });
  console.log('\n📁 ORGANIZATION:', org ? `Found: ${org.name}` : '❌ NOT FOUND');

  // Settings
  const settings = await prisma.settings.findUnique({
    where: { organizationId: SHOWCASE_ORG_ID },
  });
  if (settings) {
    console.log('\n⚙️  SETTINGS:');
    console.log(`   Business Name: ${settings.businessName}`);
    console.log(`   Business Start: ${settings.businessStartDate || 'NOT SET'}`);
    console.log(`   Timezone: ${settings.timezone}`);
    console.log(`   Monthly NUT: $${settings.monthlyFixedNut}`);
    console.log(`   - Rent: $${settings.nutRent}`);
    console.log(`   - Utilities: $${settings.nutUtilities}`);
    console.log(`   - Phone: $${settings.nutPhone}`);
    console.log(`   - Internet: $${settings.nutInternet}`);
    console.log(`   - Insurance: $${settings.nutInsurance}`);
    console.log(`   - Loan: $${settings.nutLoanPayment}`);
    console.log(`   - Payroll: $${settings.nutPayroll}`);
    console.log(`   - Subscriptions: $${settings.nutSubscriptions}`);
    console.log(`   - Other1: $${settings.nutOther1} (${settings.nutOther1Label})`);
    console.log(`   - Other2: $${settings.nutOther2} (${settings.nutOther2Label})`);
    console.log(`   - Other3: $${settings.nutOther3} (${settings.nutOther3Label})`);
    console.log(`   Target COGS: ${settings.targetCogsPct}%`);
    console.log(`   Target Fees: ${settings.targetFeesPct}%`);
    console.log(`   Operating Floor: $${settings.operatingFloorCash}`);
    console.log(`   Target Reserve: $${settings.targetReserveCash}`);
    console.log(`   Roof Fund: $${settings.monthlyRoofFund}`);
    console.log(`   Owner Draw Goal: $${settings.monthlyOwnerDrawGoal}`);
    console.log(`   Cash Snapshot: $${settings.cashSnapshotAmount} as of ${settings.cashSnapshotAsOf}`);
    console.log(`   Year Start Cash: $${settings.yearStartCashAmount} (${settings.yearStartCashDate})`);
    console.log(`   Open Hours: ${settings.openHoursTemplate}`);
  } else {
    console.log('\n⚙️  SETTINGS: ❌ NOT FOUND');
  }

  // Reference Months
  const refMonths = await prisma.referenceMonth.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });
  console.log(`\n📊 REFERENCE MONTHS: ${refMonths.length} records`);
  if (refMonths.length > 0) {
    const byYear: Record<number, number[]> = {};
    refMonths.forEach(r => {
      if (!byYear[r.year]) byYear[r.year] = [];
      byYear[r.year].push(r.month);
    });
    Object.keys(byYear).sort().forEach(year => {
      const months = byYear[Number(year)];
      console.log(`   ${year}: months ${months.join(', ')} (${months.length} months)`);
    });
    console.log('\n   Sample data (first 6):');
    refMonths.slice(0, 6).forEach(r => {
      console.log(`   ${r.year}-${String(r.month).padStart(2, '0')}: $${r.referenceNetSalesExTax.toLocaleString()}`);
    });
    if (refMonths.length > 6) {
      console.log(`   ... and ${refMonths.length - 6} more`);
    }
  }

  // Day Entries (sales)
  const dayEntries = await prisma.dayEntry.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: { date: 'desc' },
  });
  console.log(`\n💰 DAY ENTRIES (Sales): ${dayEntries.length} records`);
  if (dayEntries.length > 0) {
    const withSales = dayEntries.filter(d => d.netSalesExTax !== null && d.netSalesExTax > 0);
    console.log(`   With sales data: ${withSales.length}`);
    console.log(`   Date range: ${dayEntries[dayEntries.length - 1]?.date} to ${dayEntries[0]?.date}`);
    console.log('\n   Recent entries (last 10):');
    dayEntries.slice(0, 10).forEach(d => {
      console.log(`   ${d.date}: $${d.netSalesExTax?.toLocaleString() || 'null'}`);
    });
  }

  // Expenses
  const expenses = await prisma.expenseTransaction.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: { date: 'desc' },
  });
  console.log(`\n📉 EXPENSES: ${expenses.length} records`);
  if (expenses.length > 0) {
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    console.log('   By category:');
    Object.entries(byCategory).forEach(([cat, total]) => {
      console.log(`   - ${cat}: $${total.toLocaleString()}`);
    });
    console.log('\n   Recent expenses (last 10):');
    expenses.slice(0, 10).forEach(e => {
      console.log(`   ${e.date}: $${e.amount} - ${e.vendorName} (${e.category})`);
    });
  }

  // Vendors
  const vendors = await prisma.vendorTemplate.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: { name: 'asc' },
  });
  console.log(`\n🏪 VENDORS: ${vendors.length} templates`);
  vendors.forEach(v => {
    console.log(`   - ${v.name} (${v.defaultCategory}) ${v.isRecurring ? '🔄' : ''}`);
  });

  // Cash Snapshots
  const snapshots = await prisma.cashSnapshot.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: { date: 'desc' },
  });
  console.log(`\n📸 CASH SNAPSHOTS: ${snapshots.length} records`);
  snapshots.slice(0, 5).forEach(s => {
    console.log(`   ${s.date}: $${s.amount.toLocaleString()}`);
  });

  // Year Start Anchors
  const anchors = await prisma.yearStartAnchor.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: { year: 'asc' },
  });
  console.log(`\n⚓ YEAR START ANCHORS: ${anchors.length} records`);
  anchors.forEach(a => {
    console.log(`   ${a.year}: $${a.amount.toLocaleString()} (${a.date}) - ${a.note || 'no note'}`);
  });

  // Cash Injections
  const injections = await prisma.cashInjection.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: { date: 'asc' },
  });
  console.log(`\n💉 CASH INJECTIONS: ${injections.length} records`);
  injections.forEach(i => {
    const sign = i.type === 'withdrawal' || i.type === 'owner_draw' ? '-' : '+';
    console.log(`   ${i.date}: ${sign}$${i.amount.toLocaleString()} (${i.type}) - ${i.note || 'no note'}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('END OF DUMP');
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
