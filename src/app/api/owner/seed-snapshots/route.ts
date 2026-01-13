import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const OWNER_USER_ID = process.env.OWNER_USER_ID;

// One-time seed: Add historical cash snapshots for baseline velocity calculation
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

    // Historical snapshots to seed
    const snapshots = [
      { date: '2026-01-01', amount: 3600 },   // Start of year
      { date: '2026-01-12', amount: 11500 },  // Yesterday (after income)
      { date: '2026-01-13', amount: 3971 },   // Today (current)
    ];

    const results = [];
    for (const snap of snapshots) {
      const created = await prisma.cashSnapshot.create({
        data: {
          organizationId: orgId,
          amount: snap.amount,
          date: snap.date,
        },
      });
      results.push(created);
    }

    // Update settings to latest snapshot
    await prisma.settings.update({
      where: { organizationId: orgId },
      data: {
        cashSnapshotAmount: 3971,
        cashSnapshotAsOf: '2026-01-13',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Seeded 3 historical snapshots',
      snapshots: results,
    });
  } catch (error) {
    console.error('Seed snapshots error:', error);
    return NextResponse.json({ 
      error: 'Failed to seed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
