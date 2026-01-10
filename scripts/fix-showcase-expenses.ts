import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOWCASE_ORG_ID = 'showcase-template';

// Map old categories to proper TrueGauge categories
const CATEGORY_MAP: Record<string, string> = {
  'supplies': 'COGS',
  'shipping': 'COGS',
  'marketing': 'OPEX',
  'utilities': 'OPEX',
  'services': 'OPEX',
  'insurance': 'OPEX',
  'fees': 'OPEX',
  'maintenance': 'OPEX',
};

// Map vendors to their proper categories
const VENDOR_CATEGORY_MAP: Record<string, string> = {
  'Allied Shipping & Freight': 'COGS',
  'Summit Office Solutions': 'COGS',
  'Apex Insurance Group': 'OPEX',
  'Clearwater Utilities': 'OPEX',
  'Horizon Marketing Co': 'OPEX',
  'Keystone Financial': 'OPEX',
  'Metro Business Services': 'OPEX',
  'Premier Maintenance LLC': 'OPEX',
};

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING SHOWCASE EXPENSES & VENDORS');
  console.log('='.repeat(60));

  // 1. Fix existing expense categories
  console.log('\n📝 Fixing existing expense categories...');
  const expenses = await prisma.expenseTransaction.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
  });

  let fixedCount = 0;
  for (const exp of expenses) {
    const newCategory = CATEGORY_MAP[exp.category];
    if (newCategory && newCategory !== exp.category) {
      await prisma.expenseTransaction.update({
        where: { id: exp.id },
        data: { category: newCategory },
      });
      fixedCount++;
    }
  }
  console.log(`   Fixed ${fixedCount} expense categories`);

  // 2. Fix vendor template categories
  console.log('\n🏪 Fixing vendor template categories...');
  const vendors = await prisma.vendorTemplate.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
  });

  let vendorFixedCount = 0;
  for (const vendor of vendors) {
    const newCategory = VENDOR_CATEGORY_MAP[vendor.name];
    if (newCategory && newCategory !== vendor.defaultCategory) {
      await prisma.vendorTemplate.update({
        where: { id: vendor.id },
        data: { defaultCategory: newCategory },
      });
      vendorFixedCount++;
    }
  }
  console.log(`   Fixed ${vendorFixedCount} vendor categories`);

  // 3. Add Jan 2026 expenses (COGS and OPEX) so dashboard shows real values
  console.log('\n💰 Adding Jan 2026 expenses...');
  
  const jan2026Expenses = [
    // COGS - ~32% of sales ($10,320 MTD sales → ~$3,300 COGS)
    { date: '2026-01-02', vendorName: 'Allied Shipping & Freight', category: 'COGS', amount: 890, memo: 'Weekly inventory shipment' },
    { date: '2026-01-03', vendorName: 'Summit Office Solutions', category: 'COGS', amount: 720, memo: 'Product supplies restock' },
    { date: '2026-01-06', vendorName: 'Allied Shipping & Freight', category: 'COGS', amount: 950, memo: 'Mid-week delivery' },
    { date: '2026-01-07', vendorName: 'Summit Office Solutions', category: 'COGS', amount: 680, memo: 'Rush order supplies' },
    // OPEX - Fixed costs
    { date: '2026-01-02', vendorName: 'Clearwater Utilities', category: 'OPEX', amount: 385, memo: 'January utilities' },
    { date: '2026-01-03', vendorName: 'Metro Business Services', category: 'OPEX', amount: 525, memo: 'Monthly service fee' },
    { date: '2026-01-05', vendorName: 'Keystone Financial', category: 'OPEX', amount: 175, memo: 'Processing fees' },
    { date: '2026-01-06', vendorName: 'Horizon Marketing Co', category: 'OPEX', amount: 450, memo: 'January ad spend' },
  ];

  // Check for existing Jan 2026 expenses to avoid duplicates
  const existingJan2026 = await prisma.expenseTransaction.findMany({
    where: {
      organizationId: SHOWCASE_ORG_ID,
      date: { startsWith: '2026-01' },
    },
  });

  if (existingJan2026.length === 0) {
    for (const exp of jan2026Expenses) {
      await prisma.expenseTransaction.create({
        data: {
          organizationId: SHOWCASE_ORG_ID,
          ...exp,
        },
      });
    }
    console.log(`   Added ${jan2026Expenses.length} January 2026 expenses`);
  } else {
    console.log(`   ⚠️ Jan 2026 expenses already exist (${existingJan2026.length} records) - skipping`);
  }

  // 4. Verify the fix
  console.log('\n✅ VERIFICATION:');
  const updatedExpenses = await prisma.expenseTransaction.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
  });
  
  const byCategory: Record<string, number> = {};
  updatedExpenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  
  console.log('   Expense totals by category:');
  Object.entries(byCategory).forEach(([cat, total]) => {
    console.log(`   - ${cat}: $${total.toLocaleString()}`);
  });

  // Show Jan 2026 specifically
  const jan2026All = await prisma.expenseTransaction.findMany({
    where: {
      organizationId: SHOWCASE_ORG_ID,
      date: { startsWith: '2026-01' },
    },
    orderBy: { date: 'asc' },
  });
  
  console.log(`\n   January 2026 expenses (${jan2026All.length} records):`);
  const janCogs = jan2026All.filter(e => e.category === 'COGS').reduce((s, e) => s + e.amount, 0);
  const janOpex = jan2026All.filter(e => e.category === 'OPEX').reduce((s, e) => s + e.amount, 0);
  console.log(`   - COGS: $${janCogs.toLocaleString()}`);
  console.log(`   - OPEX: $${janOpex.toLocaleString()}`);

  console.log('\n' + '='.repeat(60));
  console.log('DONE - Refresh dashboard in Demo Mode to see changes');
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
