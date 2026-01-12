import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrgId, assertNotShowcase } from '@/lib/org';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showcase = searchParams.get('showcase') === 'true';
  const isNewUser = searchParams.get('newUser') === 'true';
  
  // New user simulation - return empty array
  if (isNewUser) {
    return NextResponse.json([]);
  }
  
  const orgId = showcase ? 'showcase-template' : await getCurrentOrgId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshots = await prisma.cashSnapshot.findMany({
    where: { organizationId: orgId },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(snapshots);
}

export async function POST(request: NextRequest) {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  assertNotShowcase(orgId); // Prevent writes to showcase-template

  const body = await request.json();
  const { amount, date } = body;

  if (typeof amount !== 'number' || !date) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  // Check if snapshot already exists for this date - update it instead
  const existing = await prisma.cashSnapshot.findFirst({
    where: { organizationId: orgId, date },
  });

  let snapshot;
  if (existing) {
    snapshot = await prisma.cashSnapshot.update({
      where: { id: existing.id },
      data: { amount },
    });
  } else {
    snapshot = await prisma.cashSnapshot.create({
      data: {
        organizationId: orgId,
        amount,
        date,
      },
    });
  }

  // Also update the Settings single snapshot for dashboard liquidity dial
  await prisma.settings.update({
    where: { organizationId: orgId },
    data: {
      cashSnapshotAmount: amount,
      cashSnapshotAsOf: date,
    },
  });

  return NextResponse.json(snapshot);
}

export async function DELETE(request: NextRequest) {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Verify ownership
  const snapshot = await prisma.cashSnapshot.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!snapshot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.cashSnapshot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
