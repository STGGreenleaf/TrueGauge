import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOWCASE_ORG_ID = 'showcase-template';

async function main() {
  console.log('='.repeat(60));
  console.log('CREATING ORGANIC CURVES FOR BRIGHTLINE');
  console.log('='.repeat(60));

  // 1. Delete existing snapshots and recreate with organic variation
  console.log('\n📸 Recreating cash snapshots with organic seasonal curves...');
  
  await prisma.cashSnapshot.deleteMany({
    where: { organizationId: SHOWCASE_ORG_ID },
  });

  // Create organic curve for 2025 (the visible YTD period)
  // Pattern: Post-holiday dip → Spring growth → Summer peak → Fall dip → Holiday surge → Jan dip
  const organicSnapshots2025 = [
    // January 2025 - Post-holiday dip, recovering
    { date: '2025-01-01', amount: 52000 },  // Year start - lower
    { date: '2025-01-15', amount: 48500 },  // Post-holiday low point
    { date: '2025-01-31', amount: 51200 },  // Starting to recover
    
    // February - Slow recovery
    { date: '2025-02-15', amount: 53800 },
    { date: '2025-02-28', amount: 56100 },
    
    // March - Spring pickup
    { date: '2025-03-15', amount: 59400 },
    { date: '2025-03-31', amount: 63200 },
    
    // April - Growing
    { date: '2025-04-15', amount: 66800 },
    { date: '2025-04-30', amount: 69500 },
    
    // May - Strong month
    { date: '2025-05-15', amount: 73200 },
    { date: '2025-05-31', amount: 77800 },
    
    // June - Summer peak begins
    { date: '2025-06-15', amount: 82500 },
    { date: '2025-06-30', amount: 86200 },
    
    // July - Peak season
    { date: '2025-07-15', amount: 91000 },
    { date: '2025-07-31', amount: 94500 },  // PEAK
    
    // August - Still strong but starting to slow
    { date: '2025-08-15', amount: 93200 },
    { date: '2025-08-31', amount: 90800 },
    
    // September - Fall slowdown begins
    { date: '2025-09-15', amount: 87500 },
    { date: '2025-09-30', amount: 84200 },
    
    // October - Continued dip
    { date: '2025-10-15', amount: 81500 },
    { date: '2025-10-31', amount: 79800 },
    
    // November - Pre-holiday building
    { date: '2025-11-15', amount: 82400 },
    { date: '2025-11-30', amount: 86900 },
    
    // December - Holiday surge
    { date: '2025-12-15', amount: 92500 },
    { date: '2025-12-28', amount: 98200 },  // Holiday peak
    
    // January 2026 - Post-holiday dip (current)
    { date: '2026-01-08', amount: 78500 },  // Current - post-holiday drop
  ];

  for (const snap of organicSnapshots2025) {
    await prisma.cashSnapshot.create({
      data: {
        organizationId: SHOWCASE_ORG_ID,
        ...snap,
      },
    });
  }
  console.log(`   Created ${organicSnapshots2025.length} snapshots with organic curve`);

  // 2. Update settings to reflect current cash position
  console.log('\n⚙️  Updating settings for current position...');
  await prisma.settings.update({
    where: { organizationId: SHOWCASE_ORG_ID },
    data: {
      cashSnapshotAmount: 78500,
      cashSnapshotAsOf: '2026-01-08',
      yearStartCashAmount: 52000,  // Match the organic Jan 1, 2025 start
      yearStartCashDate: '2025-01-01',
    },
  });
  console.log('   Updated snapshot to $78,500 as of 2026-01-08');
  console.log('   Set year start cash to $52,000 (2025-01-01)');

  // 3. Update year start anchors to match the organic curve
  console.log('\n⚓ Updating year start anchors...');
  
  // Update 2025 anchor to show the Jan 1 low point
  await prisma.yearStartAnchor.updateMany({
    where: { organizationId: SHOWCASE_ORG_ID, year: 2025 },
    data: { 
      amount: 52000, 
      date: '2025-01-01',
      note: 'Post-holiday low - recovery year ahead'
    },
  });

  // Update 2026 anchor
  await prisma.yearStartAnchor.updateMany({
    where: { organizationId: SHOWCASE_ORG_ID, year: 2026 },
    data: { 
      amount: 78500, 
      date: '2026-01-08',
      note: 'Post-holiday dip from $98K peak'
    },
  });

  console.log('   2025: $52,000 (post-holiday low)');
  console.log('   2026: $78,500 (post-holiday dip from $98K peak)');

  // 4. Verify the curve
  console.log('\n✅ ORGANIC CURVE SUMMARY:');
  const snapshots = await prisma.cashSnapshot.findMany({
    where: { organizationId: SHOWCASE_ORG_ID },
    orderBy: { date: 'asc' },
  });
  
  console.log('   Date Range | Cash Balance');
  console.log('   ' + '-'.repeat(40));
  snapshots.forEach(s => {
    const bar = '█'.repeat(Math.round(s.amount / 5000));
    console.log(`   ${s.date}: $${s.amount.toLocaleString().padStart(6)} ${bar}`);
  });

  console.log('\n   Pattern: Low($48K) → Peak($98K) → Current($78K)');
  console.log('   Range: $49,700 variation throughout the year');

  console.log('\n' + '='.repeat(60));
  console.log('DONE - Refresh dashboard in Demo Mode to see curves');
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
