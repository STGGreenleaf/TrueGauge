import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOWCASE_ORG_ID = 'showcase-template';

/**
 * Restore Brightline Supply Co. settings to proper demo values.
 * This creates a realistic coffee shop / supply company template.
 */
async function main() {
  console.log('='.repeat(60));
  console.log('RESTORING BRIGHTLINE SUPPLY CO. SETTINGS');
  console.log('='.repeat(60));

  // Check if org exists
  const org = await prisma.organization.findUnique({
    where: { id: SHOWCASE_ORG_ID },
  });

  if (!org) {
    console.error('❌ Organization not found! Run seed script first.');
    return;
  }

  console.log(`\n📁 Found organization: ${org.name}`);

  // Update organization name if needed
  if (org.name !== 'Brightline Supply Co.') {
    await prisma.organization.update({
      where: { id: SHOWCASE_ORG_ID },
      data: { name: 'Brightline Supply Co.' },
    });
    console.log('✅ Updated organization name to "Brightline Supply Co."');
  }

  // Restore settings with realistic demo values
  // Based on a mid-sized specialty retail/coffee operation
  const settings = await prisma.settings.upsert({
    where: { organizationId: SHOWCASE_ORG_ID },
    create: {
      organizationId: SHOWCASE_ORG_ID,
      businessName: 'Brightline Supply Co.',
      timezone: 'America/Denver',
      salesInputMode: 'NET_SALES_EX_TAX',
      
      // Monthly Fixed Nut: ~$19K total
      monthlyFixedNut: 19000,
      nutRent: 4500,
      nutUtilities: 850,
      nutPhone: 150,
      nutInternet: 200,
      nutInsurance: 800,
      nutLoanPayment: 2500,
      nutPayroll: 8500,
      nutSubscriptions: 500,
      nutOther1: 500,
      nutOther1Label: 'Merchant Fees',
      nutOther2: 300,
      nutOther2Label: 'Maintenance',
      nutOther3: 200,
      nutOther3Label: 'Misc',
      
      // Targets
      targetCogsPct: 0.32,
      targetFeesPct: 0.03,
      
      // Cash management
      operatingFloorCash: 15000,
      targetReserveCash: 75000,
      monthlyRoofFund: 500,
      monthlyOwnerDrawGoal: 5000,
      
      // Cash position for demo (mid-August 2025)
      cashSnapshotAmount: 52000,
      cashSnapshotAsOf: '2025-08-15',
      yearStartCashAmount: 48500,
      yearStartCashDate: '2025-01-01',
      
      // Store hours (typical retail: closed Mon, open Tue-Sun)
      openHoursTemplate: JSON.stringify({
        mon: 0,
        tue: 8,
        wed: 8,
        thu: 8,
        fri: 9,
        sat: 10,
        sun: 6,
      }),
      storeCloseHour: 18,
      
      // Features
      enableTrueHealth: true,
      enableSpreading: true,
      
      // Splash/branding
      splashDuration: 3000,
      ogTitle: 'Brightline Supply Co. - Demo Store',
      ogDescription: 'Experience TrueGauge with sample data',
      seoTitle: 'Brightline Supply Co.',
      seoDescription: 'Demo store for TrueGauge dashboard',
    },
    update: {
      businessName: 'Brightline Supply Co.',
      timezone: 'America/Denver',
      salesInputMode: 'NET_SALES_EX_TAX',
      
      monthlyFixedNut: 19000,
      nutRent: 4500,
      nutUtilities: 850,
      nutPhone: 150,
      nutInternet: 200,
      nutInsurance: 800,
      nutLoanPayment: 2500,
      nutPayroll: 8500,
      nutSubscriptions: 500,
      nutOther1: 500,
      nutOther1Label: 'Merchant Fees',
      nutOther2: 300,
      nutOther2Label: 'Maintenance',
      nutOther3: 200,
      nutOther3Label: 'Misc',
      
      targetCogsPct: 0.32,
      targetFeesPct: 0.03,
      
      operatingFloorCash: 15000,
      targetReserveCash: 75000,
      monthlyRoofFund: 500,
      monthlyOwnerDrawGoal: 5000,
      
      cashSnapshotAmount: 52000,
      cashSnapshotAsOf: '2025-08-15',
      yearStartCashAmount: 48500,
      yearStartCashDate: '2025-01-01',
      
      openHoursTemplate: JSON.stringify({
        mon: 0,
        tue: 8,
        wed: 8,
        thu: 8,
        fri: 9,
        sat: 10,
        sun: 6,
      }),
      storeCloseHour: 18,
      
      enableTrueHealth: true,
      enableSpreading: true,
      
      splashDuration: 3000,
      ogTitle: 'Brightline Supply Co. - Demo Store',
      ogDescription: 'Experience TrueGauge with sample data',
      seoTitle: 'Brightline Supply Co.',
      seoDescription: 'Demo store for TrueGauge dashboard',
    },
  });

  console.log('\n✅ Settings restored:');
  console.log(`   Business Name: ${settings.businessName}`);
  console.log(`   Timezone: ${settings.timezone}`);
  console.log(`   Monthly NUT: $${settings.monthlyFixedNut.toLocaleString()}`);
  console.log(`   - Rent: $${settings.nutRent}`);
  console.log(`   - Utilities: $${settings.nutUtilities}`);
  console.log(`   - Payroll: $${settings.nutPayroll}`);
  console.log(`   - Loan: $${settings.nutLoanPayment}`);
  console.log(`   Target COGS: ${(settings.targetCogsPct * 100).toFixed(0)}%`);
  console.log(`   Target Fees: ${(settings.targetFeesPct * 100).toFixed(0)}%`);
  console.log(`   Cash Snapshot: $${settings.cashSnapshotAmount} as of ${settings.cashSnapshotAsOf}`);
  console.log(`   Year Start Cash: $${settings.yearStartCashAmount} (${settings.yearStartCashDate})`);
  console.log(`   Operating Floor: $${settings.operatingFloorCash}`);
  console.log(`   Open Hours: ${settings.openHoursTemplate}`);

  // Add Year Start Anchor if missing
  const anchor = await prisma.yearStartAnchor.upsert({
    where: {
      organizationId_year: {
        organizationId: SHOWCASE_ORG_ID,
        year: 2025,
      },
    },
    create: {
      organizationId: SHOWCASE_ORG_ID,
      year: 2025,
      amount: 48500,
      date: '2025-01-01',
      note: 'Year start cash for demo',
    },
    update: {
      amount: 48500,
      date: '2025-01-01',
      note: 'Year start cash for demo',
    },
  });
  console.log(`\n⚓ Year Start Anchor: $${anchor.amount} (${anchor.date})`);

  console.log('\n' + '='.repeat(60));
  console.log('BRIGHTLINE SUPPLY CO. SETTINGS RESTORED');
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
