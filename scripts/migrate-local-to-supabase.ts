import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';

const supabase = new PrismaClient();
const localDb = new Database('./prisma/dev.db');

async function migrate() {
  console.log('Starting migration from local SQLite to Supabase...');
  
  const ORG_ID = 'default-org';
  
  // 1. Ensure organization exists
  console.log('Creating organization...');
  await supabase.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: { id: ORG_ID, name: 'HBBEVCO' },
  });
  
  // 2. Migrate Settings
  console.log('Migrating settings...');
  const settings = localDb.prepare('SELECT * FROM Settings').get() as any;
  if (settings) {
    await supabase.settings.upsert({
      where: { organizationId: ORG_ID },
      update: {
        businessName: settings.businessName,
        timezone: settings.timezone,
        salesInputMode: settings.salesInputMode,
        targetCogsPct: settings.targetCogsPct,
        targetFeesPct: settings.targetFeesPct,
        monthlyFixedNut: settings.monthlyFixedNut,
        monthlyRoofFund: settings.monthlyRoofFund,
        monthlyOwnerDrawGoal: settings.monthlyOwnerDrawGoal,
        openHoursTemplate: settings.openHoursTemplate,
        storeCloseHour: settings.autoCloseHour || 16,
        enableTrueHealth: settings.enableTrueHealth === 1,
        enableSpreading: settings.enableSpreading === 1,
      },
      create: {
        organizationId: ORG_ID,
        businessName: settings.businessName,
        timezone: settings.timezone,
        salesInputMode: settings.salesInputMode,
        targetCogsPct: settings.targetCogsPct,
        targetFeesPct: settings.targetFeesPct,
        monthlyFixedNut: settings.monthlyFixedNut,
        monthlyRoofFund: settings.monthlyRoofFund,
        monthlyOwnerDrawGoal: settings.monthlyOwnerDrawGoal,
        openHoursTemplate: settings.openHoursTemplate,
        storeCloseHour: settings.autoCloseHour || 16,
        enableTrueHealth: settings.enableTrueHealth === 1,
        enableSpreading: settings.enableSpreading === 1,
      },
    });
    console.log('  Settings migrated');
  }
  
  // 3. Migrate DayEntries
  console.log('Migrating day entries...');
  const dayEntries = localDb.prepare('SELECT * FROM DayEntry').all() as any[];
  for (const entry of dayEntries) {
    await supabase.dayEntry.upsert({
      where: { 
        organizationId_date: { organizationId: ORG_ID, date: entry.date }
      },
      update: { netSalesExTax: entry.netSalesExTax, notes: entry.notes },
      create: {
        organizationId: ORG_ID,
        date: entry.date,
        netSalesExTax: entry.netSalesExTax,
        notes: entry.notes,
      },
    });
  }
  console.log(`  ${dayEntries.length} day entries migrated`);
  
  // 4. Migrate ReferenceMonths
  console.log('Migrating reference months...');
  const refMonths = localDb.prepare('SELECT * FROM ReferenceMonth').all() as any[];
  for (const ref of refMonths) {
    await supabase.referenceMonth.upsert({
      where: {
        organizationId_year_month: { organizationId: ORG_ID, year: ref.year, month: ref.month }
      },
      update: { referenceNetSalesExTax: ref.referenceNetSalesExTax, note: ref.note },
      create: {
        organizationId: ORG_ID,
        year: ref.year,
        month: ref.month,
        referenceNetSalesExTax: ref.referenceNetSalesExTax,
        note: ref.note,
      },
    });
  }
  console.log(`  ${refMonths.length} reference months migrated`);
  
  // 5. Migrate Expenses
  console.log('Migrating expenses...');
  const expenses = localDb.prepare('SELECT * FROM ExpenseTransaction').all() as any[];
  for (const exp of expenses) {
    await supabase.expenseTransaction.create({
      data: {
        organizationId: ORG_ID,
        date: exp.date,
        vendorId: exp.vendorId || null,
        vendorName: exp.vendorName,
        category: exp.category,
        amount: exp.amount,
        memo: exp.memo,
        spreadMonths: exp.spreadMonths,
      },
    });
  }
  console.log(`  ${expenses.length} expenses migrated`);
  
  // 6. Migrate CashInjections
  console.log('Migrating cash injections...');
  const injections = localDb.prepare('SELECT * FROM CashInjection').all() as any[];
  for (const inj of injections) {
    await supabase.cashInjection.create({
      data: {
        organizationId: ORG_ID,
        date: inj.date,
        amount: inj.amount,
        note: inj.note,
      },
    });
  }
  console.log(`  ${injections.length} cash injections migrated`);
  
  console.log('Migration complete!');
}

migrate()
  .catch(console.error)
  .finally(() => {
    supabase.$disconnect();
    localDb.close();
  });
