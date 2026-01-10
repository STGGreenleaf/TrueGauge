import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOWCASE_ORG_ID = 'showcase-template';

async function main() {
  console.log('='.repeat(60));
  console.log('ADDING WEEKLY VARIETY + BAD YEAR (2023)');
  console.log('='.repeat(60));

  // Delete existing snapshots
  await prisma.cashSnapshot.deleteMany({
    where: { organizationId: SHOWCASE_ORG_ID },
  });

  // Create WEEKLY snapshots with intra-month variety
  // Pattern: Not smooth - jagged ups and downs within each quarter
  const weeklySnapshots = [
    // 2024 - THE BAD YEAR (business almost failed)
    { date: '2024-01-07', amount: 42000 },
    { date: '2024-01-14', amount: 38000 },  // Dropping
    { date: '2024-01-21', amount: 35000 },
    { date: '2024-01-28', amount: 31000 },  // Scary low
    { date: '2024-02-04', amount: 28000 },  // Getting dangerous
    { date: '2024-02-11', amount: 24000 },  // CRISIS MODE
    { date: '2024-02-18', amount: 22000 },  // Near floor!
    { date: '2024-02-25', amount: 18500 },  // DANGER ZONE
    { date: '2024-03-03', amount: 15000 },  // Emergency injection needed
    { date: '2024-03-10', amount: 28000 },  // Injected $15K - saved
    { date: '2024-03-17', amount: 26000 },  // Still struggling
    { date: '2024-03-24', amount: 29000 },  // Slow recovery
    { date: '2024-03-31', amount: 32000 },
    { date: '2024-04-07', amount: 35000 },
    { date: '2024-04-14', amount: 31000 },  // Setback
    { date: '2024-04-21', amount: 34000 },
    { date: '2024-04-28', amount: 38000 },
    { date: '2024-05-05', amount: 36000 },  // Fluctuation
    { date: '2024-05-12', amount: 42000 },
    { date: '2024-05-19', amount: 39000 },  // Dip
    { date: '2024-05-26', amount: 45000 },
    { date: '2024-06-02', amount: 48000 },
    { date: '2024-06-09', amount: 44000 },  // Bad week
    { date: '2024-06-16', amount: 52000 },
    { date: '2024-06-23', amount: 49000 },
    { date: '2024-06-30', amount: 55000 },
    { date: '2024-07-07', amount: 58000 },
    { date: '2024-07-14', amount: 54000 },  // Dip
    { date: '2024-07-21', amount: 62000 },
    { date: '2024-07-28', amount: 59000 },
    { date: '2024-08-04', amount: 65000 },
    { date: '2024-08-11', amount: 61000 },  // Summer slowdown week
    { date: '2024-08-18', amount: 58000 },
    { date: '2024-08-25', amount: 54000 },  // Drop
    { date: '2024-09-01', amount: 48000 },  // Sharp fall decline
    { date: '2024-09-08', amount: 44000 },
    { date: '2024-09-15', amount: 40000 },
    { date: '2024-09-22', amount: 38000 },
    { date: '2024-09-29', amount: 35000 },  // Concerning
    { date: '2024-10-06', amount: 32000 },
    { date: '2024-10-13', amount: 29000 },  // Getting tight
    { date: '2024-10-20', amount: 31000 },  // Small injection
    { date: '2024-10-27', amount: 28000 },
    { date: '2024-11-03', amount: 32000 },  // Pre-holiday pickup
    { date: '2024-11-10', amount: 35000 },
    { date: '2024-11-17', amount: 38000 },
    { date: '2024-11-24', amount: 44000 },  // Black Friday
    { date: '2024-12-01', amount: 48000 },
    { date: '2024-12-08', amount: 52000 },
    { date: '2024-12-15', amount: 58000 },
    { date: '2024-12-22', amount: 65000 },  // Holiday surge
    { date: '2024-12-29', amount: 68000 },  // Year end recovery

    // 2025 - RECOVERY YEAR (but still volatile)
    { date: '2025-01-05', amount: 62000 },  // Post-holiday drop
    { date: '2025-01-12', amount: 55000 },  // Continuing drop
    { date: '2025-01-19', amount: 48000 },
    { date: '2025-01-26', amount: 44000 },  // January low
    { date: '2025-02-02', amount: 42000 },
    { date: '2025-02-09', amount: 38000 },  // February dip
    { date: '2025-02-16', amount: 41000 },  // Bouncing
    { date: '2025-02-23', amount: 45000 },
    { date: '2025-03-02', amount: 48000 },
    { date: '2025-03-09', amount: 44000 },  // Setback
    { date: '2025-03-16', amount: 52000 },
    { date: '2025-03-23', amount: 56000 },
    { date: '2025-03-30', amount: 58000 },
    { date: '2025-04-06', amount: 54000 },  // Dip
    { date: '2025-04-13', amount: 62000 },
    { date: '2025-04-20', amount: 58000 },
    { date: '2025-04-27', amount: 68000 },
    { date: '2025-05-04', amount: 72000 },
    { date: '2025-05-11', amount: 65000 },  // Bad week
    { date: '2025-05-18', amount: 78000 },
    { date: '2025-05-25', amount: 82000 },
    { date: '2025-06-01', amount: 76000 },  // Dip
    { date: '2025-06-08', amount: 88000 },
    { date: '2025-06-15', amount: 92000 },
    { date: '2025-06-22', amount: 85000 },  // Small drop
    { date: '2025-06-29', amount: 98000 },
    { date: '2025-07-06', amount: 94000 },  // Dip
    { date: '2025-07-13', amount: 105000 },
    { date: '2025-07-20', amount: 98000 },  // Fluctuation
    { date: '2025-07-27', amount: 112000 }, // Peak building
    { date: '2025-08-03', amount: 108000 },
    { date: '2025-08-10', amount: 118000 }, // PEAK
    { date: '2025-08-17', amount: 112000 }, // Starting decline
    { date: '2025-08-24', amount: 105000 },
    { date: '2025-08-31', amount: 95000 },  // Sharp drop
    { date: '2025-09-07', amount: 88000 },
    { date: '2025-09-14', amount: 82000 },
    { date: '2025-09-21', amount: 75000 },
    { date: '2025-09-28', amount: 68000 },  // Fall decline
    { date: '2025-10-05', amount: 72000 },  // Small bounce
    { date: '2025-10-12', amount: 65000 },
    { date: '2025-10-19', amount: 58000 },
    { date: '2025-10-26', amount: 62000 },  // Bounce
    { date: '2025-11-02', amount: 55000 },  // November low
    { date: '2025-11-09', amount: 58000 },
    { date: '2025-11-16', amount: 65000 },
    { date: '2025-11-23', amount: 72000 },  // Pre-holiday
    { date: '2025-11-30', amount: 78000 },
    { date: '2025-12-07', amount: 85000 },
    { date: '2025-12-14', amount: 92000 },
    { date: '2025-12-21', amount: 105000 }, // Holiday peak
    { date: '2025-12-28', amount: 98000 },  // Post-Xmas dip

    // 2026 - Current
    { date: '2026-01-08', amount: 78500 },  // Post-holiday crash
  ];

  for (const snap of weeklySnapshots) {
    await prisma.cashSnapshot.create({
      data: { organizationId: SHOWCASE_ORG_ID, ...snap },
    });
  }

  console.log(`\n✅ Created ${weeklySnapshots.length} WEEKLY snapshots`);

  // Update settings
  await prisma.settings.update({
    where: { organizationId: SHOWCASE_ORG_ID },
    data: {
      cashSnapshotAmount: 78500,
      cashSnapshotAsOf: '2026-01-08',
      yearStartCashAmount: 42000,
      yearStartCashDate: '2024-01-07',
    },
  });

  // Update reference months for 2024 to show the "bad year"
  const badYear2024 = [
    { month: 1, sales: 18000 },  // Terrible
    { month: 2, sales: 15000 },  // Crisis
    { month: 3, sales: 22000 },  // Struggling
    { month: 4, sales: 28000 },  // Recovering
    { month: 5, sales: 35000 },  // Getting better
    { month: 6, sales: 42000 },  // Modest
    { month: 7, sales: 52000 },  // Summer help
    { month: 8, sales: 48000 },  // Okay
    { month: 9, sales: 32000 },  // Fall crash
    { month: 10, sales: 25000 }, // Bad
    { month: 11, sales: 38000 }, // Pre-holiday
    { month: 12, sales: 55000 }, // Holiday saved them
  ];

  for (const m of badYear2024) {
    await prisma.referenceMonth.updateMany({
      where: { organizationId: SHOWCASE_ORG_ID, year: 2024, month: m.month },
      data: { referenceNetSalesExTax: m.sales },
    });
  }

  console.log('✅ Updated 2024 as "the bad year" - near failure');

  // Show the dramatic story
  console.log('\n📊 BRIGHTLINE STORY:');
  console.log('');
  console.log('2024 - THE BAD YEAR:');
  console.log('  Jan: $42K → Feb: $18.5K (CRISIS!)');
  console.log('  Mar: Emergency injection saved them');
  console.log('  Sep-Oct: Another scare ($28K)');
  console.log('  Dec: Holiday surge pulled them back');
  console.log('');
  console.log('2025 - RECOVERY:');
  console.log('  Still volatile week-to-week');
  console.log('  Aug: Finally hit $118K (new high)');
  console.log('  Fall: Dropped again to $55K');
  console.log('  Dec: Holiday surge to $105K');
  console.log('');
  console.log('2026 - CURRENT:');
  console.log('  Jan 8: Post-holiday at $78.5K');
  console.log('  Pattern: Cautiously optimistic');

  console.log('\n' + '='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
