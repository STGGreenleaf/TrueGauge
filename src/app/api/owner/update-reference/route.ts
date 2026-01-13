import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const OWNER_USER_ID = process.env.OWNER_USER_ID;

// One-time endpoint to update reference year data for owner
// DELETE THIS FILE after use

export async function POST() {
  try {
    const user = await getSession();
    if (!user || !OWNER_USER_ID || user.id !== OWNER_USER_ID) {
      return NextResponse.json({ error: 'Owner only' }, { status: 401 });
    }

    // Get user's organization
    const orgUser = await prisma.organizationUser.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    if (!orgUser) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const orgId = orgUser.organizationId;
  
    // Reference data from user's screenshots
    const referenceData = [
      // 2024 (partial - Aug through Dec)
      { year: 2024, month: 8, amount: 25252.50 },
      { year: 2024, month: 9, amount: 28661.50 },
      { year: 2024, month: 10, amount: 39856.50 },
      { year: 2024, month: 11, amount: 28783.00 },
      { year: 2024, month: 12, amount: 28322.75 },
      // 2025 (full year)
      { year: 2025, month: 1, amount: 35816.25 },
      { year: 2025, month: 2, amount: 38437.00 },
      { year: 2025, month: 3, amount: 39284.75 },
      { year: 2025, month: 4, amount: 41959.25 },
      { year: 2025, month: 5, amount: 40380.41 },
      { year: 2025, month: 6, amount: 38180.25 },
      { year: 2025, month: 7, amount: 36210.75 },
      { year: 2025, month: 8, amount: 36591.75 },
      { year: 2025, month: 9, amount: 29402.50 },
      { year: 2025, month: 10, amount: 33859.57 },
      { year: 2025, month: 11, amount: 28907.36 },
      { year: 2025, month: 12, amount: 22153.50 },
    ];
    
    const results = [];
    
    for (const ref of referenceData) {
      const result = await prisma.referenceMonth.upsert({
        where: {
          organizationId_year_month: {
            organizationId: orgId,
            year: ref.year,
            month: ref.month,
          },
        },
        update: {
          referenceNetSalesExTax: ref.amount,
        },
        create: {
          organizationId: orgId,
          year: ref.year,
          month: ref.month,
          referenceNetSalesExTax: ref.amount,
        },
      });
      results.push({ year: ref.year, month: ref.month, amount: ref.amount });
    }
  
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${results.length} reference months`,
      data: results,
    });
  } catch (error) {
    console.error('Update reference error:', error);
    return NextResponse.json({ 
      error: 'Failed to update',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
